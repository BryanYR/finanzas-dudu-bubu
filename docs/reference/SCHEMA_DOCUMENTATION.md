# Schema de Base de Datos - FinanzApp

## 📊 Resumen

`prisma/schema.prisma` (PostgreSQL) define **11 modelos**. Casi todos cuelgan
de `User` con `onDelete: Cascade`; las dos excepciones documentadas son
`Expense.creditCardId` (`SetNull`) e `Income.categoryId` / `Expense.categoryId`
(`Restrict`, ver más abajo). Este documento describe el estado real del
schema — para el ciclo de vida de negocio (amortización, adelantos, etc.) ver
[INSTALLMENTS_GUIDE.md](../guides/INSTALLMENTS_GUIDE.md) y
[DEBT_MANAGEMENT_GUIDE.md](../guides/DEBT_MANAGEMENT_GUIDE.md).

## 🗂️ Modelos

### 1. `User`

Usuario dueño de todos los datos.

- `email` único.
- `password`: hash bcrypt.
- `role: String @default("user")` — valores esperados `"superadmin" | "admin" | "user"`. **Existe en el schema pero ningún endpoint de `server/api/**` lo lee ni lo usa para autorización todavía**; toda la autorización actual es por ownership (`userId`). Es un campo preparado para un futuro RBAC, no una funcionalidad implementada — no asumir que hay rutas admin-only en producción.
- Relaciones inversas: `categories`, `incomes`, `expenses`, `creditCards`, `savingsGoals`, `debts`, `budgetProjections` (todas con cascade delete desde `User`).
- Índice: `@@index([role])`.

### 2. `Category`

Categorización de ingresos y gastos, con icono/color para la UI.

- `type: String` — `"income" | "expense"`.
- `icon`, `color`: opcionales (string libre / hex).
- `user` → `onDelete: Cascade`.
- Relaciones inversas: `incomes`, `expenses` — ambas apuntan a `Category` con `onDelete: Restrict` (ver `Income`/`Expense` abajo), por lo que **no se puede borrar una categoría que tenga ingresos o gastos asociados** (Prisma lanza un error de FK constraint; el endpoint `DELETE /api/categories/:id` no valida esto explícitamente antes de intentar el borrado).
- Índice: `@@index([userId, type])`.

### 3. `Income`

- `amount: Float`, `description: String`, `date: DateTime` (default `now()`).
- `isRecurring: Boolean` (default `false`) + `frequency: String?` (`"monthly" | "biweekly" | "weekly" | "annual"`, `null` si no es recurrente) — mismo patrón que `Expense`.
- `categoryId` → `Category`, `onDelete: Restrict`.
- `userId` → `User`, `onDelete: Cascade`.
- `notes`: opcional.
- Índices: `@@index([userId, date])`, `@@index([userId, isRecurring])`.

### 4. `Expense`

- Mismos campos base que `Income` (`amount`, `description`, `date`, `isRecurring`, `frequency`, `categoryId`, `notes`).
- `paymentMethod: String @default("cash")` — `"cash" | "debit" | "credit"`.
- `creditCardId: Int?` — opcional; **`onDelete: SetNull`** (excepción deliberada al patrón cascade: si se borra la tarjeta, el gasto conserva su historial pero pierde la referencia a la tarjeta).
- `isPaidOff: Boolean @default(false)` — para gastos con tarjeta: indica si el estado de cuenta que lo contiene ya fue pagado (lo marca `credit-cards/[id]/pay.post.ts` al registrar un pago de período).
- Índices: `@@index([userId, date])`, `@@index([userId, isRecurring])`, `@@index([creditCardId])`, `@@index([userId, paymentMethod])`.

### 5. `CreditCard`

- `name`, `bank`, `lastDigits` (4 dígitos), `creditLimit`.
- `billingDay` / `paymentDay`: día del mes (1–31) de corte y de pago respectivamente. Toda la lógica de período de facturación (`statement.get.ts`, `pay.post.ts`, `dashboard`/`payment-plan`) deriva del `billingDay` comparado con el día actual.
- `interestRate: Float?` — opcional en el modelo (a diferencia del schema Zod `CreditCardSchema`, que lo exige al crear).
- `isActive: Boolean @default(true)`.
- `expenses: Expense[]` — relación inversa; el borrado de la tarjeta no borra los gastos (ver `Expense.creditCardId` arriba).
- Índice: `@@index([userId, isActive])`.

### 6. `SavingsGoal`

- `targetAmount`, `currentAmount` (default 0).
- `deadline: DateTime?` opcional.
- `priority: Int @default(1)` — convención `1=alta, 2=media, 3=baja` (no enforced por el schema, solo por convención de la app/UI).
- `isCompleted: Boolean @default(false)` — se recalcula automáticamente en `savings/[id]/contribute.post.ts` (`currentAmount >= targetAmount`), pero también puede setearse manualmente vía `PUT /api/savings/:id`.
- `contributions: SavingsContribution[]`.
- Índice: `@@index([userId, isCompleted])`.

### 7. `SavingsContribution`

- Historial **append-only** de aportes: `amount`, `date` (default `now()`), `notes`.
- `savingsGoalId` → `SavingsGoal`, `onDelete: Cascade`.
- No tiene `userId` propio — la pertenencia al usuario se resuelve siempre vía `savingsGoal.userId`.
- Índice: `@@index([savingsGoalId, date])`.

### 8. `Debt`

- `totalAmount` (monto original), `remainingAmount` (saldo pendiente, se decrementa con cada pago).
- `interestRate: Float` — tasa **anual**; se divide entre 12 y 100 en el código de amortización para obtener la tasa mensual.
- `monthlyPayment: Float` — cuota fija (amortización francesa).
- `totalInstallments: Int? @default(12)` — número total de cuotas planificadas.
- `paymentDayOfMonth: Int @default(15)` — día del mes de vencimiento de cada cuota (el schema Zod restringe la entrada a 1–28 para evitar problemas en meses cortos, aunque el modelo en sí no impone ese límite superior).
- `startDate`, `endDate?`.
- `isPaid: Boolean @default(false)` — se marca automáticamente cuando `remainingAmount <= 0` tras un pago.
- `installments: DebtInstallment[]`, `payments: DebtPayment[]`.
- Índice: `@@index([userId, isPaid])`.

### 9. `DebtInstallment` — cuotas programadas (antes ausente de este documento)

Representa **una fila por cuota programada** del cronograma de amortización de una deuda; se genera en bloque al crear la deuda (`debts/index.post.ts`) y se regenera parcialmente cuando un `PUT /api/debts/:id` toca parámetros de amortización (ver `debts/[id].put.ts` y [INSTALLMENTS_GUIDE.md](../guides/INSTALLMENTS_GUIDE.md)).

- `installmentNumber: Int` — posición de la cuota (1, 2, 3…), única por deuda (`@@unique([debtId, installmentNumber])`).
- `dueDate: DateTime` — fecha de vencimiento de esa cuota específica.
- `amount`, `principal`, `interest`: montos programados (no necesariamente iguales a lo efectivamente pagado, que se registra en `DebtPayment`).
- `insurance: Float @default(0)` — seguro de desgravamen programado para esa cuota.
- `status: String @default("pending")` — máquina de estados de 4 valores:
  - `"pending"`: aún no vence y no se ha pagado.
  - `"overdue"`: la `dueDate` ya pasó y sigue sin pagarse (se recalcula al vuelo en `GET /api/debts/:id/installments` y al registrar un pago nuevo en `pay.post.ts`, ambos marcan como `overdue` cualquier `pending` vencida).
  - `"paid"`: se pagó en o después de su `dueDate`.
  - `"advanced"`: se pagó **antes** de su `dueDate` (pago anticipado) — distinción usada por `payment-plan/suggestions.get.ts` y por los reportes de cronograma.
- `debtPaymentId: Int?` — se setea cuando la cuota pasa a `paid`/`advanced`, vinculándola al `DebtPayment` que la cubrió; `onDelete: SetNull` en la relación con `DebtPayment` (si se borra el pago, la cuota no se borra, solo pierde el vínculo).
- Índices: `@@index([debtId, status])` (consultas típicas: "próxima cuota pendiente de esta deuda"), `@@index([dueDate, status])` (consultas globales tipo "qué está por vencer").

### 10. `DebtPayment`

- Registro de **cada pago realizado**, no de cada cuota — un solo pago puede cubrir varias cuotas (`installmentIds` en el body de `POST /api/debts/:id/pay`).
- `amount`, `principal`, `interest`, `insurance` (default 0) — la validación Zod (`DebtPaymentSchema`) exige `amount === principal + interest + insurance` (±0.01 de tolerancia); ver [DEBT_MANAGEMENT_GUIDE.md](../guides/DEBT_MANAGEMENT_GUIDE.md) para la fórmula de split.
- `paymentNumber: Int` — número de cuota asociado (informativo; no hay FK directa a `DebtInstallment.installmentNumber`, el vínculo real es a través de `DebtInstallment.debtPaymentId`).
- `installments: DebtInstallment[]` — relación inversa (una o más cuotas cubiertas por este pago).
- Índice: `@@index([debtId, date])`.

### 11. `BudgetProjection`

Planificador "qué pasaría si" independiente (viajes, compras grandes) — **no tiene relaciones de FK hacia ningún otro modelo de dominio** (ni `Debt`, ni `SavingsGoal`, ni `Expense`); todos los campos de proyección (`expectedIncome`, `fixedExpenses`, `debtPayments`, `availableAmount`, `debitUsage`, `creditUsage`, `savingsImpact`) son valores calculados por el cliente/composable y simplemente persistidos aquí.

- `totalBudget`, `startDate`, `endDate`, `description?`.
- `isCompleted: Boolean @default(false)` — no hay endpoint que lo actualice actualmente (no existe `PUT /api/budgets/:id`); queda como campo de estado manual/futuro.
- Índice: `@@index([userId, startDate])`.

## 🔗 Relaciones y reglas de borrado

| Relación                              | onDelete     | Efecto                                                                  |
| ------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `Category` → `User`                   | Cascade      | Borrar usuario borra sus categorías                                     |
| `Income` → `User`                     | Cascade      | —                                                                       |
| `Income` → `Category`                 | **Restrict** | No se puede borrar una categoría con ingresos asociados                 |
| `Expense` → `User`                    | Cascade      | —                                                                       |
| `Expense` → `Category`                | **Restrict** | No se puede borrar una categoría con gastos asociados                   |
| `Expense` → `CreditCard`              | **SetNull**  | Borrar la tarjeta conserva el historial de gastos, pierde la referencia |
| `CreditCard` → `User`                 | Cascade      | —                                                                       |
| `SavingsGoal` → `User`                | Cascade      | —                                                                       |
| `SavingsContribution` → `SavingsGoal` | Cascade      | Borrar la meta borra su historial de aportes                            |
| `Debt` → `User`                       | Cascade      | —                                                                       |
| `DebtInstallment` → `Debt`            | Cascade      | Borrar la deuda borra su cronograma completo                            |
| `DebtInstallment` → `DebtPayment`     | **SetNull**  | Borrar un pago no borra las cuotas que cubría, solo desvincula          |
| `DebtPayment` → `Debt`                | Cascade      | Borrar la deuda borra su historial de pagos                             |
| `BudgetProjection` → `User`           | Cascade      | —                                                                       |

## 🔍 Índices (lista completa, extraída de `schema.prisma`)

```prisma
// User
@@index([role])

// Category
@@index([userId, type])

// Income
@@index([userId, date])
@@index([userId, isRecurring])

// Expense
@@index([userId, date])
@@index([userId, isRecurring])
@@index([creditCardId])
@@index([userId, paymentMethod])

// CreditCard
@@index([userId, isActive])

// SavingsGoal
@@index([userId, isCompleted])

// SavingsContribution
@@index([savingsGoalId, date])

// Debt
@@index([userId, isPaid])

// DebtInstallment
@@unique([debtId, installmentNumber])
@@index([debtId, status])
@@index([dueDate, status])

// DebtPayment
@@index([debtId, date])

// BudgetProjection
@@index([userId, startDate])
```

## 📦 Datasource / generación

- `datasource db`: `provider = "postgresql"`, `url = env("DATABASE_URL")`.
- `generator client`: `provider = "prisma-client-js"`.
- El `.env` expone además `POSTGRES_URL` y `PRISMA_DATABASE_URL`, consistente con un Postgres administrado con pooling (p. ej. Prisma Postgres/Accelerate o PgBouncer) — coherente con el hecho de que la app corre como funciones serverless de Vercel (`nitro.preset: 'vercel'`), donde cada invocación puede ser un proceso frío aislado y el pool de conexiones es un recurso compartido crítico.
- El singleton de `PrismaClient` (`server/utils/db.ts`) se fija a `globalThis` únicamente quedando activo en `NODE_ENV !== 'production'` (para sobrevivir HMR en desarrollo); en producción se instancia sin ese pin. El logging de queries Prisma (`log: ['query']`) también está condicionado a `NODE_ENV !== 'production'` — en producción no se loguean queries.
- Tras cualquier cambio a `schema.prisma`: `npx prisma migrate dev --name <descriptive-name>`; el cliente se regenera automáticamente vía los hooks `postinstall`/`build`.

## 🎯 Cobertura funcional actual

1. **Gastos** (fijos/variados, efectivo/débito/crédito) — `Expense`.
2. **Ingresos** (fijos/variables) — `Income`, con generación automática de instancias recurrentes vía `POST /api/incomes/generate-recurring`.
3. **Tarjetas de crédito** (CRUD + ciclo de facturación + pagos) — `CreditCard`.
4. **Ahorros** (metas + contribuciones) — `SavingsGoal`, `SavingsContribution`.
5. **Deudas con cuotas amortizadas** (cronograma programado, pagos, adelantos) — `Debt`, `DebtInstallment`, `DebtPayment`.
6. **Proyecciones de presupuesto** (viajes/compras grandes, standalone) — `BudgetProjection`.
7. **Dashboard y sugerencias de plan de pagos** — no son modelos propios, se calculan on-the-fly en `dashboard/stats.get.ts` y `payment-plan/suggestions.get.ts` a partir de los modelos anteriores.

## 📊 Menú de Módulos (Frontend)

El Sidebar (`app/components/utils/Sidebar.vue`) refleja estos módulos:

1. 🏠 Dashboard
2. 💰 Ingresos
3. 💸 Gastos
4. 💳 Tarjetas
5. 🎯 Ahorros
6. 📋 Deudas
7. 🧭 Planificación de Pagos (consume `payment-plan/suggestions.get.ts`)
8. 📊 Reportes
9. 📈 Proyecciones (consume `budgets`)
10. 🏷️ Categorías
