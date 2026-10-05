# Plan de implementación — Módulo "Reportes"

Estado: en curso — filtros (sección 2) y reportes 1 y 2 implementados; faltan los reportes 3 a 7.
Fecha: 2026-10-05.

## 1. Objetivo

El Sidebar (`app/components/utils/Sidebar.vue:233`) y el dashboard (`app/pages/index.vue:72`)
ya enlazan a `/reportes`, pero la página y su API no existen. Hoy los análisis
(estado financiero, flujo de caja) se arman a mano en `docs/reports/`. Este módulo
los vuelve reutilizables dentro de la app, con los mismos filtros de fechas que
Ingresos y Gastos.

## 2. Prerrequisito: filtros en Ingresos y Gastos (hecho)

Implementado en `app/pages/gastos/index.vue` y `app/pages/ingresos/index.vue`:

| Filtro                                                                                        | Gastos | Ingresos |
| --------------------------------------------------------------------------------------------- | ------ | -------- |
| Rango de fechas con atajos (este mes, mes anterior, últimos 3 meses, este año, personalizado) | ✅     | ✅       |
| Categoría (multi-selección)                                                                   | ✅     | ✅       |
| Tarjeta (incluye "sin tarjeta")                                                               | ✅     | –        |
| Estado de pago (`isPaidOff`, solo crédito)                                                    | ✅     | –        |
| Cuotas (en cuotas / pago único)                                                               | ✅     | –        |
| Frecuencia                                                                                    | ✅     | ✅       |
| Rango de monto                                                                                | ✅     | ✅       |
| Ordenar (fecha, monto, categoría)                                                             | ✅     | ✅       |

Decisiones:

- **El filtrado es en el cliente.** Las páginas siguen cargando todo el historial y filtran en memoria;
  para un uso personal es instantáneo y mantiene consistentes las tarjetas de resumen. El
  `GET /api/expenses` y `GET /api/incomes` ya aceptan `from`/`to`; mover el resto de filtros al
  servidor solo vale la pena si el historial crece mucho.
- Las tarjetas de resumen (Total, Efectivo, Crédito, Únicos) siguen todos los filtros salvo los pills
  de tipo/método. "Fijos/mes" es un compromiso mensual y **no** depende del rango de fechas.
- Piezas reutilizables para Reportes: `useDateRangeFilter` (`app/composables/`),
  `UiDateRangeFilter` y `UiMultiSelect` (`app/components/ui/`).

## 3. Alcance de Reportes

Todos los reportes aceptan `from`, `to` y, donde aplique, `categoryIds` y `creditCardId`.

| #    | Reporte                    | Contenido                                                                 | Fuente de datos                                                         |
| ---- | -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1 ✅ | Resumen mensual            | Ingresos vs gastos vs ahorro por mes (6–12 meses), tasa de ahorro         | `Income`, `Expense`                                                     |
| 2 ✅ | Gastos por categoría       | Dona + ranking, variación vs. período anterior                            | `Expense` agrupado por `categoryId`                                     |
| 3    | Método de pago y tarjetas  | Efectivo/débito/crédito y total por tarjeta                               | `Expense.paymentMethod`, `creditCardId`                                 |
| 4    | Fijos vs variables         | Gasto comprometido vs. discrecional                                       | `Expense.isRecurring` (respetar `skippedMonths`)                        |
| 5    | Intereses y cuotas         | Intereses/seguro pagados en deudas, intereses de cuotas de tarjeta        | `DebtPayment.interest/insurance`, `Expense.totalWithInterest - amount`  |
| 6    | Flujo de caja proyectado   | Mes a mes: ingresos esperados, fijos, cuotas de deuda, recibos de tarjeta | Reutiliza la lógica de `payment-plan/suggestions` y `creditCardService` |
| 7    | Estado de deudas y ahorros | Avance del cronograma (`DebtInstallment`) y de metas (`SavingsGoal`)      | `Debt*`, `Savings*`                                                     |

## 4. API

Un endpoint por reporte, bajo `server/api/reports/`, con la forma habitual
(`requireUser`, query validada con Zod en `server/utils/validation.ts`, `where: { userId: user.id }`,
`serializeDecimals`):

```
GET /api/reports/monthly-summary?from=&to=
GET /api/reports/expenses-by-category?from=&to=&categoryIds=
GET /api/reports/payment-methods?from=&to=
GET /api/reports/fixed-vs-variable?from=&to=
GET /api/reports/interest?from=&to=
GET /api/reports/cash-flow?months=3
GET /api/reports/debts-savings
```

Notas de implementación:

- **Decimal-safety:** sumar con `Prisma.Decimal` o agregaciones de Prisma (`groupBy`/`aggregate`), no con
  `+` sobre números ya convertidos.
- **Zona horaria:** agrupar por mes en `America/Lima`, igual que el dashboard (ver commit
  "Fix dashboard month in Lima timezone"). Un `date_trunc` en UTC desplaza gastos de fin de mes.
- **Recurrentes:** un gasto/ingreso recurrente es una fila con `frequency`; para totales por mes hay que
  expandirlo (`monthly` x1, `biweekly` x2, `weekly` x4, `annual` /12) y excluir meses de `skippedMonths`,
  igual que `recurringTotal` en `gastos/index.vue`.
- Extraer la lógica a `server/services/reportService.ts` (como `creditCardService.ts`) y mantener los
  handlers delgados.

## 5. Frontend

- `app/pages/reportes/index.vue` con pestañas por reporte y una barra de filtros común
  (`UiDateRangeFilter` + `UiMultiSelect`).
- `app/components/reportes/` para cada reporte; gráficos con Chart.js (ya en el stack).
- `app/types/reporte.ts` para las respuestas.
- Exportar a CSV desde cada tabla (sin dependencias nuevas).

## 5.1 Decisiones tomadas en la implementación (reportes 1 y 2)

- **Dos bases de cálculo (`basis`)**: pagar una tarjeta crea un gasto de débito "Pago Tarjeta …" que duplica los cargos a crédito ya registrados. `consumo` (por defecto) lo excluye; `caja` excluye en cambio los gastos a crédito. Detalle en [API_DOCUMENTATION.md](../reference/API_DOCUMENTATION.md#-reportes-apireports).
- **Gastos recurrentes expandidos por mes** (son una sola fila plantilla), con la misma regla de deduplicación de `payment-plan`. Los ingresos no se expanden.
- El resumen mensual resta los pagos de deuda (`DebtPayment`) para el neto; no son `Expense`.
- Gastos por categoría usa ranking de barras horizontales (no dona): hay muchas categorías y cada una conserva su color.
- Pendiente para el reporte 4: reutilizar `loadExpenseLines` (ya separa `fixed`/variable por mes).

## 6. Orden sugerido

1. Resumen mensual + Gastos por categoría (cubren el 80 % del uso).
2. Método de pago/tarjetas y Fijos vs variables.
3. Intereses y cuotas.
4. Flujo de caja proyectado (el más complejo; depende de `payment-plan` y de recibos de tarjeta).
5. Estado de deudas y ahorros.

## 7. Documentación a actualizar al implementar

- `docs/reference/API_DOCUMENTATION.md`: sección `📊 Reportes (/api/reports)`.
- `docs/reference/SCHEMA_DOCUMENTATION.md`: ítem 8 del menú de módulos.
- `CLAUDE.md`: agregar `reportes` a la lista de módulos de `app/pages/`.
