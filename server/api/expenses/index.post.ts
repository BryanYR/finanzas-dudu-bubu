import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, ExpenseSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(ExpenseSchema, await readBody(event))

  // Si el método de pago no es crédito, no puede tener tarjeta asociada
  if (body.paymentMethod !== 'credit' && body.creditCardId) {
    throw createError({
      statusCode: 400,
      message: 'Solo los gastos con tarjeta de crédito pueden tener una tarjeta asociada',
    })
  }

  const category = await prisma.category.findFirst({
    where: { id: body.categoryId, userId: user.id },
  })
  if (!category) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })

  if (body.paymentMethod === 'credit' && body.creditCardId) {
    const creditCard = await prisma.creditCard.findFirst({
      where: { id: body.creditCardId, userId: user.id },
    })
    if (!creditCard) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  const expense = await prisma.expense.create({
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
      // Cuotas: solo aplican a gastos pagados con tarjeta de crédito
      installments:
        body.paymentMethod === 'credit' && body.installments && body.installments > 1
          ? body.installments
          : null,
      installmentAmount:
        body.paymentMethod === 'credit' && body.installmentAmount && body.installmentAmount > 0
          ? body.installmentAmount
          : null,
      totalWithInterest:
        body.paymentMethod === 'credit' && body.totalWithInterest && body.totalWithInterest > 0
          ? body.totalWithInterest
          : null,
      userId: user.id,
    },
  })
  return serializeDecimals(expense)
})
