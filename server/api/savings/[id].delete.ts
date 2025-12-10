import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  const savingsGoal = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!savingsGoal || savingsGoal.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Meta de ahorro no encontrada' })
  }

  await prisma.savingsGoal.delete({ where: { id } })
  return { message: 'Meta de ahorro eliminada' }
})
