import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const query = getQuery(event)

  return prisma.income.findMany({
    where: {
      userId: user.id,
      date: {
        gte: query.from ? new Date(query.from as string) : undefined,
        lte: query.to ? new Date(query.to as string) : undefined,
      },
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  })
})
