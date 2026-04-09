import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  const budget = await prisma.budgetProjection.findUnique({ where: { id } })
  if (!budget || budget.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Presupuesto no encontrado' })
  }

  await prisma.budgetProjection.delete({ where: { id } })
  return { message: 'Presupuesto eliminado' }
})
