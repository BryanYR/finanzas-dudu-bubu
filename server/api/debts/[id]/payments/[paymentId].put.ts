import { requireUser } from '@server/utils/auth'
import { updateDebtPayment } from '@server/services/debtService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const debtId = Number(event.context.params?.id)
  const paymentId = Number(event.context.params?.paymentId)
  const body = await readBody(event)

  if (!debtId || !paymentId) {
    throw createError({ statusCode: 400, message: 'Parámetros inválidos' })
  }

  if (!body.amount || body.amount <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

  await updateDebtPayment({
    paymentId,
    userId: user.id,
    amount: Number(body.amount),
    principal: Number(body.principal),
    interest: Number(body.interest),
    insurance: Number(body.insurance ?? 0),
    date: new Date(body.date),
    paymentNumber: Number(body.paymentNumber),
    notes: body.notes,
  })

  return { success: true }
})
