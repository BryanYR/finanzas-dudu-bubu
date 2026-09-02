import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, ExpenseSchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = validateBody(ExpenseSchema, await readBody(event))

  // Si el método de pago no es crédito, no puede tener tarjeta asociada
  if (body.paymentMethod !== 'credit' && body.creditCardId) {
    throw createError({ statusCode: 400, message: 'Solo los gastos con tarjeta de crédito pueden tener una tarjeta asociada' })
  }

  return prisma.expense.create({
    data: {
      amount: body.amount,
      description: body.description,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: body.isRecurring,
      frequency: body.frequency ?? null,
      notes: body.notes ?? null,
      categoryId: body.categoryId,
      paymentMethod: body.paymentMethod,
      creditCardId: body.paymentMethod === 'credit' ? (body.creditCardId ?? undefined) : undefined,
      userId: user.id,
    },
  })
})
