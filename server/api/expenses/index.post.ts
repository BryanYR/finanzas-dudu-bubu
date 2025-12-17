import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  return prisma.expense.create({
    data: {
      amount: body.amount,
      description: body.description,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: body.isRecurring || false,
      frequency: body.frequency,
      notes: body.notes,
      categoryId: body.categoryId,
      paymentMethod: body.paymentMethod || 'cash',
      creditCardId: body.creditCardId,
      userId: user.id,
    },
  })
})
