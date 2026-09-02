import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, CreditCardPaymentSchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(CreditCardPaymentSchema, await readBody(event))

  const card = await prisma.creditCard.findUnique({ where: { id } })
  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // Calcular el período que se está pagando (el último cerrado)
  const now = new Date()
  const currentDay = now.getDate()

  let billingStartDate: Date
  let billingEndDate: Date

  if (currentDay <= card.billingDay) {
    billingStartDate = new Date(now.getFullYear(), now.getMonth() - 1, card.billingDay + 1, 0, 0, 0)
    billingEndDate = new Date(now.getFullYear(), now.getMonth(), card.billingDay, 23, 59, 59)
  } else {
    billingStartDate = new Date(now.getFullYear(), now.getMonth() - 1, card.billingDay + 1, 0, 0, 0)
    billingEndDate = new Date(now.getFullYear(), now.getMonth(), card.billingDay, 23, 59, 59)
  }

  // Marcar todos los gastos de este período como pagados
  await prisma.expense.updateMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: billingStartDate, lte: billingEndDate },
      isPaidOff: false,
    },
    data: { isPaidOff: true },
  })

  // Crear un gasto que representa el pago de la tarjeta (sale de tu cuenta)
  await prisma.expense.create({
    data: {
      description: `Pago Tarjeta ${card.name} - ${card.bank}`,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: false,
      paymentMethod: 'debit' as const,
      categoryId: body.categoryId,
      userId: user.id,
      isPaidOff: false,
    },
  })

  return { success: true, message: 'Pago registrado exitosamente' }
})
