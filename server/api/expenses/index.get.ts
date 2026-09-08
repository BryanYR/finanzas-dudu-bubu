import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const query = getQuery(event)

  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: {
        gte: query.from ? new Date(query.from as string) : undefined,
        lte: query.to ? new Date(query.to as string) : undefined,
      },
    },
    include: { category: true, creditCard: true },
    orderBy: { date: 'desc' },
  })
  return serializeDecimals(expenses)
})
