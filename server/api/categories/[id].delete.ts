import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || category.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Categoría no encontrada' })
  }

  await prisma.category.delete({ where: { id } })
  return { message: 'Categoría eliminada' }
})
