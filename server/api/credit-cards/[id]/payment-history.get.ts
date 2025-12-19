import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  // Obtener tarjeta
  const card = await prisma.creditCard.findUnique({
    where: { id },
  })

  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // Obtener todos los pagos de esta tarjeta (gastos con descripción "Pago de Tarjeta")
  const payments = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: id,
      description: {
        startsWith: 'Pago de Tarjeta',
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      date: 'desc',
    },
  })

  return {
    card: {
      id: card.id,
      name: card.name,
      bank: card.bank,
      lastDigits: card.lastDigits,
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.date,
      description: payment.description,
      category: payment.category
        ? {
            id: payment.category.id,
            name: payment.category.name,
            color: payment.category.color,
          }
        : null,
    })),
  }
})
