import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

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
