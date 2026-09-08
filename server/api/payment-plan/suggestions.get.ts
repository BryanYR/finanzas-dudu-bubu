import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { getCurrentBalance } from '@server/utils/cash-flow'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  // Obtener fecha del mes actual y siguiente
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

  // Obtener ingresos mensuales recurrentes (como sueldo)
  const recurringIncomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      isRecurring: true,
    },
  })

  // Obtener ingresos que ya se recibieron este mes
  const receivedIncomesThisMonth = await prisma.income.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: now, // Solo hasta hoy
      },
    },
  })

  // Calcular saldo actual real (ingresos recibidos - solo gastos en efectivo/débito).
  // Extraído a server/utils/cash-flow.ts para reutilizarlo también en
  // budgets/calculate.post.ts.
  const currentBalance = await getCurrentBalance(user.id)

  // Calcular ingresos proyectados para el resto del mes (ingresos recurrentes pendientes)
  const totalRecurringIncome = recurringIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0)

  // Verificar si ya se recibieron los ingresos recurrentes este mes
  const receivedRecurringThisMonth = receivedIncomesThisMonth.filter((inc) => inc.isRecurring)
  const pendingRecurringIncome = receivedRecurringThisMonth.length === 0 ? totalRecurringIncome : 0

  // Total disponible = saldo actual + ingresos pendientes del mes
  const projectedAvailableBalance = currentBalance + pendingRecurringIncome

  // Obtener deudas activas con sus cuotas
  const activeDebts = await prisma.debt.findMany({
    where: {
      userId: user.id,
      isPaid: false,
    },
    include: {
      installments: {
        where: {
          OR: [{ status: 'pending' }, { status: 'overdue' }],
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 2, // Obtener las próximas 2 cuotas pendientes
      },
    },
  })

  // Obtener tarjetas activas
  const creditCards = await prisma.creditCard.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
  })

  // Para cada tarjeta, calcular el estado de cuenta actual usando la misma lógica que statement.get.ts
  const cardStatements = await Promise.all(
    creditCards.map(async (card) => {
      const currentDay = now.getDate()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Función auxiliar para calcular la fecha de pago basada en la fecha de corte
      const getPaymentDueDate = (billingEndDate: Date, paymentDay: number): Date => {
        const billingEndMonth = billingEndDate.getMonth()
        const billingEndYear = billingEndDate.getFullYear()
        const billingDay = billingEndDate.getDate()

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
        lastClosedStart = new Date(currentYear, currentMonth - 1, card.billingDay + 1, 0, 0, 0)
        lastClosedEnd = new Date(currentYear, currentMonth, card.billingDay, 23, 59, 59)
        lastClosedPaymentDue = getPaymentDueDate(lastClosedEnd, card.paymentDay)
      } else {
        // Todavía no llega el corte de este mes
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

      // Verificar si hay gastos sin pagar del período cerrado
      const unpaidFromLastPeriod = await prisma.expense.count({
        where: {
          userId: user.id,
          creditCardId: card.id,
          date: {
            gte: lastClosedStart,
            lte: lastClosedEnd,
          },
          isPaidOff: false,
        },
      })

      // Decidir qué período mostrar
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

      // Obtener gastos del periodo (solo no pagados)
      const expenses = await prisma.expense.findMany({
        where: {
          userId: user.id,
          creditCardId: card.id,
          date: {
            gte: billingStartDate,
            lte: billingEndDate,
          },
          isPaidOff: false, // Solo gastos no pagados
        },
      })

      const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

      return {
        card,
        totalAmount,
        paymentDueDate,
        billingEndDate,
      }
    })
  )

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

  // Crear sugerencias de pago
  const suggestions: any[] = []

  // 1. Deudas - usar cuotas programadas
  activeDebts.forEach((debt) => {
    // Obtener la próxima cuota pendiente
    const nextInstallment = debt.installments?.[0]

    if (!nextInstallment) return // No hay cuotas pendientes

    const dueDate = new Date(nextInstallment.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Determinar prioridad
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
    let reason = 'Pago mensual regular'

    if (nextInstallment.status === 'overdue') {
      priority = 'urgent'
      reason = '🚨 VENCIDA - Paga inmediatamente para evitar más cargos'
    } else if (daysUntilDue <= 3) {
      priority = 'urgent'
      reason = '⚠️ Vence en menos de 3 días'
    } else if (daysUntilDue <= 7) {
      priority = 'high'
      reason = 'Vence esta semana'
    } else if (debt.interestRate > 15) {
      priority = 'high'
      reason = `Alta tasa de interés (${debt.interestRate}%)`
    }

    // Fecha sugerida de pago: 2 días antes del vencimiento
    const suggestedDate = new Date(dueDate)
    suggestedDate.setDate(suggestedDate.getDate() - 2)

    // Si la fecha sugerida ya pasó, usar hoy
    const finalSuggestedDate = suggestedDate < now ? now : suggestedDate

    suggestions.push({
      id: `debt-${debt.id}-installment-${nextInstallment.id}`,
      type: 'debt',
      name: `${debt.name} - Cuota ${nextInstallment.installmentNumber}/${debt.totalInstallments}`,
      amount: Number(nextInstallment.amount),
      dueDate: dueDate.toISOString(),
      priority,
      reason,
      interestRate: debt.interestRate,
      remainingBalance: Number(debt.remainingAmount),
      suggestedPaymentDate: finalSuggestedDate.toISOString(),
      installmentNumber: nextInstallment.installmentNumber,
      installmentId: nextInstallment.id,
    })
  })

  // 2. Tarjetas de crédito - usar el cálculo correcto del ciclo
  cardStatements.forEach(({ card, totalAmount, paymentDueDate }) => {
    if (totalAmount === 0) return

    const daysUntilDue = Math.ceil(
      (paymentDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
    if (daysUntilDue <= 3) priority = 'urgent'
    else if (daysUntilDue <= 7) priority = 'high'
    else if (daysUntilDue <= 14) priority = 'medium'
    else priority = 'low'

    // Fecha sugerida de pago: 2-3 días antes del vencimiento
    const suggestedDate = new Date(paymentDueDate)
    suggestedDate.setDate(suggestedDate.getDate() - 2)

    // Si la fecha sugerida ya pasó, usar hoy
    const finalSuggestedDate = suggestedDate < now ? now : suggestedDate

    suggestions.push({
      id: `card-${card.id}`,
      type: 'creditCard',
      name: `${card.name} - ${card.bank}`,
      amount: totalAmount,
      dueDate: paymentDueDate.toISOString(),
      priority,
      reason:
        priority === 'urgent'
          ? '🚨 Vence en menos de 3 días - Paga YA para evitar intereses y cargos'
          : priority === 'high'
            ? '⚠️ Vence pronto - Programa el pago antes para evitar intereses'
            : `Pago de tarjeta - Ciclo cierra y se debe pagar antes del vencimiento`,
      interestRate: card.interestRate,
      remainingBalance: totalAmount,
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
      amount: Number(expense.amount),
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
  const totalReceivedIncome = receivedIncomesThisMonth.reduce(
    (sum, inc) => sum + Number(inc.amount),
    0
  )
  const totalIncome = totalReceivedIncome + pendingRecurringIncome
  const totalObligations = suggestions.reduce((sum, s) => sum + s.amount, 0)
  const suggestedSafetyBuffer = totalIncome * 0.1 // 10% de los ingresos como colchón
  const availableAfterObligations = projectedAvailableBalance - totalObligations

  // Determinar estado del flujo de caja
  let cashFlowStatus: 'healthy' | 'tight' | 'deficit'
  if (availableAfterObligations > suggestedSafetyBuffer) cashFlowStatus = 'healthy'
  else if (availableAfterObligations >= 0) cashFlowStatus = 'tight'
  else cashFlowStatus = 'deficit'

  // Generar advertencias inteligentes
  const warnings: string[] = []

  if (cashFlowStatus === 'deficit') {
    const deficit = Math.abs(availableAfterObligations)
    warnings.push(
      `🚨 ALERTA: Te faltan ${new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(deficit)} para cubrir todas tus obligaciones. Prioriza pagos urgentes.`
    )
  }

  if (pendingRecurringIncome > 0) {
    warnings.push(
      `💰 Tienes ${new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(pendingRecurringIncome)} de ingresos pendientes por recibir este mes (considerado en el plan).`
    )
  }

  if (cashFlowStatus === 'tight') {
    warnings.push(
      '⚠️ Tu flujo de caja está ajustado. Evita gastos innecesarios hasta recibir más ingresos.'
    )
  }

  if (currentBalance < suggestedSafetyBuffer && cashFlowStatus !== 'deficit') {
    warnings.push(
      `💡 Tu saldo actual está por debajo del colchón de seguridad recomendado (${new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(suggestedSafetyBuffer)}).`
    )
  }
  if (suggestions.filter((s) => s.priority === 'urgent').length > 3) {
    warnings.push('⚠️ Tienes varios pagos urgentes. Prioriza los de mayor tasa de interés.')
  }

  const highInterestDebts = suggestions.filter(
    (s) => s.type === 'debt' && s.interestRate && s.interestRate > 20
  )
  if (highInterestDebts.length > 0) {
    warnings.push(
      `🔥 Tienes ${highInterestDebts.length} deuda(s) con interés mayor al 20%. Considera pagarlas prioritariamente.`
    )
  }

  // Proyección de flujo de caja mejorada (próximos 30 días)
  const cashFlowProjection: any[] = []
  let runningBalance = currentBalance

  // Agregar ingresos pendientes a la proyección
  if (pendingRecurringIncome > 0) {
    // Asumir que el ingreso recurrente llega a mitad/fin de mes
    const estimatedIncomeDate = new Date(now.getFullYear(), now.getMonth(), 25)
    if (estimatedIncomeDate > now) {
      cashFlowProjection.push({
        date: estimatedIncomeDate.toISOString().split('T')[0],
        income: pendingRecurringIncome,
        expenses: 0,
        balance: runningBalance + pendingRecurringIncome,
        payments: [],
        type: 'income',
      })
      runningBalance += pendingRecurringIncome
    }
  }

  // Proyectar pagos
  for (let i = 0; i <= 30; i++) {
    const projectionDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const dayPayments = suggestions.filter((s) => {
      const suggDate = new Date(s.suggestedPaymentDate)
      return suggDate.toDateString() === projectionDate.toDateString()
    })

    if (dayPayments.length > 0) {
      const dayExpenses = dayPayments.reduce((sum, p) => sum + p.amount, 0)
      runningBalance -= dayExpenses

      cashFlowProjection.push({
        date: projectionDate.toISOString().split('T')[0],
        income: 0,
        expenses: dayExpenses,
        balance: runningBalance,
        payments: dayPayments,
        type: 'expense',
      })
    }
  }

  // Ordenar proyección por fecha
  cashFlowProjection.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    summary: {
      totalIncome,
      totalObligations,
      availableBalance: projectedAvailableBalance,
      currentBalance,
      suggestedSafetyBuffer,
      cashFlowStatus,
      warnings,
      pendingIncome: pendingRecurringIncome,
      projectedBalance: availableAfterObligations,
    },
    suggestions,
    cashFlowProjection,
  }
})
