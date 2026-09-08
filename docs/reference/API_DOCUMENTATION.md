# API Endpoints - FinanzApp

Rutas Nitro (H3) basadas en archivos bajo `server/api/**`. No existe middleware
global de autenticación: cada handler llama a `getUserFromSession(event)` o
`requireUser(event)` (desde `server/utils/auth.ts`) y responde `401` si no hay
sesión válida. Todas las consultas/mutaciones a Prisma están filtradas por
`userId` del usuario autenticado.

Los schemas de validación (Zod) viven todos en `server/utils/validation.ts`.
Los endpoints `PUT` usan variantes `*UpdateSchema` que son `.partial()` sobre
el schema de creación (todos los campos opcionales), salvo excepciones que se
indican explícitamente.

## 📋 Resumen de Endpoints Implementados

### 🔐 Autenticación (`/api/auth`)

| Método | Endpoint             | Descripción                            |
| ------ | -------------------- | -------------------------------------- |
| POST   | `/api/auth/register` | Registrar nuevo usuario                |
| POST   | `/api/auth/login`    | Iniciar sesión                         |
| POST   | `/api/auth/logout`   | Cerrar sesión (elimina cookie `token`) |
| GET    | `/api/auth/me`       | Obtener usuario autenticado actual     |

**Body para POST `/api/auth/register`** (`RegisterSchema`):

```json
{
  "name": "Bryan Yépez",
  "email": "bryan@example.com",
  "password": "Contrasena123"
}
```

- `name`: 2–100 caracteres.
- `email`: formato válido, máx. 255 caracteres.
- `password`: 8–128 caracteres, debe incluir al menos una mayúscula y un número.
- Limitado por IP a **5 intentos / 15 minutos** (`checkRateLimit` con clave `register:<ip>`); responde `429` si se excede.
- Responde `409` si ya existe una cuenta con ese correo.
- No inicia sesión automáticamente: solo crea el usuario (`{ message: 'Usuario creado' }`).

**Body para POST `/api/auth/login`** (`LoginSchema`):

```json
{
  "email": "bryan@example.com",
  "password": "Contrasena123"
}
```

- Limitado por IP a **10 intentos / 15 minutos** (clave `login:<ip>`); el contador se limpia (`clearRateLimit`) tras un login exitoso.
- Credenciales inválidas responden siempre el mismo mensaje genérico (`401 Credenciales incorrectas`) para no revelar si el email existe.
- Respuesta (200): `{ message, user: { id, name, email, role } }`. **El JWT ya no se devuelve en el body** — solo se setea como cookie httpOnly (ver sección Autenticación más abajo).

**GET `/api/auth/me`**: si no hay sesión válida responde `401` (antes devolvía `null`). Respuesta (200): `{ id, name, email, role }` — objeto explícitamente re-armado, nunca el registro crudo de Prisma (no expone `password`).

**POST `/api/auth/logout`**: no requiere body; borra la cookie `token` y responde `{ message: 'Sesión cerrada exitosamente' }`.

---

### 🏷️ Categorías (`/api/categories`)

| Método | Endpoint              | Descripción                   |
| ------ | --------------------- | ----------------------------- |
| GET    | `/api/categories`     | Listar categorías del usuario |
| POST   | `/api/categories`     | Crear nueva categoría         |
| PUT    | `/api/categories/:id` | Actualizar categoría          |
| DELETE | `/api/categories/:id` | Eliminar categoría            |

**Body para POST** (`CategorySchema`):

```json
{
  "name": "Alimentación",
  "type": "expense",
  "icon": "🍔",
  "color": "#FF6B6B"
}
```

- `type`: `"income"` | `"expense"`.
- `icon`: opcional, máx. 100 caracteres.
- `color`: opcional, hex válido (`#RRGGBB`); string vacío se normaliza a `undefined`.

**Body para PUT** (`CategoryUpdateSchema` = `CategorySchema.partial()`): mismos campos, todos opcionales; solo se actualiza lo enviado. Responde `404 Categoría no encontrada` si el `id` no existe o no pertenece al usuario.

**DELETE**: responde `404 Categoría no encontrada` si no pertenece al usuario. No hay verificación de dependencias en el handler — la restricción real vive en la base de datos: `Income.categoryId` y `Expense.categoryId` usan `onDelete: Restrict`, por lo que Prisma lanzará un error si la categoría tiene ingresos/gastos asociados.

---

### 💰 Ingresos (`/api/incomes`)

| Método | Endpoint                          | Descripción                                               |
| ------ | --------------------------------- | --------------------------------------------------------- |
| GET    | `/api/incomes`                    | Listar ingresos (con filtros de fecha)                    |
| POST   | `/api/incomes`                    | Crear nuevo ingreso                                       |
| PUT    | `/api/incomes/:id`                | Actualizar ingreso                                        |
| DELETE | `/api/incomes/:id`                | Eliminar ingreso                                          |
| POST   | `/api/incomes/generate-recurring` | Generar instancias de ingresos recurrentes del mes actual |

**Query params para GET:**

- `from`: fecha inicial (ISO string), filtra `date >= from`.
- `to`: fecha final (ISO string), filtra `date <= to`.
- Incluye la `category` relacionada; ordenado por `date desc`.

**Body para POST** (`IncomeSchema`):

```json
{
  "amount": 5000,
  "description": "Salario mensual",
  "date": "2025-12-10T00:00:00.000Z",
  "isRecurring": true,
  "frequency": "monthly",
  "categoryId": 1,
  "notes": "Pago quincenal"
}
```

- `amount`: número positivo, máx. 999,999,999.
- `date`: opcional (ISO datetime con offset); si se omite se usa la fecha actual.
- `frequency`: `"monthly" | "biweekly" | "weekly" | "annual"` (opcional/nullable).
- `categoryId`: entero positivo requerido — **debe pertenecer al usuario autenticado**, si no existe o es de otro usuario responde `404 Categoría no encontrada`.

**Body para PUT** (`IncomeUpdateSchema` = `IncomeSchema.partial()`): todos los campos opcionales. Si se envía `categoryId`, se revalida su pertenencia al usuario (`404` si no corresponde). Responde `404 Ingreso no encontrado` si el `id` no pertenece al usuario.

**POST `/api/incomes/generate-recurring`**: no recibe body. Recorre todos los `Income` con `isRecurring: true` del usuario y, según `frequency`, crea una nueva instancia (`isRecurring: false`) para el mes actual si aún no existe una similar (mismo monto/descripción/categoría dentro del mes) y si ya corresponde generarla según el día del mes (`monthly`) o el calendario quincenal (`biweekly`; días 15 y último día del mes). Frecuencias distintas a esas dos usan la fecha actual directamente. Responde `{ message, generated: [...], skipped: [...] }` con el detalle de qué se generó y qué se omitió (y por qué).

---

### 💸 Gastos (`/api/expenses`)

| Método | Endpoint            | Descripción                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/expenses`     | Listar gastos (con filtros de fecha) |
| POST   | `/api/expenses`     | Crear nuevo gasto                    |
| PUT    | `/api/expenses/:id` | Actualizar gasto                     |
| DELETE | `/api/expenses/:id` | Eliminar gasto                       |

**Query params para GET:** `from`/`to` (igual que ingresos). Incluye `category` y `creditCard`; ordenado por `date desc`.

**Body para POST** (`ExpenseSchema`):

```json
{
  "amount": 150.5,
  "description": "Compras del supermercado",
  "date": "2025-12-10T00:00:00.000Z",
  "isRecurring": false,
  "frequency": null,
  "categoryId": 2,
  "paymentMethod": "credit",
  "creditCardId": 1,
  "notes": "Compras semanales"
}
```

- `paymentMethod`: `"cash" | "debit" | "credit"`, default `"cash"`.
- `creditCardId`: opcional/nullable; **solo permitido si `paymentMethod === 'credit'`** — si se envía junto con otro método de pago, responde `400`.
- `categoryId` debe pertenecer al usuario (`404 Categoría no encontrada` si no).
- Si `paymentMethod === 'credit'` y se envía `creditCardId`, la tarjeta también debe pertenecer al usuario (`404 Tarjeta no encontrada` si no); si no se cumple la condición, `creditCardId` se guarda como `undefined`.

**Body para PUT** (`ExpenseUpdateSchema` = `ExpenseSchema.partial()`): todos los campos opcionales.

- Si se envía `categoryId`, se revalida pertenencia al usuario.
- Si se envía `creditCardId` (truthy), se revalida pertenencia al usuario (`404 Tarjeta no encontrada`).
- Si `paymentMethod` pasa a ser distinto de `"credit"`, `creditCardId` se limpia a `null` automáticamente; si es `"credit"` y se envía `creditCardId`, se actualiza.
- Si `isRecurring` se envía como `false` sin `frequency`, `frequency` se limpia a `null`.

---

### 💳 Tarjetas de Crédito (`/api/credit-cards`)

| Método | Endpoint                                | Descripción                                          |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/credit-cards`                     | Listar tarjetas del usuario                          |
| POST   | `/api/credit-cards`                     | Crear nueva tarjeta                                  |
| PUT    | `/api/credit-cards/:id`                 | Actualizar tarjeta                                   |
| DELETE | `/api/credit-cards/:id`                 | Eliminar tarjeta                                     |
| POST   | `/api/credit-cards/:id/pay`             | Registrar el pago del período de facturación cerrado |
| GET    | `/api/credit-cards/:id/payment-history` | Historial de pagos registrados de la tarjeta         |
| GET    | `/api/credit-cards/:id/statement`       | Estado de cuenta / período de facturación actual     |

**Body para POST/PUT** (`CreditCardSchema` / `CreditCardUpdateSchema` = `.partial()`):

```json
{
  "name": "Visa Gold",
  "bank": "Banco Nacional",
  "lastDigits": "4532",
  "creditLimit": 10000,
  "billingDay": 15,
  "paymentDay": 5,
  "interestRate": 24.5,
  "isActive": true
}
```

- `lastDigits`: exactamente 4 dígitos.
- `billingDay`/`paymentDay`: enteros entre 1 y 31.
- `interestRate`: opcional en el modelo (nullable en BD) pero requerido en el schema (0–100); en PUT es opcional al ser `.partial()`.

**POST `/api/credit-cards/:id/pay`** (`CreditCardPaymentSchema`):

```json
{
  "amount": 850.0,
  "date": "2025-12-05T00:00:00.000Z",
  "categoryId": 3
}
```

- `categoryId` debe pertenecer al usuario (`404 Categoría no encontrada` si no).
- Calcula el **último período de facturación cerrado** de la tarjeta según `billingDay`:
  - Si hoy es antes o igual al día de corte del mes actual, el período cerrado corresponde al mes anterior completo (del día siguiente al corte de hace 2 meses hasta el corte del mes pasado).
  - Si ya pasó el corte de este mes, el período cerrado es el que acaba de cerrar (del día siguiente al corte del mes pasado hasta el corte de este mes).
  - _(Este cálculo fue corregido: antes tenía un off-by-one en la rama "antes del corte" que hacía que se contara el mismo período dos veces; ahora resuelve correctamente al período cerrado del mes anterior.)_
- Marca (`updateMany`) todos los `Expense` de esa tarjeta dentro del período calculado y con `isPaidOff: false` como `isPaidOff: true`.
- Crea un `Expense` nuevo que representa la salida de dinero del pago, con `paymentMethod: 'debit'`, `creditCardId` **no** asociado (el gasto del pago en sí no lleva tarjeta), y **`description` con el formato exacto `Pago Tarjeta {card.name} - {card.bank}`** (nota: antes decía `Pago de Tarjeta`; el prefijo actual es `Pago Tarjeta`, sin "de"). `payment-history.get.ts` depende de este prefijo exacto (`startsWith: 'Pago Tarjeta'`) para listar los pagos — si cambia este formato hay que actualizar ambos archivos a la vez.
- Responde `{ success: true, message: 'Pago registrado exitosamente' }`.

**GET `/api/credit-cards/:id/payment-history`**: devuelve `{ card: { id, name, bank, lastDigits }, payments: [...] }`, donde `payments` son los `Expense` cuya `description` empieza con `'Pago Tarjeta'` para esa tarjeta, con su `category` embebida.

**GET `/api/credit-cards/:id/statement`** (archivo `statement.get.ts`): calcula el período de facturación relevante (el cerrado no pagado si existe, si no el período en curso), la fecha de vencimiento del pago (`paymentDay` respecto al fin del período), y devuelve `{ card, billingPeriod: { startDate, endDate, paymentDueDate }, statement: { totalAmount, transactionCount, creditUsagePercent, availableCredit, paymentDueDate }, expenses }` — solo cuenta gastos con `isPaidOff: false` de ese período.

---

### 🎯 Ahorros (`/api/savings`)

| Método | Endpoint                      | Descripción            |
| ------ | ----------------------------- | ---------------------- |
| GET    | `/api/savings`                | Listar metas de ahorro |
| POST   | `/api/savings`                | Crear nueva meta       |
| PUT    | `/api/savings/:id`            | Actualizar meta        |
| DELETE | `/api/savings/:id`            | Eliminar meta          |
| POST   | `/api/savings/:id/contribute` | Agregar contribución   |

**GET**: incluye las últimas 5 `contributions` (`orderBy date desc`) de cada meta; ordenado por `isCompleted asc, priority asc`.

**Body para POST (crear meta)** (`SavingsGoalSchema`):

```json
{
  "name": "Viaje a Europa",
  "targetAmount": 50000,
  "currentAmount": 5000,
  "deadline": "2026-06-30T00:00:00.000Z",
  "priority": 1,
  "description": "Vacaciones de verano"
}
```

- `priority`: entero 1–3 (1=alta, 2=media, 3=baja), default 1.
- `currentAmount`: opcional, default 0.
- `deadline`: opcional/nullable.

**Body para PUT** (`SavingsGoalUpdateSchema` = `SavingsGoalSchema.partial()` **más** `isCompleted: z.boolean().optional()` explícito): permite marcar/desmarcar una meta como completada manualmente además de actualizar cualquier otro campo parcialmente. Responde `404 Meta de ahorro no encontrada` si no pertenece al usuario.

**Body para POST (contribuir)** (`SavingsContributionSchema`):

```json
{
  "amount": 1000,
  "notes": "Ahorro del mes de diciembre"
}
```

- Responde `400` si la meta ya está `isCompleted`.
- Ejecuta dentro de una transacción Prisma (`$transaction`):
  1. Crea el `SavingsContribution`.
  2. Incrementa `currentAmount` de forma **atómica** (`{ increment: amount }`) — evita condición de carrera si llegan dos contribuciones casi simultáneas (ya no se lee-modifica-escribe el valor).
  3. Relee la meta y marca `isCompleted = currentAmount >= targetAmount`.
- Devuelve la meta actualizada.

---

### 📋 Deudas (`/api/debts`)

| Método | Endpoint                      | Descripción                                      |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/api/debts`                  | Listar deudas                                    |
| POST   | `/api/debts`                  | Crear nueva deuda (genera cronograma de cuotas)  |
| PUT    | `/api/debts/:id`              | Actualizar deuda (puede regenerar el cronograma) |
| DELETE | `/api/debts/:id`              | Eliminar deuda                                   |
| POST   | `/api/debts/:id/pay`          | Registrar pago de una o más cuotas               |
| GET    | `/api/debts/:id/installments` | Listar cuotas programadas de la deuda            |
| GET    | `/api/debts/:id/payments`     | Listar historial de pagos de la deuda            |

**GET `/api/debts`**: incluye `_count.payments`, `_count.installments`, y la **próxima cuota pendiente/vencida** (`installments` filtrado a `status in [pending, overdue]`, `take: 1`, `orderBy dueDate asc`). Ordenado por `isPaid asc, startDate desc`.

**Body para POST (crear deuda)** (`DebtSchema`):

```json
{
  "name": "Préstamo Personal",
  "creditor": "Banco XYZ",
  "totalAmount": 100000,
  "remainingAmount": 80000,
  "interestRate": 15.5,
  "monthlyPayment": 5000,
  "totalInstallments": 24,
  "paymentDayOfMonth": 15,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2027-01-01T00:00:00.000Z"
}
```

- `remainingAmount`: opcional; si se omite se usa `totalAmount`.
- `totalInstallments`: entero 1–600, default 12.
- `paymentDayOfMonth`: entero **1–28** (no 1–31, para evitar problemas en meses cortos), default 15.
- Al crear la deuda se genera automáticamente el cronograma completo de `DebtInstallment` (amortización francesa / cuota fija: `monthlyPayment` constante, interés mensual = `remainingPrincipal * (interestRate/100/12)`, principal = `monthlyPayment - interés`; la última cuota ajusta para saldar exactamente el capital restante). Deuda + cuotas se crean dentro de una única `$transaction`.

**Body para PUT** (`DebtUpdateSchema` = `DebtSchema.partial()`): todos los campos opcionales.

- Si el body **no** toca ningún campo que afecte la amortización (`totalAmount`, `interestRate`, `monthlyPayment`, `totalInstallments`, `paymentDayOfMonth`, `startDate`), es una actualización simple de campos (nombre, acreedor, `endDate`, `remainingAmount`, etc.) sin tocar las cuotas.
- Si **sí** toca alguno de esos campos, dentro de una `$transaction`:
  1. Se leen las cuotas ya `paid`/`advanced` (se preservan intactas).
  2. Se valida que `totalInstallments` (nuevo o existente) no sea menor que la cantidad de cuotas ya pagadas/adelantadas — si lo es, responde `400 El número de cuotas no puede ser menor a las cuotas ya pagadas`.
  3. Se eliminan todas las cuotas `pending`/`overdue`.
  4. Se recalcula el resto del cronograma desde la cuota siguiente a la última pagada, con la misma fórmula de amortización francesa que en la creación, usando `remainingAmount` (nuevo o existente) como capital de partida.
  5. Se actualiza la deuda con los nuevos valores y las nuevas cuotas.

**Body para POST (pagar cuota)** (`DebtPaymentSchema`):

```json
{
  "amount": 5000,
  "principal": 4200,
  "interest": 750,
  "insurance": 50,
  "paymentNumber": 12,
  "notes": "Cuota de diciembre",
  "installmentIds": [45]
}
```

- **Invariante validado por el schema (`.refine`)**: `amount` debe ser igual a `principal + interest + insurance` (tolerancia ±0.01), si no responde `400` con el error en el campo `amount`. El schema no valida que `interest`/`principal` coincidan con lo programado en la cuota específica — esa regla de negocio queda fuera del alcance de una validación síncrona de Zod.
- `insurance`: opcional, default 0.
- `installmentIds`: opcional; si no se envía, se paga automáticamente la próxima cuota pendiente/vencida (la primera en orden de `installmentNumber`). Si se envían varios IDs, permite pagar/adelantar múltiples cuotas con un solo registro de pago.
- Responde `400 Esta deuda ya está pagada` si `debt.isPaid`.
- Dentro de una `$transaction`:
  1. Crea el `DebtPayment`.
  2. Para cada cuota en `installmentIds` (o la próxima pendiente por defecto), la marca como `advanced` (si `now < dueDate`, es decir se paga antes de su vencimiento) o `paid` (si no), y la vincula al pago (`debtPaymentId`).
  3. Marca como `overdue` cualquier cuota `pending` cuya `dueDate` ya pasó.
  4. Decrementa `remainingAmount` de la deuda de forma **atómica** (`{ decrement: principal }`) — evita condición de carrera con pagos casi simultáneos.
  5. Relee la deuda, calcula `isPaid = remainingAmount <= 0` y clampa `remainingAmount` a mínimo 0.
- Devuelve la deuda actualizada con sus `installments`.

**GET `/api/debts/:id/installments`**: devuelve todas las `DebtInstallment` de la deuda (con su `debtPayment` embebido si existe), ordenadas por `installmentNumber asc`. Antes de devolver, actualiza a `overdue` cualquier cuota `pending` cuya `dueDate` ya pasó (side effect en un GET, documentado aquí porque es intencional).

**GET `/api/debts/:id/payments`**: devuelve todos los `DebtPayment` de la deuda, ordenados por `paymentNumber asc, date asc`.

---

### 📊 Proyecciones (`/api/budgets`)

| Método | Endpoint                 | Descripción                                              |
| ------ | ------------------------ | -------------------------------------------------------- |
| GET    | `/api/budgets`           | Listar proyecciones                                      |
| POST   | `/api/budgets`           | Crear nueva proyección                                   |
| POST   | `/api/budgets/calculate` | Previsualizar el cálculo de una proyección (no persiste) |
| PUT    | `/api/budgets/:id`       | Marcar una proyección como completada                    |
| DELETE | `/api/budgets/:id`       | Eliminar proyección                                      |

**Query params para GET:**

- `startDate`: filtra `startDate >= startDate`.
- `endDate`: filtra `endDate <= endDate`.

**Body para POST `/api/budgets`** (`BudgetSchema`):

```json
{
  "name": "Viaje a Cancún",
  "totalBudget": 30000,
  "startDate": "2026-03-01T00:00:00.000Z",
  "endDate": "2026-03-15T00:00:00.000Z",
  "description": "Vacaciones de primavera",
  "expectedIncome": 10000,
  "fixedExpenses": 8000,
  "debtPayments": 5000,
  "availableAmount": 17000,
  "debitUsage": 15000,
  "creditUsage": 15000,
  "savingsImpact": -2000
}
```

- Todos los campos numéricos de proyección (`expectedIncome`, `fixedExpenses`, `debtPayments`, `availableAmount`, `debitUsage`, `creditUsage`, `savingsImpact`) son opcionales con default `0` — el cálculo real de estos valores normalmente proviene de la respuesta de `POST /api/budgets/calculate`; el endpoint solo persiste lo recibido.
- Responde `400` si `endDate <= startDate`.

**Body para POST `/api/budgets/calculate`** (`BudgetCalculateSchema`) — solo los campos que el usuario ingresa a mano:

```json
{
  "name": "Viaje a Lima",
  "totalBudget": 500,
  "startDate": "2026-09-18T00:00:00-05:00",
  "endDate": "2026-09-20T23:59:59-05:00",
  "description": "Viaje familiar"
}
```

No persiste nada (`prisma.budgetProjection.create` no se llama); es puramente una previsualización para que el cliente muestre el desglose antes de confirmar con `POST /api/budgets`. Responde `400` si `endDate <= startDate` (mismo mensaje que `POST /api/budgets`). Calcula, a partir de datos reales del usuario:

- `currentBalance`: saldo actual real de HOY (vía `getCurrentBalance` en `server/utils/cash-flow.ts`, la misma lógica que usa `payment-plan/suggestions.get.ts`) — **no** está acotado al rango `startDate`/`endDate`, es la liquidez disponible en este momento.
- `expectedIncome`: ingresos recurrentes (`Income.isRecurring: true`) proyectados dentro de `[startDate, endDate]` vía `countOccurrencesInRange` (`server/utils/frequency.ts`), más ingresos no recurrentes ya registrados con `date` dentro del rango.
- `fixedExpenses`: mismo cálculo que `expectedIncome` pero sobre `Expense`.
- `debtPayments`: suma de `DebtInstallment.amount` con `dueDate` dentro del rango y `status` en `pending`/`overdue`, de deudas no pagadas (`debt.isPaid: false`) del usuario.
- `cards`: por cada `CreditCard` activa del usuario, `{ id, name, bank, available, nearLimit }`, donde `available = creditLimit - used` y `used = carriedBalance + suma de Expense.amount con esa tarjeta e isPaidOff: false` (todos los no pagados, no solo el período de facturación actual — a diferencia de `credit-cards/:id/statement.get.ts`, que sí acota al período vigente). `nearLimit = used / creditLimit > 0.8`.
- `availableAmount = currentBalance + expectedIncome - fixedExpenses - debtPayments`.
- `safetyBuffer = expectedIncome * 0.1` (mismo criterio de colchón que `payment-plan/suggestions.get.ts`); `safeToSpend = max(availableAmount - safetyBuffer, 0)`.
- `debitUsage = min(totalBudget, safeToSpend)`; `creditUsage = max(totalBudget - debitUsage, 0)`; `savingsImpact = max(totalBudget - debitUsage - creditUsage, 0)` (déficit real: ni débito ni crédito alcanzan).
- `status`: `"sin_deuda"` si `creditUsage === 0`; `"ajustado"` si `creditUsage > 0` y alguna tarjeta con espacio (`available > 0`) cubre `creditUsage` y ninguna de las tarjetas con espacio está `nearLimit`; `"riesgo_deuda"` en cualquier otro caso (incluye `savingsImpact > 0`).
- `warnings`: array de strings en español con emoji (tarjetas cerca del límite, saldo por debajo del colchón, déficit real, cuotas de deuda dentro del rango), mismo estilo que `payment-plan/suggestions.get.ts`.

Respuesta:

```json
{
  "input": {
    "name": "...",
    "totalBudget": 500,
    "startDate": "...",
    "endDate": "...",
    "description": "..."
  },
  "currentBalance": 1200,
  "expectedIncome": 0,
  "fixedExpenses": 150,
  "debtPayments": 0,
  "availableAmount": 1050,
  "debitUsage": 500,
  "creditUsage": 0,
  "savingsImpact": 0,
  "status": "sin_deuda",
  "warnings": [],
  "cards": [{ "id": 1, "name": "Visa Gold", "bank": "BCP", "available": 800, "nearLimit": false }]
}
```

**PUT `/api/budgets/:id`**: único campo aceptado, `{ "isCompleted": true }` (`BudgetUpdateSchema`). Responde `404 Presupuesto no encontrado` si no existe o no pertenece al usuario (mismo mensaje que `DELETE`). Usa `getUserFromSession` + 401 manual, igual que `GET`/`DELETE` (no `requireUser`), para mantener consistencia con esos dos archivos hermanos.

---

### 📈 Dashboard (`/api/dashboard`)

| Método | Endpoint               | Descripción                                       |
| ------ | ---------------------- | ------------------------------------------------- |
| GET    | `/api/dashboard/stats` | Estadísticas resumidas del mes actual del usuario |

Sin query params. Calcula, para el mes calendario actual (`startOfMonth`–`endOfMonth`):

- `totalIncome`, `totalExpenses`, `incomeCount`, `expenseCount`.
- Gastos desglosados por método de pago: `cashExpenses`, `debitExpenses`, `creditExpenses`.
- `savingsGoals` (cantidad de metas activas, `isCompleted: false`) y `totalSavings` (suma de `currentAmount` de esas metas).

---

### 🧭 Plan de Pagos (`/api/payment-plan`)

| Método | Endpoint                        | Descripción                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/payment-plan/suggestions` | Sugerencias priorizadas de qué pagar primero y proyección de flujo de caja |

Sin query params. Combina en un solo análisis:

- **Saldo actual real**: ingresos recibidos este mes (hasta hoy) menos gastos en efectivo/débito (excluye gastos con `creditCardId` asociado, esos se pagan después vía tarjeta).
- **Ingresos recurrentes pendientes**: si aún no se recibió ningún ingreso recurrente este mes, se proyecta el total de ingresos recurrentes como pendiente.
- **Deudas activas**: usa la(s) próxima(s) cuota(s) `pending`/`overdue` de `DebtInstallment` (no un cálculo manual) para determinar monto y fecha de vencimiento por deuda.
- **Tarjetas de crédito activas**: recalcula, con la misma lógica que `statement.get.ts` (período cerrado no pagado si existe, si no el período en curso), el monto adeudado y la fecha de pago límite de cada tarjeta.
- **Gastos fijos recurrentes** (`isRecurring: true`): proyecta la próxima fecha de pago según el día del mes del gasto original.
- Cada ítem recibe una `priority` (`urgent | high | medium | low`) según días restantes hasta el vencimiento (o si ya está `overdue`) y, para deudas, también según tasa de interés (`> 15%` sube a `high`); se ordenan por prioridad y luego por fecha.
- Genera `warnings` (arreglo de strings) según el estado de flujo de caja (`healthy | tight | deficit`), ingresos pendientes, colchón de seguridad (10% de ingresos) y deudas con interés `> 20%`.
- Devuelve además una proyección de flujo de caja (`cashFlowProjection`) día a día para los próximos 30 días.
- Respuesta: `{ summary: { totalIncome, totalObligations, availableBalance, currentBalance, suggestedSafetyBuffer, cashFlowStatus, warnings, pendingIncome, projectedBalance }, suggestions: [...], cashFlowProjection: [...] }`.

---

## 🔒 Autenticación

JWT firmado con `JWT_SECRET`, almacenado en una **cookie `token`** (no `session`):
`httpOnly: true`, `sameSite: 'strict'`, `secure` en producción, `path: '/'`,
`maxAge: 7 días`. La cookie nunca es legible desde JS del cliente; el JWT no
se devuelve en el body de ninguna respuesta.

Todos los endpoints (excepto `/api/auth/register` y `/api/auth/login`)
requieren esta cookie. `getUserFromSession(event)` decodifica el JWT y carga
el `User` desde la base de datos, devolviendo `null` si no hay sesión válida;
`requireUser(event)` hace lo mismo pero lanza `401` automáticamente si no hay
sesión. La mayoría de las rutas usan `getUserFromSession` seguido de un
chequeo manual (`if (!user) throw createError({ statusCode: 401 })`), con el
mismo efecto; `savings/[id].put.ts` y `payment-plan/suggestions.get.ts` usan
`requireUser` directamente.

`login.post.ts` y `register.post.ts` aplican rate limiting en memoria por IP
(`server/utils/rate-limit.ts`, ventana fija) — al ejecutarse como funciones
serverless en Vercel, este contador **no se comparte entre invocaciones ni
sobrevive reinicios/cold starts**; es una mitigación best-effort, no una
garantía dura contra fuerza bruta.

El modelo `User` tiene un campo `role` (`"superadmin" | "admin" | "user"`,
default `"user"`) **pero ningún endpoint actual lee ni aplica `role` para
autorización** — toda la autorización existente se basa únicamente en
ownership (`userId`). Esto es un hueco conocido, no un control de acceso por
roles implementado.

## 📝 Respuestas de Error

```json
{
  "statusCode": 401,
  "message": "No autorizado"
}
```

```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado"
}
```

```json
{
  "statusCode": 400,
  "message": "Datos inválidos"
}
```

```json
{
  "statusCode": 429,
  "message": "Demasiados intentos. Espera N segundos e intenta de nuevo."
}
```

Los mensajes de error de validación (`400`) devuelven el primer mensaje de
error del schema Zod correspondiente (ver `validateBody` en
`server/utils/validation.ts`), no un mensaje genérico.

## ✅ Endpoints Funcionales

Todos los endpoints listados arriba están implementados y en uso desde el
frontend (`app/composables/useAuthFetch.ts` / `app/plugins/auth-handler.ts`).
