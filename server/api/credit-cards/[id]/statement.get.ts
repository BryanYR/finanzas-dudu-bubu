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

  // Función auxiliar para calcular la fecha de pago basada en la fecha de corte
  const getPaymentDueDate = (billingEndDate: Date, paymentDay: number): Date => {
    const billingEndMonth = billingEndDate.getMonth()
    const billingEndYear = billingEndDate.getFullYear()
    const billingDay = billingEndDate.getDate()

    // Si el día de pago es mayor que el día de corte, el pago es en el mismo mes del corte
    // Si es menor o igual, el pago es en el mes siguiente al corte
    if (paymentDay > billingDay) {
      return new Date(billingEndYear, billingEndMonth, paymentDay, 23, 59, 59)
    } else {
      return new Date(billingEndYear, billingEndMonth + 1, paymentDay, 23, 59, 59)
    }
  }

  // Calcular el último período CERRADO (el que debe pagarse pronto)
  let lastClosedStart: Date
  let lastClosedEnd: Date
  let lastClosedPaymentDue: Date

  if (currentDay > card.billingDay) {
    // Ya pasamos el corte de este mes
    // Período cerrado: del mes pasado al corte de este mes
    lastClosedStart = new Date(currentYear, currentMonth - 1, card.billingDay + 1, 0, 0, 0)
    lastClosedEnd = new Date(currentYear, currentMonth, card.billingDay, 23, 59, 59)
    lastClosedPaymentDue = getPaymentDueDate(lastClosedEnd, card.paymentDay)
  } else {
    // Todavía no llega el corte de este mes
    // Período cerrado: de hace 2 meses al corte del mes pasado
    lastClosedStart = new Date(currentYear, currentMonth - 2, card.billingDay + 1, 0, 0, 0)
    lastClosedEnd = new Date(currentYear, currentMonth - 1, card.billingDay, 23, 59, 59)
    lastClosedPaymentDue = getPaymentDueDate(lastClosedEnd, card.paymentDay)
  }

  // Calcular el período ACTUAL en curso (el que aún no cierra)
  let currentPeriodStart: Date
  let currentPeriodEnd: Date
  let currentPeriodPaymentDue: Date

  if (currentDay > card.billingDay) {
    // Ya pasamos el corte, estamos en el nuevo período
    currentPeriodStart = new Date(currentYear, currentMonth, card.billingDay + 1, 0, 0, 0)
    currentPeriodEnd = new Date(currentYear, currentMonth + 1, card.billingDay, 23, 59, 59)
    currentPeriodPaymentDue = getPaymentDueDate(currentPeriodEnd, card.paymentDay)
  } else {
    // Todavía no llega el corte, estamos en el período que cerrará pronto
    currentPeriodStart = new Date(currentYear, currentMonth - 1, card.billingDay + 1, 0, 0, 0)
    currentPeriodEnd = new Date(currentYear, currentMonth, card.billingDay, 23, 59, 59)
    currentPeriodPaymentDue = getPaymentDueDate(currentPeriodEnd, card.paymentDay)
  }

  // Verificar si el último período cerrado tiene gastos sin pagar
  const unpaidFromLastPeriod = await prisma.expense.count({
    where: {
      userId: user.id,
      creditCardId: id,
      date: {
        gte: lastClosedStart,
        lte: lastClosedEnd,
      },
      isPaidOff: false,
    },
  })

  // Decidir qué período mostrar: si hay gastos sin pagar del período cerrado, mostrar ese
  // Si no, mostrar el período en curso
  let billingStartDate: Date
  let billingEndDate: Date
  let paymentDueDate: Date

  if (unpaidFromLastPeriod > 0 && currentDay > card.billingDay) {
    // Mostrar el período cerrado que aún no se ha pagado
    billingStartDate = lastClosedStart
    billingEndDate = lastClosedEnd
    paymentDueDate = lastClosedPaymentDue
  } else {
    // Mostrar el período en curso
    billingStartDate = currentPeriodStart
    billingEndDate = currentPeriodEnd
    paymentDueDate = currentPeriodPaymentDue
  }

  // Obtener gastos del periodo (solo los no pagados)
  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: {
        gte: billingStartDate,
        lte: billingEndDate,
      },
      isPaidOff: false, // Solo gastos no pagados
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
      paymentDueDate: paymentDueDate.toISOString(),
    },
    expenses,
  }
})
