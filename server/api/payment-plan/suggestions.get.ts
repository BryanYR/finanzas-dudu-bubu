import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  // Obtener fecha del mes actual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Obtener ingresos mensuales recurrentes
  const recurringIncomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      isRecurring: true,
    },
  })

  // Obtener ingresos del mes actual
  const monthlyIncomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Obtener deudas activas
  const activeDebts = await prisma.debt.findMany({
    where: {
      userId: user.id,
      isPaid: false,
    },
  })

  // Obtener tarjetas activas con gastos del mes
  const creditCards = await prisma.creditCard.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      expenses: {
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
    },
  })

  // Obtener gastos fijos recurrentes
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      isRecurring: true,
    },
    include: {
      category: true,
    },
  })

  // Calcular total de ingresos mensuales
  const totalRecurringIncome = recurringIncomes.reduce((sum, inc) => sum + inc.amount, 0)
  const totalMonthlyIncome = monthlyIncomes.reduce((sum, inc) => sum + inc.amount, 0)
  const totalIncome = totalRecurringIncome + totalMonthlyIncome

  // Calcular saldo actual (últimos ingresos - gastos del mes)
  const monthlyExpenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const currentBalance = totalIncome - totalExpenses

  // Crear sugerencias de pago
  const suggestions: any[] = []

  // 1. Deudas - priorizar por tasa de interés y fecha de pago
  activeDebts.forEach((debt) => {
    // Usar el día de pago configurado en la deuda
    let dueDate = new Date(now.getFullYear(), now.getMonth(), debt.paymentDayOfMonth)

    // Si la fecha ya pasó este mes, usar el siguiente mes
    if (dueDate < now) {
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, debt.paymentDayOfMonth)
    }

    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
    if (daysUntilDue <= 3) priority = 'urgent'
    else if (daysUntilDue <= 7) priority = 'high'
    else if (debt.interestRate > 15) priority = 'high'

    // Fecha sugerida de pago: 2 días antes del vencimiento
    const suggestedDate = new Date(dueDate)
    suggestedDate.setDate(suggestedDate.getDate() - 2)

    // Si la fecha sugerida ya pasó, usar hoy
    const finalSuggestedDate = suggestedDate < now ? now : suggestedDate

    suggestions.push({
      id: `debt-${debt.id}`,
      type: 'debt',
      name: debt.name,
      amount: debt.monthlyPayment,
      dueDate: dueDate.toISOString(),
      priority,
      reason:
        priority === 'urgent'
          ? 'Vence en menos de 3 días'
          : priority === 'high' && debt.interestRate > 15
            ? `Alta tasa de interés (${debt.interestRate}%)`
            : 'Pago mensual regular',
      interestRate: debt.interestRate,
      remainingBalance: debt.remainingAmount,
      suggestedPaymentDate: finalSuggestedDate.toISOString(),
    })
  })

  // 2. Tarjetas de crédito - calcular monto y fecha de pago
  creditCards.forEach((card) => {
    const totalCardExpenses = card.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    if (totalCardExpenses === 0) return

    // Usar el día de pago configurado en la tarjeta
    let paymentDate = new Date(now.getFullYear(), now.getMonth(), card.paymentDay)

    // Si la fecha ya pasó este mes, usar el siguiente mes
    if (paymentDate < now) {
      paymentDate = new Date(now.getFullYear(), now.getMonth() + 1, card.paymentDay)
    }

    const daysUntilDue = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
    if (daysUntilDue <= 3) priority = 'urgent'
    else if (daysUntilDue <= 7) priority = 'high'

    // Fecha sugerida de pago: 2 días antes del vencimiento
    const suggestedDate = new Date(paymentDate)
    suggestedDate.setDate(suggestedDate.getDate() - 2)

    // Si la fecha sugerida ya pasó, usar hoy
    const finalSuggestedDate = suggestedDate < now ? now : suggestedDate

    suggestions.push({
      id: `card-${card.id}`,
      type: 'creditCard',
      name: `${card.name} - ${card.bank}`,
      amount: totalCardExpenses,
      dueDate: paymentDate.toISOString(),
      priority,
      reason:
        priority === 'urgent'
          ? 'Vence en menos de 3 días - Evita intereses'
          : priority === 'high'
            ? 'Vence pronto - Paga antes para evitar intereses'
            : 'Pago de tarjeta de crédito',
      interestRate: card.interestRate,
      suggestedPaymentDate: finalSuggestedDate.toISOString(),
    })
  })

  // 3. Gastos fijos recurrentes
  recurringExpenses.forEach((expense) => {
    // Usar el día del mes de la fecha original del gasto
    const expenseDate = new Date(expense.date)
    let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), expenseDate.getDate())

    // Si la fecha ya pasó este mes, usar el siguiente mes
    if (nextPaymentDate < now) {
      nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, expenseDate.getDate())
    }

    const daysUntilDue = Math.ceil(
      (nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
    if (daysUntilDue <= 3) priority = 'urgent'
    else if (daysUntilDue <= 7) priority = 'high'
    else if (expense.category.name.toLowerCase().includes('servicios')) priority = 'high'

    // Fecha sugerida de pago: 1 día antes del vencimiento
    const suggestedDate = new Date(nextPaymentDate)
    suggestedDate.setDate(suggestedDate.getDate() - 1)

    // Si la fecha sugerida ya pasó, usar hoy
    const finalSuggestedDate = suggestedDate < now ? now : suggestedDate

    suggestions.push({
      id: `expense-${expense.id}`,
      type: 'expense',
      name: expense.description,
      amount: expense.amount,
      dueDate: nextPaymentDate.toISOString(),
      priority,
      reason:
        priority === 'urgent'
          ? 'Servicio esencial - No retrasar'
          : expense.category.name.toLowerCase().includes('servicios')
            ? 'Servicio básico - Priorizar para evitar cortes'
            : 'Gasto fijo mensual',
      suggestedPaymentDate: finalSuggestedDate.toISOString(),
    })
  })

  // Ordenar sugerencias por prioridad y fecha
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 99
    const bPriority = priorityOrder[b.priority] ?? 99
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Calcular totales
  const totalObligations = suggestions.reduce((sum, s) => sum + s.amount, 0)
  const suggestedSafetyBuffer = totalIncome * 0.1 // 10% de los ingresos como colchón
  const availableBalance = currentBalance - suggestedSafetyBuffer

  // Determinar estado del flujo de caja
  let cashFlowStatus: 'healthy' | 'tight' | 'deficit'
  if (availableBalance > totalObligations * 1.2) cashFlowStatus = 'healthy'
  else if (availableBalance > totalObligations) cashFlowStatus = 'tight'
  else cashFlowStatus = 'deficit'

  // Generar advertencias
  const warnings: string[] = []
  if (cashFlowStatus === 'deficit') {
    warnings.push(
      '⚠️ Tus obligaciones superan tu saldo disponible. Considera posponer gastos no esenciales.'
    )
  }
  if (currentBalance < suggestedSafetyBuffer) {
    warnings.push('⚠️ Tu saldo está por debajo del colchón de seguridad recomendado.')
  }
  if (suggestions.filter((s) => s.priority === 'urgent').length > 3) {
    warnings.push('⚠️ Tienes varios pagos urgentes. Prioriza los de mayor tasa de interés.')
  }

  // Proyección de flujo de caja simplificada (próximos 30 días)
  const cashFlowProjection: any[] = []
  let runningBalance = currentBalance

  for (let i = 0; i < 30; i++) {
    const projectionDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const dayPayments = suggestions.filter((s) => {
      const suggDate = new Date(s.suggestedPaymentDate)
      return suggDate.toDateString() === projectionDate.toDateString()
    })

    const dayExpenses = dayPayments.reduce((sum, p) => sum + p.amount, 0)
    runningBalance -= dayExpenses

    if (dayPayments.length > 0) {
      cashFlowProjection.push({
        date: projectionDate.toISOString().split('T')[0],
        income: 0,
        expenses: dayExpenses,
        balance: runningBalance,
        payments: dayPayments,
      })
    }
  }

  return {
    summary: {
      totalIncome,
      totalObligations,
      availableBalance,
      currentBalance,
      suggestedSafetyBuffer,
      cashFlowStatus,
      warnings,
    },
    suggestions,
    cashFlowProjection,
  }
})
