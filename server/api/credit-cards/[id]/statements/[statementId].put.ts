import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CreditCardStatementUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const statementId = Number(event.context.params?.statementId)
  if (!id || !statementId) throw createError({ statusCode: 400, message: 'Parámetros inválidos' })

  const body = validateBody(CreditCardStatementUpdateSchema, await readBody(event))

  const existing = await prisma.creditCardStatement.findFirst({
    where: { id: statementId, creditCardId: id, userId: user.id },
  })
  if (!existing) throw createError({ statusCode: 404, message: 'Recibo no encontrado' })

  // Al marcar como pagado sin datos de pago, se asume pago completo hoy; al volver a
  // pendiente se limpian los datos del pago.
  const paymentData =
    body.isPaid === undefined
      ? {
          ...(body.paidAt !== undefined && { paidAt: body.paidAt ? new Date(body.paidAt) : null }),
          ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
        }
      : body.isPaid
        ? {
            isPaid: true,
            paidAt: body.paidAt ? new Date(body.paidAt) : (existing.paidAt ?? new Date()),
            paidAmount: body.paidAmount ?? existing.paidAmount ?? body.amount ?? existing.amount,
          }
        : { isPaid: false, paidAt: null, paidAmount: null }

  const statement = await prisma.creditCardStatement.update({
    where: { id: statementId },
    data: {
      ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.coveredUntil !== undefined && {
        coveredUntil: body.coveredUntil ? new Date(body.coveredUntil) : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...paymentData,
    },
  })

  return serializeDecimals(statement)
})
