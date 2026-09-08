import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const savingsGoals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    include: {
      contributions: {
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ isCompleted: 'asc' }, { priority: 'asc' }],
  })
  return serializeDecimals(savingsGoals)
})
