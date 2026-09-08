import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  const income = await prisma.income.findUnique({ where: { id } })
  if (!income || income.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Ingreso no encontrado' })
  }

  await prisma.income.delete({ where: { id } })
  return { message: 'Ingreso eliminado' }
})
