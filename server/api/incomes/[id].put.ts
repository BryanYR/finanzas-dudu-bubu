import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, IncomeUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  const body = validateBody(IncomeUpdateSchema, await readBody(event))

  const income = await prisma.income.findUnique({ where: { id } })
  if (!income || income.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Ingreso no encontrado' })
  }

  if (body.categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId: user.id },
    })
    if (!category) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })
  }

  // Preparar datos a actualizar
  const updateData: any = {
    amount: body.amount,
    description: body.description,
    isRecurring: body.isRecurring,
    categoryId: body.categoryId,
  }

  // Solo actualizar campos opcionales si están presentes
  if (body.date) {
    updateData.date = new Date(body.date)
  }
  if (body.frequency !== undefined) {
    updateData.frequency = body.frequency
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes
  }

  const updated = await prisma.income.update({
    where: { id },
    data: updateData,
  })
  return serializeDecimals(updated)
})
