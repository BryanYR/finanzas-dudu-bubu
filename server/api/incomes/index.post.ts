import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, IncomeSchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = validateBody(IncomeSchema, await readBody(event))

  return prisma.income.create({
    data: {
      amount: body.amount,
      description: body.description,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: body.isRecurring,
      frequency: body.frequency ?? null,
      notes: body.notes ?? null,
      categoryId: body.categoryId,
      userId: user.id,
    },
  })
})
