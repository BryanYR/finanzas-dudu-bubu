import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, ExpenseUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = validateBody(ExpenseUpdateSchema, await readBody(event))

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense || expense.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  if (body.categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId: user.id },
    })
    if (!category) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })
  }

  if (body.creditCardId) {
    const creditCard = await prisma.creditCard.findFirst({
      where: { id: body.creditCardId, userId: user.id },
    })
    if (!creditCard) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // Build update data conditionally to avoid undefined values
  const updateData: any = {}

  if (body.amount !== undefined) updateData.amount = body.amount
  if (body.description !== undefined) updateData.description = body.description
  if (body.date) updateData.date = new Date(body.date)
  if (body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
  if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod

  // Handle optional fields
  if (body.frequency) {
    updateData.frequency = body.frequency
  } else if (body.isRecurring === false) {
    updateData.frequency = null
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes || null
  }

  // Handle credit card - only set if payment method is credit
  if (body.paymentMethod === 'credit' && body.creditCardId) {
    updateData.creditCardId = body.creditCardId
  } else if (body.paymentMethod !== 'credit') {
    updateData.creditCardId = null
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: updateData,
  })
  return serializeDecimals(updated)
})
