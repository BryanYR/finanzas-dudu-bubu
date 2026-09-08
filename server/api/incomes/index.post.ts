import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, IncomeSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(IncomeSchema, await readBody(event))

  const category = await prisma.category.findFirst({
    where: { id: body.categoryId, userId: user.id },
  })
  if (!category) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })

  const income = await prisma.income.create({
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
  return serializeDecimals(income)
})
