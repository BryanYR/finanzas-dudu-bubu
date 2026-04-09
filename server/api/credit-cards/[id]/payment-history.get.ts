import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  // Obtener tarjeta
  const card = await prisma.creditCard.findUnique({
    where: { id },
  })

  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // Los pagos de tarjeta se registran con creditCardId: null (son débitos bancarios),
  // identificados por su descripción que incluye el nombre de la tarjeta.
  const payments = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: null,
      description: {
        startsWith: `Pago Tarjeta ${card.name}`,
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
