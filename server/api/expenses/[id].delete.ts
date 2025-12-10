import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense || expense.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  await prisma.expense.delete({ where: { id } })
  return { message: 'Gasto eliminado' }
})
