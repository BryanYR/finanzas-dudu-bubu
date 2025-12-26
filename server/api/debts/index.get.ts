import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  return prisma.debt.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: {
          payments: true,
          installments: true,
        },
      },
      installments: {
        where: {
          status: {
            in: ['pending', 'overdue'],
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 1, // Solo la próxima cuota pendiente
      },
    },
    orderBy: [{ isPaid: 'asc' }, { startDate: 'desc' }],
  })
})
