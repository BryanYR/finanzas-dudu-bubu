import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const income = await prisma.income.findUnique({ where: { id } })
  if (!income || income.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Ingreso no encontrado' })
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

  return prisma.income.update({
    where: { id },
    data: updateData,
  })
})
