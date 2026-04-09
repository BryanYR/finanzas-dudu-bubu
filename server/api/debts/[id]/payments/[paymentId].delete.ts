import { requireUser } from '@server/utils/auth'
import { reverseDebtPayment } from '@server/services/debtService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const debtId = Number(event.context.params?.id)
  const paymentId = Number(event.context.params?.paymentId)

  if (!debtId || !paymentId) {
    throw createError({ statusCode: 400, message: 'Parámetros inválidos' })
  }

  await reverseDebtPayment({ paymentId, userId: user.id })

  return { success: true }
})
