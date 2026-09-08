import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const creditCards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })
  return serializeDecimals(creditCards)
})
