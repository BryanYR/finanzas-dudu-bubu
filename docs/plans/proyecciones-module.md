# Plan de implementación — Módulo "Proyecciones"

Estado: propuesto, sin empezar.
Fecha: 2026-09-07.

## 1. Objetivo

El Sidebar ya enlaza a `/proyecciones` (`app/components/utils/Sidebar.vue:75`), pero
la página no existe. El schema ya tiene el modelo `BudgetProjection` (pensado
para esto) y hay un CRUD mínimo en `server/api/budgets/**`, pero:

- No hay ninguna página/componente en `app/` que lo use.
- El endpoint `POST /api/budgets` espera que el **cliente** ya le mande
  `expectedIncome`, `fixedExpenses`, `debtPayments`, `availableAmount`,
  `debitUsage`, `creditUsage`, `savingsImpact` calculados — no hay nada que
  los calcule.

Este plan agrega el cálculo del lado servidor (a partir de ingresos, gastos
fijos, cuotas de deuda y tarjetas reales del usuario) y la UI para que el
usuario pueda escribir "quiero hacer un viaje del 18 al 20 de septiembre con
presupuesto de S/500" y recibir una recomendación de débito vs. crédito con
advertencias, igual que el análisis manual de
[ESTADO_FINANCIERO_2026-09.md](../reports/ESTADO_FINANCIERO_2026-09.md), pero
reutilizable dentro de la app.

## 2. Alcance

**Incluye:**

- Cálculo automático (servidor) de disponibilidad real para un rango de
  fechas: saldo actual, ingresos esperados, gastos fijos y cuotas de deuda
  que caen en el rango, espacio disponible en tarjetas.
- Sugerencia débito vs. crédito + veredicto ("sin deuda" / "ajustado" /
  "riesgo de sobreendeudamiento") + advertencias en texto, en el mismo
  estilo que `payment-plan/suggestions.get.ts` y `planificacion/index.vue`.
- Guardar la proyección (reutilizando `BudgetProjection`) para verla después
  y marcarla como completada.
- Página `proyecciones` con lista de proyecciones guardadas + modal de
  creación con vista previa antes de guardar.

**No incluye (fuera de alcance por ahora):**

- Editar una proyección ya guardada (solo crear/eliminar/marcar completada).
- Ajustar automáticamente `SavingsGoal` cuando se usa `savingsImpact` (se
  calcula como referencia informativa, no se descuenta de ningún ahorro
  real).
- Recalcular una proyección guardada si cambian los datos reales después
  (es una foto del momento en que se creó).

## 3. Backend

### 3.1 Nuevo helper: `server/utils/frequency.ts`

Ya existe lógica ad-hoc de frecuencia repetida en varios endpoints
(`incomes/generate-recurring.post.ts`, `payment-plan/suggestions.get.ts`)
pero ninguna función reutilizable para "¿cuántas veces cae este ingreso
recurrente dentro de un rango de fechas arbitrario?". Se necesita para
proyectar rangos de viaje que no son necesariammente "este mes".

```ts
type Frequency = 'monthly' | 'biweekly' | 'weekly' | 'annual'

// Cuenta cuántas ocurrencias de una frecuencia caen en [rangeStart, rangeEnd],
// usando anchorDate (la fecha original del Income/Expense) para fijar el día
// del mes / día de la semana / aniversario.
export function countOccurrencesInRange(
  frequency: Frequency,
  anchorDate: Date,
  rangeStart: Date,
  rangeEnd: Date
): number
```

Reglas por frecuencia (misma lógica que ya usa
`generate-recurring.post.ts`, generalizada a un rango):

- `monthly`: una ocurrencia por cada mes del rango en el día-del-mes de
  `anchorDate` (clamp al último día si el mes es más corto).
- `biweekly`: dos ocurrencias por mes (día 15 y último día).
- `weekly`: cada 7 días desde `anchorDate`.
- `annual`: una ocurrencia si el aniversario cae dentro del rango.

Esto se prueba manualmente con casos borde: rango de 3 días (viaje corto,
normalmente 0 ocurrencias), rango que cruza fin de mes, rango de varios
meses.

### 3.2 Nuevo schema Zod: `BudgetCalculateSchema`

En `server/utils/validation.ts`, junto a `BudgetSchema`:

```ts
export const BudgetCalculateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  totalBudget: z.number().positive(),
  startDate: z.iso.datetime({ offset: true }),
  endDate: z.iso.datetime({ offset: true }),
  description: z.string().trim().max(500).optional().nullable(),
})
```

Solo los campos que el usuario realmente ingresa a mano — el resto lo
calcula el servidor.

### 3.3 Nuevo endpoint: `POST /api/budgets/calculate`

`server/api/budgets/calculate.post.ts` — **no persiste nada**, es una
previsualización. Pasos (reutilizando el estilo de
`payment-plan/suggestions.get.ts`):

1. `requireUser` + `validateBody(BudgetCalculateSchema, ...)`.
2. Validar `endDate > startDate` (mismo chequeo que ya hace
   `budgets/index.post.ts`).
3. **Saldo actual real** (liquidez de hoy, no del rango del viaje): mismo
   cálculo que ya existe en `payment-plan/suggestions.get.ts`
   (`currentBalance` = ingresos recibidos este mes − gastos en
   efectivo/débito este mes). Vale la pena extraer esa parte a
   `server/utils/cash-flow.ts` para no duplicarla en dos endpoints.
4. **Ingresos esperados en el rango** (`expectedIncome`): ingresos
   recurrentes vía `countOccurrencesInRange`, más ingresos no recurrentes ya
   registrados con fecha dentro del rango.
5. **Gastos fijos en el rango** (`fixedExpenses`): igual que arriba pero con
   `Expense.isRecurring`.
6. **Cuotas de deuda en el rango** (`debtPayments`): suma de
   `DebtInstallment.amount` con `dueDate` dentro de `[startDate, endDate]` y
   `status` en `pending`/`overdue` (`Debt.isPaid = false`).
7. **Tarjetas**: para cada `CreditCard` activa, `available = limit - used`
   (mismo dato que ya muestra `tarjetas/index.vue`); marcar
   `nearLimit: used/limit > 0.8` para poder advertir "evita cargarlo aquí"
   como hace el reporte manual.
8. **Cálculo de disponibilidad**:
   ```
   availableAmount = currentBalance + expectedIncome - fixedExpenses - debtPayments
   safetyBuffer   = expectedIncome * 0.1        // igual criterio que payment-plan
   safeToSpend    = max(availableAmount - safetyBuffer, 0)
   debitUsage     = min(totalBudget, safeToSpend)
   creditUsage    = max(totalBudget - debitUsage, 0)
   savingsImpact  = max(totalBudget - debitUsage - creditUsage, 0) // déficit real, ver abajo
   ```
9. **Veredicto** (`status: 'sin_deuda' | 'ajustado' | 'riesgo_deuda'`):
   - `sin_deuda` si `creditUsage === 0`.
   - `ajustado` si `creditUsage > 0` pero hay tarjetas con espacio suficiente
     y ninguna `nearLimit`.
   - `riesgo_deuda` si `creditUsage > 0` y todas las tarjetas con espacio
     están `nearLimit`, o si `creditUsage` excede el espacio disponible
     combinado (ahí `savingsImpact` > 0 es la señal de que ni tarjeta
     alcanza y tocaría usar ahorros).
10. **Advertencias** (`warnings: string[]`), mismo estilo que
    `payment-plan/suggestions.get.ts`: tarjetas casi al tope, saldo por
    debajo del colchón, déficit total, cuotas de deuda que caen justo en el
    rango del viaje.
11. Responder el breakdown completo (sin guardar):
    ```ts
    {
      input: { name, totalBudget, startDate, endDate, description },
      currentBalance, expectedIncome, fixedExpenses, debtPayments,
      availableAmount, debitUsage, creditUsage, savingsImpact,
      status, warnings, cards: [{ id, name, bank, available, nearLimit }]
    }
    ```

### 3.4 Endpoints existentes (sin cambios de contrato)

- `POST /api/budgets` (`server/api/budgets/index.post.ts`): el frontend lo
  llama después de que el usuario confirma la previsualización, mandando el
  mismo payload que devolvió `/calculate` más `name`/`startDate`/`endDate`.
  No requiere cambios.
- `GET /api/budgets` (`server/api/budgets/index.get.ts`): ya sirve para
  listar. Sin cambios.
- `DELETE /api/budgets/:id`: ya existe. Sin cambios.

### 3.5 Nuevo endpoint: `PUT /api/budgets/:id` (marcar completada)

`server/api/budgets/[id].put.ts` — el único campo editable por ahora es
`isCompleted` (cuando el viaje ya pasó). Sigue el patrón estándar: cargar,
verificar `userId`, `prisma.budgetProjection.update(...)`.

### 3.6 Migración de base de datos

**Ninguna.** El modelo `BudgetProjection` ya tiene todos los campos
necesarios (`prisma/schema.prisma:231`). Este plan es 100% de cálculo +
UI sobre el schema existente.

## 4. Frontend

### 4.1 Tipos: `app/types/proyecciones.ts`

```ts
export interface ProjectionCardInfo {
  id: number
  name: string
  bank: string
  available: number
  nearLimit: boolean
}

export interface ProjectionCalculation {
  currentBalance: number
  expectedIncome: number
  fixedExpenses: number
  debtPayments: number
  availableAmount: number
  debitUsage: number
  creditUsage: number
  savingsImpact: number
  status: 'sin_deuda' | 'ajustado' | 'riesgo_deuda'
  warnings: string[]
  cards: ProjectionCardInfo[]
}

export interface BudgetProjection extends ProjectionCalculation {
  id: number
  name: string
  totalBudget: number
  startDate: string
  endDate: string
  description?: string | null
  isCompleted: boolean
  createdAt: string
}
```

### 4.2 Página: `app/pages/proyecciones/index.vue`

Mismo layout que `planificacion/index.vue` (header + botón de acción +
grid de tarjetas), usando `useFetchAuth<BudgetProjection[]>('/api/budgets')`:

- Header "Proyecciones" + botón "Nueva proyección" que abre
  `ProjectionFormModal`.
- Grid de `ProjectionCard` (una por `BudgetProjection` guardada), cada una
  mostrando nombre, fechas, `totalBudget`, badge de `status` (mismos colores
  que `getPriorityColor`/`getStatusColor` en `planificacion/index.vue`) y
  botón eliminar / marcar completada.
- Estado vacío: mensaje invitando a crear la primera proyección.

### 4.3 Componente: `app/components/proyecciones/ProjectionFormModal.vue`

Modal de dos pasos, mismo patrón de props/emits que
`SavingsGoalFormModal.vue` (`show`, `save` emit, `useAuthFetch`,
`useDateFormatter`):

- **Paso 1 — formulario**: `name`, `startDate`, `endDate`, `totalBudget`,
  `description`. Botón "Calcular" hace
  `POST /api/budgets/calculate` y pasa al paso 2 con la respuesta.
- **Paso 2 — previsualización**: stat cards (Saldo actual, Ingresos
  esperados, Gastos fijos + cuotas, Disponible, Sugerido en débito,
  Sugerido en crédito), lista de `warnings` (mismo componente visual que el
  bloque de advertencias de `planificacion/index.vue`), banner de
  veredicto según `status`. Botones "Volver" (regresa al paso 1 sin perder
  los datos) y "Guardar proyección" (`POST /api/budgets` con el resultado
  del cálculo + los datos del form, luego `emit('save')` y cierra).

### 4.4 Componente: `app/components/proyecciones/ProjectionCard.vue`

Tarjeta de resumen para el grid de la página principal — reutiliza el
mismo `ProjectionCalculation` para mostrar debit/crédito sugerido y el
badge de estado, con acciones "Marcar completada" (`PUT`) y "Eliminar"
(`DELETE`, con confirmación).

### 4.5 Iconos

`app/components/icons/proyecciones/` — un icono nuevo (`TripIcon.vue`,
maleta/avión, siguiendo el patrón SVG de los demás iconos en
`app/components/icons/**`). El resto de iconos (warnings, check, chart) se
reutilizan de `app/components/icons/common/` y
`app/components/icons/planificacion/` — no duplicar.

## 5. Orden de implementación sugerido

1. `server/utils/frequency.ts` + (opcional) extraer `currentBalance` a
   `server/utils/cash-flow.ts` reutilizándolo también en
   `payment-plan/suggestions.get.ts` para no duplicar lógica.
2. `BudgetCalculateSchema` en `validation.ts`.
3. `server/api/budgets/calculate.post.ts`.
4. `server/api/budgets/[id].put.ts`.
5. Probar los endpoints con `curl`/Thunder Client contra datos reales del
   usuario antes de tocar UI.
6. `app/types/proyecciones.ts`.
7. `ProjectionFormModal.vue` (los dos pasos).
8. `ProjectionCard.vue` + `app/pages/proyecciones/index.vue`.
9. Icono `TripIcon.vue`.
10. Probar en navegador: crear una proyección con fechas/monto reales del
    viaje a Lima (18–20 set) y comparar el resultado contra
    [ESTADO_FINANCIERO_2026-09.md](../reports/ESTADO_FINANCIERO_2026-09.md)
    — debería llegar a una recomendación equivalente ("efectivo, no
    tarjeta") de forma automática.
11. `npm run format` antes de terminar (no hay lint/test suite, solo
    Prettier).

## 6. Riesgos / decisiones abiertas

- El "colchón de seguridad" (10% de `expectedIncome`) es el mismo criterio
  que ya usa `payment-plan/suggestions.get.ts`; si se ajusta ahí, ajustarlo
  también acá para no tener dos números de "colchón" distintos en la app.
- `savingsImpact` como "déficit real" es una interpretación nueva del campo
  (el schema original lo describe como "impacto en ahorros" de forma más
  genérica) — si más adelante se quiere de verdad descontar de un
  `SavingsGoal`, eso es trabajo adicional fuera de este plan.
