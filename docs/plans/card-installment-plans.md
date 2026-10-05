# Planes de cuotas de tarjeta (`CardInstallmentPlan`)

## Problema

Los recibos de CMR/SIP mezclan dos cosas: **cuotas ya comprometidas** (compras en cuotas, traslado de saldo, conversiones) y **consumos al contado del ciclo**. La app solo guarda el monto total de cada recibo (`CreditCardStatement`), así que no se puede responder "¿cuánto de cuotas voy a pagar en febrero 2027?" ni saber cuándo termina cada cuota. Esos cronogramas solo están en el estado de cuenta del banco.

`Expense.installments` no sirve para esto: solo cuenta la cuota dentro del recibo de un ciclo y no se reparte en los meses siguientes, y las cuotas vigentes vienen de compras anteriores a la app.

## Diseño

### Modelo

```prisma
model CardInstallmentPlan {
  id                Int      @id @default(autoincrement())
  description       String   // "Falabella.com 14/06", "Traslado de saldo crédito efectivo"
  totalInstallments Int
  installmentAmount Decimal  @db.Decimal(12, 2) // Cuota mensual (capital + interés)
  firstDueDate      DateTime // Vencimiento del recibo que trae la cuota 1
  principal         Decimal? @db.Decimal(12, 2) // Monto financiado (informativo)
  interestRate      Float?   // TEA (informativo)
  notes             String?
  isActive          Boolean  @default(true)
  creditCardId      Int
  userId            Int
  // Cascade desde CreditCard y User
  @@index([creditCardId, isActive])
  @@index([userId])
}
```

La cuota N vence en `firstDueDate + (N-1) meses` (mismo día de pago de la tarjeta). No se guarda "cuota actual": se calcula con la fecha. Los planes ya terminados no se cargan.

### API (`server/api/credit-cards/[id]/installment-plans/`)

- `index.get`: devuelve `{ plans, projection }`.
  - `plans[]`: el plan más `currentInstallment` (la que vence en el próximo recibo), `remainingInstallments`, `lastDueDate`, `remainingAmount`.
  - `projection[]`: un elemento por mes de vencimiento desde el próximo recibo hasta la última cuota: `{ month: 'YYYY-MM', dueDate, total, items: [{ planId, description, installmentNumber, totalInstallments, amount }], statementAmount | null }`. `statementAmount` es el recibo ya cargado para ese vencimiento, si existe.
- `index.post`, `[planId].put`, `[planId].delete`. Schemas Zod en `server/utils/validation.ts`.
- La lógica de cálculo vive en `server/services/` (junto a `creditCardService`), no en la ruta.

### Frontend

- Botón "Cuotas" por tarjeta (junto a "Recibos") que abre `CardInstallmentsModal`:
  - Tabla de planes en curso (cuota actual/total, monto, termina).
  - Proyección mes a mes: total de cuotas, desglose y, si hay, el recibo cargado.
  - Agregar, editar y eliminar planes.
- Tipos en `app/types/` y fetch con `useAuthFetch`.

### Datos iniciales (usuario 2)

Fuente: estados de cuenta CMR (10/08–09/09, vence 05/10) y SIP (19/08–18/09, vence 15/10). `firstDueDate` = vencimiento del estado de cuenta − (N−1) meses.

CMR (cuota que traía el recibo del 05/10 → N):

| Plan                             | Cuota  | Total cuotas | En 05/10 | firstDueDate |
| -------------------------------- | ------ | ------------ | -------- | ------------ |
| Falabella.com 14/06 (S/1,899)    | 105.50 | 18           | 3        | 05/08/2026   |
| Falabella.com 28/06 (S/296.80)   | 61.06  | 6            | 3        | 05/08/2026   |
| Pagoefectivo 28/07 (S/1,700)     | 476.86 | 4            | 2        | 05/09/2026   |
| Hb Trujillo 04/08 (S/1,311.50)   | 301.00 | 5            | 2        | 05/09/2026   |

SIP (cuota que traía el recibo del 15/10):

| Plan                                        | Cuota  | Total cuotas | En 15/10 | firstDueDate |
| ------------------------------------------- | ------ | ------------ | -------- | ------------ |
| Traslado de saldo crédito efectivo (S/2,600) | 268.94 | 12           | 4        | 15/07/2026   |
| IZI Poncemedent (S/650)                     | 232.19 | 3            | 2        | 15/09/2026   |
| Conversión a 6 cuotas: Chimbote PVEA        | 26.72  | 6            | 1        | 15/10/2026   |
| Conversión: PedidosYa Aida C                | 6.89   | 6            | 1        | 15/10/2026   |
| Conversión: Makro Trujillo                  | 54.20  | 6            | 1        | 15/10/2026   |
| Conversión: PedidosYa Food                  | 7.40   | 6            | 1        | 15/10/2026   |
| Conversión: IZI Postres de Julio            | 12.06  | 6            | 1        | 15/10/2026   |
| Conversión: Mass Casuap1 CQPS               | 5.95   | 6            | 1        | 15/10/2026   |

### Correcciones a datos existentes

- El traslado de saldo SIP es la cuota **4/12 en el recibo del 15/10**, así que la cuota 12 vence el **15/06/2027**, no el 15/05. En la BD solo hay recibos de 268.94 el 15/04 y 15/05/2027 (cuotas 10 y 11 si se cuenta bien): falta el del **15/06/2027**. Se agrega.

### Fuera de alcance

- No se generan ni actualizan recibos (`CreditCardStatement`) a partir de los planes; los recibos siguen siendo los montos que carga Bryan.
- Los centavos de redondeo del banco (ej. 382.10 vs 382.16 en mar-2027) no se modelan.
- El seguro de desgravamen (CMR 13.90, SIP 15.90 al mes) y los consumos al contado no son planes de cuotas.
