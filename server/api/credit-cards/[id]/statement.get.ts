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

  // Calcular periodo de facturación actual
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const currentDay = today.getDate()

  let billingStartDate: Date
  let billingEndDate: Date
  let paymentDueDate: Date

  // Si estamos antes del día de corte, el periodo de facturación es del mes pasado
  if (currentDay < card.billingDay) {
    // Periodo: día de corte del mes pasado hasta día de corte de este mes
    billingStartDate = new Date(currentYear, currentMonth - 1, card.billingDay, 0, 0, 0)
    billingEndDate = new Date(currentYear, currentMonth, card.billingDay - 1, 23, 59, 59)

    // Fecha de pago en este mes
    if (card.paymentDay >= card.billingDay) {
      paymentDueDate = new Date(currentYear, currentMonth, card.paymentDay, 23, 59, 59)
    } else {
      paymentDueDate = new Date(currentYear, currentMonth + 1, card.paymentDay, 23, 59, 59)
    }
  } else {
    // Periodo: día de corte de este mes hasta día de corte del mes siguiente
    billingStartDate = new Date(currentYear, currentMonth, card.billingDay, 0, 0, 0)
    billingEndDate = new Date(currentYear, currentMonth + 1, card.billingDay - 1, 23, 59, 59)

    // Fecha de pago en el mes siguiente
    if (card.paymentDay >= card.billingDay) {
      paymentDueDate = new Date(currentYear, currentMonth + 1, card.paymentDay, 23, 59, 59)
    } else {
      paymentDueDate = new Date(currentYear, currentMonth + 2, card.paymentDay, 23, 59, 59)
    }
  }

  // Obtener gastos del periodo de facturación actual
  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: {
        gte: billingStartDate,
        lte: billingEndDate,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      date: 'desc',
    },
  })

  // Calcular total
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Calcular uso del límite
  const creditUsagePercent = (totalAmount / card.creditLimit) * 100

  return {
    card: {
      id: card.id,
      name: card.name,
      bank: card.bank,
      lastDigits: card.lastDigits,
      creditLimit: card.creditLimit,
      billingDay: card.billingDay,
      paymentDay: card.paymentDay,
    },
    billingPeriod: {
      startDate: billingStartDate.toISOString(),
      endDate: billingEndDate.toISOString(),
      paymentDueDate: paymentDueDate.toISOString(),
    },
    statement: {
      totalAmount,
      transactionCount: expenses.length,
      creditUsagePercent: Number(creditUsagePercent.toFixed(2)),
      availableCredit: card.creditLimit - totalAmount,
    },
    expenses,
  }
})
