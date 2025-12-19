import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

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
    // Período cerrado: del mes anterior
    billingStartDate = new Date(now.getFullYear(), now.getMonth() - 1, card.billingDay + 1, 0, 0, 0)
    billingEndDate = new Date(now.getFullYear(), now.getMonth(), card.billingDay, 23, 59, 59)
  } else {
    // Período cerrado: del mes anterior (porque ya pasó el corte de este mes)
    billingStartDate = new Date(now.getFullYear(), now.getMonth() - 1, card.billingDay + 1, 0, 0, 0)
    billingEndDate = new Date(now.getFullYear(), now.getMonth(), card.billingDay, 23, 59, 59)
  }

  // Marcar todos los gastos de este período como pagados
  await prisma.expense.updateMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: {
        gte: billingStartDate,
        lte: billingEndDate,
      },
      isPaidOff: false, // Solo los que no han sido marcados
    },
    data: {
      isPaidOff: true,
    },
  })

  // Crear un gasto que representa el pago de la tarjeta (sale de tu cuenta)
  await prisma.expense.create({
    data: {
      description: `Pago Tarjeta ${card.name} - ${card.bank}`,
      amount: body.amount,
      date: body.date ? new Date(body.date) : new Date(),
      isRecurring: false,
      paymentMethod: 'debit', // El pago sale de tu cuenta
      creditCardId: null, // No es un gasto con tarjeta, es EL PAGO de la tarjeta
      categoryId: body.categoryId, // Categoría para pagos de tarjetas
      userId: user.id,
      isPaidOff: false, // Este es un gasto de cuenta bancaria, no de tarjeta
    },
  })

  return { success: true, message: 'Pago registrado exitosamente' }
})
