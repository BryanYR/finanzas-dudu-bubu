import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { computeBillingWindows } from '@server/services/creditCardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const card = await prisma.creditCard.findUnique({ where: { id } })
  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // Obtener el período cerrado usando la misma lógica del servicio
  const { lastClosed } = computeBillingWindows(card)

  // Marcar todos los gastos del período cerrado como pagados
  await prisma.expense.updateMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: lastClosed.start, lte: lastClosed.end },
      isPaidOff: false,
    },
    data: { isPaidOff: true },
  })

  // Registrar el pago como un gasto de débito (sale de la cuenta bancaria)
  await prisma.expense.create({
    data: {
      description: `Pago Tarjeta ${card.name} - ${card.bank}`,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: false,
      paymentMethod: 'debit',
      creditCardId: null,
      categoryId: body.categoryId,
      userId: user.id,
      isPaidOff: false,
    },
  })

  return { success: true, message: 'Pago registrado exitosamente' }
})
