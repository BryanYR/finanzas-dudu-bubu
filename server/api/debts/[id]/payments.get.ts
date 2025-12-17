import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  // Verify debt belongs to user
  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  return prisma.debtPayment.findMany({
    where: {
      debtId: id,
    },
    orderBy: [{ paymentNumber: 'asc' }, { date: 'asc' }],
  })
})
