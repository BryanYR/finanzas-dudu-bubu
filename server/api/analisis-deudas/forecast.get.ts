import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const MONTH_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const months = Math.min(24, Math.max(3, Number(query.months) || 12))

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const [
    recurringIncomes,
    recurringExpenses,
    futureInstallments,
    thisMonthIncome,
    thisMonthCashExpenses,
    recentCCExpenses,
  ] = await Promise.all([
    prisma.income.findMany({ where: { userId: user.id, isRecurring: true } }),
    prisma.expense.findMany({ where: { userId: user.id, isRecurring: true } }),
    prisma.debtInstallment.findMany({
      where: {
        debt: { userId: user.id },
        status: { in: ['pending', 'overdue'] },
      },
      include: { debt: { select: { id: true, name: true, monthlyPayment: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.income.findMany({ where: { userId: user.id, date: { gte: startOfMonth, lte: now } } }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: startOfMonth, lte: now }, creditCardId: null },
    }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        creditCardId: { not: null },
        date: { gte: threeMonthsAgo, lte: now },
      },
    }),
  ])

  // Current balance = income received this month - cash expenses paid this month.
  // income.amount / expense.amount / instalment.amount / debt.monthlyPayment vienen
  // de la BD como Prisma.Decimal; Number(...) los normaliza para poder sumar con
  // aritmética JS (`+` concatena strings si se deja un Decimal sin convertir).
  const currentBalance =
    thisMonthIncome.reduce((s, i) => s + Number(i.amount), 0) -
    thisMonthCashExpenses.reduce((s, e) => s + Number(e.amount), 0)

  const monthlyRecurringIncome = recurringIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const monthlyRecurringExpenses = recurringExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const monthlyCardEstimate = recentCCExpenses.reduce((s, e) => s + Number(e.amount), 0) / 3

  // Group installments by yearMonth key
  const installmentsByMonth = new Map<string, number>()
  for (const inst of futureInstallments) {
    const d = new Date(inst.dueDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    installmentsByMonth.set(key, (installmentsByMonth.get(key) ?? 0) + Number(inst.amount))
  }

  // Determine last installment per debt (for "freed" calculation)
  const debtLastMonth = new Map<
    number,
    { name: string; lastDueDate: Date; monthlyPayment: number }
  >()
  for (const inst of futureInstallments) {
    const dueDate = new Date(inst.dueDate)
    const existing = debtLastMonth.get(inst.debtId)
    if (!existing || dueDate > existing.lastDueDate) {
      debtLastMonth.set(inst.debtId, {
        name: inst.debt.name,
        lastDueDate: dueDate,
        monthlyPayment: Number(inst.debt.monthlyPayment),
      })
    }
  }

  const debtsFreed = Array.from(debtLastMonth.values())
    .map((info) => {
      const d = info.lastDueDate
      return {
        name: info.name,
        yearMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        monthlyRelief: info.monthlyPayment,
      }
    })
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))

  // Build monthly forecast
  let runningBalance = currentBalance
  const monthsResult = []

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`
    const isCurrentMonth = i === 0

    const income = monthlyRecurringIncome
    const debtPayments = installmentsByMonth.get(yearMonth) ?? 0
    const cardEst = isCurrentMonth ? 0 : Number(monthlyCardEstimate.toFixed(2))
    const recurringExp = isCurrentMonth ? 0 : monthlyRecurringExpenses
    const totalExpenses = debtPayments + cardEst + recurringExp
    const netBalance = income - totalExpenses

    // For current month: runningBalance stays as currentBalance (already reflects actual state)
    // For future months: add net to running total
    if (!isCurrentMonth) {
      runningBalance += netBalance
    }

    const debtsCompletingThisMonth = debtsFreed
      .filter((d) => d.yearMonth === yearMonth)
      .map((d) => d.name)

    monthsResult.push({
      yearMonth,
      label: `${MONTH_SHORT_ES[month]} ${year}`,
      fullLabel: `${MONTH_NAMES_ES[month]} ${year}`,
      income,
      debtPayments: Number(debtPayments.toFixed(2)),
      cardEstimate: cardEst,
      recurringExpenses: Number(recurringExp.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      runningBalance: Number(runningBalance.toFixed(2)),
      isCurrentMonth,
      debtsCompletingThisMonth,
    })
  }

  return {
    months: monthsResult,
    debtsFreed,
    currentBalance: Number(currentBalance.toFixed(2)),
  }
})
