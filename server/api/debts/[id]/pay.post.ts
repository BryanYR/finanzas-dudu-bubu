import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber } from '@server/utils/validate'
import { processDebtPayment } from '@server/services/debtService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  assertRequired(body, ['amount', 'principal', 'interest'])
  assertPositiveNumber(body, ['amount'])

  return processDebtPayment({
    debtId: id,
    userId: user.id,
    amount: body.amount,
    principal: body.principal,
    interest: body.interest,
    insurance: body.insurance,
    date: body.date ? new Date(body.date) : undefined,
    paymentNumber: body.paymentNumber,
    notes: body.notes,
    installmentIds: body.installmentIds,
  })
})
