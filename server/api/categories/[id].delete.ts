import { Prisma } from '@prisma/client'
import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category || category.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Categoría no encontrada' })
  }

  try {
    await prisma.category.delete({ where: { id } })
  } catch (error) {
    // La relación Income/Expense -> Category es onDelete: Restrict; Postgres
    // rechaza el delete con una violación de FK si hay movimientos asociados.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2003' || error.code === 'P2014')
    ) {
      throw createError({
        statusCode: 409,
        message: 'No se puede eliminar una categoría con ingresos o gastos asociados',
      })
    }
    throw error
  }

  return { message: 'Categoría eliminada' }
})
