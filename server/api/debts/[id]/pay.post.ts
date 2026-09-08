import { requireUser } from '@server/utils/auth'
import { validateBody, DebtPaymentSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'
import { processDebtPayment } from '@server/services/debtService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(DebtPaymentSchema, await readBody(event))

  const updatedDebt = await processDebtPayment({
    debtId: id,
    userId: user.id,
    amount: body.amount,
    principal: body.principal,
    interest: body.interest,
    insurance: body.insurance,
    date: body.date ? new Date(body.date) : undefined,
    paymentNumber: body.paymentNumber,
    notes: body.notes ?? undefined,
    installmentIds: body.installmentIds,
  })

  return serializeDecimals(updatedDebt)
})
