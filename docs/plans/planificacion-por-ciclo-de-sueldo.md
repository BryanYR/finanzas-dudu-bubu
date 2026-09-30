# Planificación por ciclo de sueldo

## Problema

`/api/payment-plan/suggestions` calculaba todo por **mes calendario**:

- "Balance actual" = ingresos − gastos débito − cuotas pagadas **desde el día 1 del mes**. Si en septiembre se pagaron los recibos de agosto (con el sueldo del 28/08) y además los de octubre (con el sueldo del 28/09), el balance salía muy negativo aunque todo estuviera pagado.
- "Ingresos esperados" comparaba la plantilla recurrente contra ingresos `isRecurring = true` del mes. Los sueldos auto-generados se guardan con `isRecurring = false`, así que el sueldo del mes nunca se daba por recibido.
- "Obligaciones" sumaba la siguiente cuota de **cada** deuda/tarjeta sin importar cuándo vence (ej. una cuota de enero 2027 contaba contra el saldo de hoy), e incluía gastos recurrentes cargados a tarjeta (que ya están dentro del recibo).

## Modelo del usuario

El sueldo que entra a fin del mes M paga lo que vence hasta el siguiente sueldo (principalmente los recibos/cuotas de inicio del mes M+1). Ej.: sueldo 28/09 → CMR 05/10, BCP 05/10, SIP 15/10; sueldo 28/10 → Yape 29/10, Wilmer 01/11, CMR 05/11, BCP 05/11, SIP 15/11.

## Diseño

**Ciclo** = `[fecha de sueldo k, fecha de sueldo k+1)`.

- Ancla: la plantilla de ingreso recurrente mensual de mayor monto. El inicio del ciclo actual es la fecha (día) del último sueldo recibido de esa plantilla (la propia plantilla o un ingreso con `notes` "…recurrente #<id>"). Si no hay uno en los últimos 40 días, se usa la última ocurrencia teórica del día de sueldo. Sin ingresos recurrentes → mes calendario.
- **Ciclo actual** `[L, N)`:
  - Disponible = ingresos en `[L, hoy]` (incluye préstamos recibidos) − gastos sin tarjeta en `[L, hoy]` − `DebtPayment` en `[L, hoy]`.
  - Pendiente = obligaciones no pagadas con vencimiento `< N` (incluye vencidas).
  - Queda = disponible − pendiente.
- **Próximo ciclo** `[N, N2)`:
  - Sueldo esperado = suma de plantillas mensuales.
  - Obligaciones con vencimiento en `[N, N2)`.
  - Resultado = sueldo − obligaciones; y resultado con arrastre del ciclo actual.
- Obligaciones:
  - Cuotas de deuda `pending`/`overdue` (todas las del rango, no solo la siguiente).
  - Recibos de tarjeta `CreditCardStatement` no pagados; si la tarjeta no tiene recibos pendientes, estimación por gastos del periodo (lógica existente).
  - Gastos recurrentes **sin tarjeta**: ocurrencias posteriores a la fecha de la plantilla, sin meses omitidos, y sin un gasto con la misma descripción/categoría+monto ya registrado ese mes.
- Fecha sugerida de pago = vencimiento − 2 días, pero nunca antes de que entre el sueldo que la financia (ni antes de hoy).
- Proyección diaria desde hoy hasta el fin del próximo ciclo, con el sueldo esperado en `N`.
- Fechas devueltas como `YYYY-MM-DD` (día calendario de Lima) para que el cliente no las corra un día.

`getCurrentBalance` (mes calendario) se mantiene para `budgets/calculate` y `analisis-deudas/forecast`; no se toca.

## Contrato

La respuesta mantiene `summary`, `suggestions` y `cashFlowProjection` y agrega `cycles: { current, next }`. Cada sugerencia lleva `cycle: 'current' | 'next'`. Ver `docs/reference/API_DOCUMENTATION.md`.
