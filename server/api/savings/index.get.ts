import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

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
