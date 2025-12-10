import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined

  return prisma.budgetProjection.findMany({
    where: {
      userId: user.id,
      ...(startDate && { startDate: { gte: startDate } }),
      ...(endDate && { endDate: { lte: endDate } }),
    },
    orderBy: { startDate: 'desc' },
  })
})
