import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  // Verificar que la deuda pertenece al usuario
  const debt = await prisma.debt.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  // Obtener todas las cuotas con sus pagos relacionados
  const installments = await prisma.debtInstallment.findMany({
    where: { debtId: id },
    include: {
      debtPayment: {
        select: {
          id: true,
          date: true,
          amount: true,
          notes: true,
        },
      },
    },
    orderBy: {
      installmentNumber: 'asc',
    },
  })

  // Actualizar estado de cuotas vencidas
  const now = new Date()
  const overdueIds = installments
    .filter((i) => i.status === 'pending' && new Date(i.dueDate) < now)
    .map((i) => i.id)

  if (overdueIds.length > 0) {
    await prisma.debtInstallment.updateMany({
      where: {
        id: { in: overdueIds },
      },
      data: {
        status: 'overdue',
      },
    })

    // Re-fetch con el estado actualizado
    return prisma.debtInstallment.findMany({
      where: { debtId: id },
      include: {
        debtPayment: {
          select: {
            id: true,
            date: true,
            amount: true,
            notes: true,
          },
        },
      },
      orderBy: {
        installmentNumber: 'asc',
      },
    })
  }

  return installments
})
