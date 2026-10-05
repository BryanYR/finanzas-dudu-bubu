# Recibos mensuales de tarjeta (`CreditCardStatement`)

## Problema

La tarjeta muestra como "Deuda del periodo" `carriedBalance` + gastos no pagados del periodo de facturación activo. `carriedBalance` es un único número manual, sin mes asociado, así que:

- No representa el monto que hay que pagar en un recibo concreto (las cuotas en curso de CMR/SIP cambian cada mes).
- Al registrar un pago, los `Expense` del ciclo se marcan pagados pero `carriedBalance` se queda igual → la tarjeta sigue mostrando un monto que ya no corresponde.
- Si se usa `carriedBalance` como "monto del recibo", el % de uso y el disponible dejan de ser reales.

## Objetivo

Que cada tarjeta muestre **el pago del mes** y, si ya se pagó, **el siguiente**, usando los montos reales de cada recibo (del estado de cuenta o de un cálculo manual), sin romper las tarjetas que no tengan recibos cargados.

## Diseño

### Modelo nuevo

```prisma
model CreditCardStatement {
  id           Int       @id @default(autoincrement())
  dueDate      DateTime  // Fecha de vencimiento del recibo
  amount       Decimal   @db.Decimal(12, 2) // Monto total a pagar del recibo
  isPaid       Boolean   @default(false)
  paidAt       DateTime?
  paidAmount   Decimal?  @db.Decimal(12, 2)
  notes        String?
  creditCardId Int
  userId       Int
  // Cascade desde CreditCard y User
  @@index([creditCardId, isPaid, dueDate])
}
```

### Backend

- `creditCardService.resolveCardAmountDue(card, userId, today)`: si hay un `CreditCardStatement` sin pagar, toma el de `dueDate` más próximo (aunque ya esté vencido) y devuelve su monto y fecha (`source: 'statement'`). Si no hay, usa el cálculo actual con los gastos y `carriedBalance` (`source: 'expenses'`).
- `statement.get.ts`:
  - `totalAmount` pasa a ser el monto a pagar que devuelve el helper.
  - El % de uso y el disponible se siguen calculando con `carriedBalance` + gastos del periodo, así que vuelven a medir la línea usada y no el recibo.
  - Se agregan `usedAmount`, `source` y `statementId`.
- `pay.post.ts`: si hay un recibo pendiente, lo marca como pagado (`paidAt`, `paidAmount`) y también marca como pagados los gastos del ciclo que corresponde a ese vencimiento. Si no hay recibo, funciona como ahora.
- CRUD de recibos en `server/api/credit-cards/[id]/statements/`: `index.get`, `index.post`, `[statementId].put`, `[statementId].delete`. Validación en `validation.ts` con `CreditCardStatementSchema` y su versión de actualización.
- `paymentPlanService`: la sugerencia de pago de tarjeta usa el mismo helper.

### Frontend

- La tarjeta dice **"Pago del mes"** si el vencimiento cae en el mes actual, **"Próximo pago"** si cae en un mes siguiente, y **"Vencido"** si ya pasó.
- Hay un botón nuevo "Recibos" que abre `CardStatementsModal`:
  - Muestra la lista de recibos con su estado.
  - Permite agregar, editar y eliminar recibos, y marcarlos como pagados o pendientes.
  - Al agregar uno, propone el siguiente vencimiento según `paymentDay`.
- En el formulario de tarjeta, el texto de `carriedBalance` aclara que es el saldo usado que reporta el banco.

### Datos iniciales (usuario 2)

- CMR: 05/11/2026 S/2,455.85 · 05/12/2026 S/944.42 · 05/01/2027 S/472.06
- SIP: 15/11/2026 S/744.38 · 15/12/2026 S/466.16 · 15/01/2027 S/466.16

### Consumos posteriores al recibo (`coveredUntil`, 2026-10-05)

Problema: el monto del recibo era fijo, así que los gastos registrados después de cargarlo no aparecían en Planificación ni en la tarjeta (ej. S/ 620.81 de la CMR).

- Se agrega `CreditCardStatement.coveredUntil` (nullable). `amount` pasa a ser el monto base y los gastos con la tarjeta, sin pagar, posteriores a `coveredUntil` y dentro del ciclo del recibo se suman: `creditCardService.computeStatementDue`.
- Lo usan `resolveCardAmountDue` (tarjeta) y `paymentPlanService` (planificación). El modal de recibos pide la fecha y, al editar el monto sin tocarla, la fija en hoy.
- Datos: CMR 05/11 y SIP 15/11 quedaron con `coveredUntil` = 30/09.
- Límite: los gastos de un ciclo sin recibo cargado no se estiman, y no se sabe de gastos que no se registraron.

### Fuera de alcance

- Los pagos parciales no se modelan: el recibo se marca pagado y se guarda el monto que realmente se pagó.
- No se generan recibos automáticamente a partir de cuotas, porque la app no conoce los cronogramas de las tarjetas.
