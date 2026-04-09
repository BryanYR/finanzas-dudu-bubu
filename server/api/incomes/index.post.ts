import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber } from '@server/utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  assertRequired(body, ['amount', 'description', 'date'])
  assertPositiveNumber(body, ['amount'])

  return prisma.income.create({
    data: {
      amount: body.amount,
      description: body.description,
      date: new Date(body.date),
      isRecurring: body.isRecurring || false,
      frequency: body.frequency,
      notes: body.notes,
      categoryId: body.categoryId,
      userId: user.id,
    },
  })
})
