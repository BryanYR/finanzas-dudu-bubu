import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  return prisma.creditCard.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
})
