import { prisma } from '@server/utils/db'
import { resolveActiveBillingPeriod } from './creditCardService'
import type { PaymentSuggestion, CashFlowDay } from '#types/planificacion'

const formatUSD = (amount: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount)

type Priority = 'urgent' | 'high' | 'medium' | 'low'
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function suggestedDate(dueDate: Date, now: Date, daysBefore = 2): Date {
  const candidate = new Date(dueDate)
  candidate.setDate(candidate.getDate() - daysBefore)
  return candidate < now ? new Date(now) : candidate
}

/**
 * Estimates the next expected date for a recurring income based on its historical date and frequency.
 * Falls back to day 25 of current/next month if no reliable pattern.
 */
function estimateNextIncomeDate(
  recurringIncomes: Array<{ date: Date; frequency: string | null }>,
  now: Date,
): Date | null {
  // Pick first monthly (or unspecified frequency) recurring income as reference
  const ref = recurringIncomes.find(
    (i) => i.frequency === 'monthly' || i.frequency === null,
  ) ?? recurringIncomes[0]

  const dayOfMonth = ref ? new Date(ref.date).getDate() : 25
  const candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  return candidate > now
    ? candidate
    : new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
}

export async function getPaymentSuggestions(userId: number) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [recurringIncomes, receivedIncomesThisMonth, expensesThisMonth, activeDebts, creditCards, recurringExpenses] =
    await Promise.all([
      prisma.income.findMany({ where: { userId, isRecurring: true } }),
      prisma.income.findMany({ where: { userId, date: { gte: startOfMonth, lte: now } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lte: now }, creditCardId: null } }),
      prisma.debt.findMany({
        where: { userId, isPaid: false },
        include: {
          installments: {
            where: { OR: [{ status: 'pending' }, { status: 'overdue' }] },
            orderBy: { dueDate: 'asc' },
            take: 2,
          },
        },
      }),
      prisma.creditCard.findMany({ where: { userId, isActive: true } }),
      prisma.expense.findMany({ where: { userId, isRecurring: true }, include: { category: true } }),
    ])

  const totalReceivedIncome = receivedIncomesThisMonth.reduce((sum, i) => sum + i.amount, 0)
  const totalSpentCashDebit = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0)
  const currentBalance = totalReceivedIncome - totalSpentCashDebit

  const totalRecurringIncome = recurringIncomes.reduce((sum, i) => sum + i.amount, 0)
  // Compare amount received vs total expected — more accurate than counting entries
  const receivedRecurringAmount = receivedIncomesThisMonth
    .filter((i) => i.isRecurring)
    .reduce((sum, i) => sum + i.amount, 0)
  const pendingRecurringIncome = Math.max(0, totalRecurringIncome - receivedRecurringAmount)
  const projectedAvailableBalance = currentBalance + pendingRecurringIncome

  const suggestions: PaymentSuggestion[] = []

  // 1. Deudas
  for (const debt of activeDebts) {
    const nextInstallment = debt.installments?.[0]
    if (!nextInstallment) continue

    const dueDate = new Date(nextInstallment.dueDate)
    const daysUntilDue = daysBetween(dueDate, now)

    let priority: Priority = 'medium'
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

    suggestions.push({
      id: `debt-${debt.id}-installment-${nextInstallment.id}`,
      type: 'debt',
      name: `${debt.name} - Cuota ${nextInstallment.installmentNumber}/${debt.totalInstallments}`,
      amount: nextInstallment.amount,
      dueDate: dueDate.toISOString(),
      priority,
      reason,
      interestRate: debt.interestRate,
      remainingBalance: debt.remainingAmount,
      suggestedPaymentDate: suggestedDate(dueDate, now).toISOString(),
      installmentNumber: nextInstallment.installmentNumber,
      installmentId: nextInstallment.id,
    })
  }

  // 2. Tarjetas de crédito
  const cardStatements = await Promise.all(
    creditCards.map(async (card) => {
      const period = await resolveActiveBillingPeriod(card, userId, now)
      const expenses = await prisma.expense.findMany({
        where: { userId, creditCardId: card.id, date: { gte: period.billingStartDate, lte: period.billingEndDate }, isPaidOff: false },
      })
      // For cuota expenses use installmentAmount (real monthly cost with interest) when available;
      // otherwise fall back to amount / installments, or amount for single-payment expenses.
      const totalAmount = expenses.reduce((sum, e) => {
        if (e.installments && e.installments > 1) {
          return sum + (e.installmentAmount ?? e.amount / e.installments)
        }
        return sum + e.amount
      }, 0)
      return { card, totalAmount, paymentDueDate: period.paymentDueDate }
    }),
  )

  for (const { card, totalAmount, paymentDueDate } of cardStatements) {
    if (totalAmount === 0) continue
    const daysUntilDue = daysBetween(paymentDueDate, now)
    const priority: Priority = daysUntilDue <= 3 ? 'urgent' : daysUntilDue <= 7 ? 'high' : daysUntilDue <= 14 ? 'medium' : 'low'

    suggestions.push({
      id: `card-${card.id}`,
      type: 'creditCard',
      name: `${card.name} - ${card.bank}`,
      amount: totalAmount,
      dueDate: paymentDueDate.toISOString(),
      priority,
      reason:
        priority === 'urgent'
          ? '🚨 Vence en menos de 3 días - Paga YA para evitar intereses'
          : priority === 'high'
            ? '⚠️ Vence pronto - Programa el pago para evitar intereses'
            : 'Pago de tarjeta de crédito',
      interestRate: card.interestRate,
      remainingBalance: totalAmount,
      suggestedPaymentDate: suggestedDate(paymentDueDate, now).toISOString(),
    })
  }

  // 3. Gastos fijos recurrentes
  for (const expense of recurringExpenses) {
    const expenseDate = new Date(expense.date)
    let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), expenseDate.getDate())
    if (nextPaymentDate < now) {
      nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, expenseDate.getDate())
    }

    const daysUntilDue = daysBetween(nextPaymentDate, now)
    const isEssential = expense.category.name.toLowerCase().includes('servicios')

    let priority: Priority = 'medium'
    if (daysUntilDue <= 3) priority = 'urgent'
    else if (daysUntilDue <= 7 || isEssential) priority = 'high'

    suggestions.push({
      id: `expense-${expense.id}`,
      type: 'expense',
      name: expense.description,
      amount: expense.amount,
      dueDate: nextPaymentDate.toISOString(),
      priority,
      reason: isEssential ? 'Servicio básico - Priorizar para evitar cortes' : 'Gasto fijo mensual',
      suggestedPaymentDate: suggestedDate(nextPaymentDate, now, 1).toISOString(),
    })
  }

  suggestions.sort((a, b) => {
    const diff = (PRIORITY_ORDER[a.priority as Priority] ?? 99) - (PRIORITY_ORDER[b.priority as Priority] ?? 99)
    return diff !== 0 ? diff : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  const totalIncome = totalReceivedIncome + pendingRecurringIncome
  const totalObligations = suggestions.reduce((sum, s) => sum + s.amount, 0)
  const safetyBuffer = totalIncome * 0.1
  const availableAfterObligations = projectedAvailableBalance - totalObligations

  let cashFlowStatus: 'healthy' | 'tight' | 'deficit'
  if (availableAfterObligations > safetyBuffer) cashFlowStatus = 'healthy'
  else if (availableAfterObligations >= 0) cashFlowStatus = 'tight'
  else cashFlowStatus = 'deficit'

  const warnings: string[] = []

  if (cashFlowStatus === 'deficit') {
    warnings.push(`🚨 ALERTA: Te faltan ${formatUSD(Math.abs(availableAfterObligations))} para cubrir todas tus obligaciones.`)
  }
  if (pendingRecurringIncome > 0) {
    warnings.push(`💰 Tienes ${formatUSD(pendingRecurringIncome)} de ingresos pendientes por recibir este mes.`)
  }
  if (cashFlowStatus === 'tight') {
    warnings.push('⚠️ Tu flujo de caja está ajustado. Evita gastos innecesarios.')
  }
  if (currentBalance < safetyBuffer && cashFlowStatus !== 'deficit') {
    warnings.push(`💡 Tu saldo actual está por debajo del colchón recomendado (${formatUSD(safetyBuffer)}).`)
  }
  if (suggestions.filter((s) => s.priority === 'urgent').length > 3) {
    warnings.push('⚠️ Tienes varios pagos urgentes. Prioriza los de mayor tasa de interés.')
  }

  const highInterestDebts = suggestions.filter((s) => s.type === 'debt' && s.interestRate > 20)
  if (highInterestDebts.length > 0) {
    warnings.push(`🔥 Tienes ${highInterestDebts.length} deuda(s) con interés mayor al 20%.`)
  }

  // Proyección de flujo de caja (30 días)
  const cashFlowProjection: CashFlowDay[] = []
  let runningBalance = currentBalance

  if (pendingRecurringIncome > 0) {
    const estimatedIncomeDate = estimateNextIncomeDate(recurringIncomes, now)
    if (estimatedIncomeDate && estimatedIncomeDate > now) {
      runningBalance += pendingRecurringIncome
      cashFlowProjection.push({
        date: estimatedIncomeDate.toISOString().slice(0, 10),
        income: pendingRecurringIncome,
        expenses: 0,
        balance: runningBalance,
        payments: [],
        type: 'income',
      })
    }
  }

  for (let i = 0; i <= 30; i++) {
    const projectionDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const dayPayments = suggestions.filter((s) => {
      return new Date(s.suggestedPaymentDate).toDateString() === projectionDate.toDateString()
    })
    if (dayPayments.length > 0) {
      const dayExpenses = dayPayments.reduce((sum, p) => sum + p.amount, 0)
      runningBalance -= dayExpenses
      cashFlowProjection.push({
        date: projectionDate.toISOString().slice(0, 10),
        income: 0,
        expenses: dayExpenses,
        balance: runningBalance,
        payments: dayPayments,
        type: 'expense',
      })
    }
  }

  cashFlowProjection.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    summary: {
      totalIncome,
      totalObligations,
      availableBalance: projectedAvailableBalance,
      currentBalance,
      suggestedSafetyBuffer: safetyBuffer,
      cashFlowStatus,
      warnings,
      pendingIncome: pendingRecurringIncome,
      projectedBalance: availableAfterObligations,
    },
    suggestions,
    cashFlowProjection,
  }
}
