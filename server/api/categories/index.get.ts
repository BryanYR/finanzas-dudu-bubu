import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  return prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
})
