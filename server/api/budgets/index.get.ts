import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined

  const budgets = await prisma.budgetProjection.findMany({
    where: {
      userId: user.id,
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { endDate: { lte: endDate } }),
    },
    orderBy: { startDate: 'desc' },
  })
  return serializeDecimals(budgets)
})
