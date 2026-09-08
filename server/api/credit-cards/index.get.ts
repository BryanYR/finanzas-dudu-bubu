import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const creditCards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
  return serializeDecimals(creditCards)
})
