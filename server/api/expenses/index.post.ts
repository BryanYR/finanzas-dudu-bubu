import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber, assertEnum } from '@server/utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  assertRequired(body, ['amount', 'description', 'date'])
  assertPositiveNumber(body, ['amount'])
  assertEnum(body.paymentMethod ?? 'cash', ['cash', 'debit', 'credit'], 'paymentMethod')

  return prisma.expense.create({
    data: {
      amount: body.amount,
      description: body.description,
      date: new Date(body.date),
      isRecurring: body.isRecurring || false,
      frequency: body.frequency,
      notes: body.notes,
      categoryId: body.categoryId,
      paymentMethod: body.paymentMethod || 'cash',
      creditCardId: body.creditCardId,
      installments: body.paymentMethod === 'credit' && body.installments > 1 ? body.installments : null,
      installmentAmount: body.paymentMethod === 'credit' && body.installmentAmount > 0 ? body.installmentAmount : null,
      totalWithInterest: body.paymentMethod === 'credit' && body.totalWithInterest > 0 ? body.totalWithInterest : null,
      userId: user.id,
    },
  })
})
