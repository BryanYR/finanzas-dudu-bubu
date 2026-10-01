import { prisma } from '@server/utils/db'

// Lima es UTC-5 fijo (sin horario de verano). El server corre en UTC (Vercel), así que
// sin esto, desde las 19:00 hora Lima del último día del mes el dashboard ya mira el mes
// siguiente. Las fechas se guardan como medianoche Lima (05:00Z), igual que estos límites.
const LIMA_OFFSET_HOURS = 5

/** Rango [inicio, fin) del mes calendario actual en hora Lima, como instantes UTC. */
function currentLimaMonthRange(now = new Date()) {
  const lima = new Date(now.getTime() - LIMA_OFFSET_HOURS * 60 * 60 * 1000)
  const year = lima.getUTCFullYear()
  const month = lima.getUTCMonth()
  return {
    startOfMonth: new Date(Date.UTC(year, month, 1, LIMA_OFFSET_HOURS)),
    startOfNextMonth: new Date(Date.UTC(year, month + 1, 1, LIMA_OFFSET_HOURS)),
  }
}

export async function getMonthlyStats(userId: number) {
  const { startOfMonth, startOfNextMonth } = currentLimaMonthRange()
  const monthRange = { gte: startOfMonth, lt: startOfNextMonth }

  const [incomes, expenses, savingsGoals] = await Promise.all([
    prisma.income.findMany({ where: { userId, date: monthRange } }),
    prisma.expense.findMany({ where: { userId, date: monthRange } }),
    prisma.savingsGoal.findMany({ where: { userId, isCompleted: false } }),
  ])

  // income.amount / expense.amount / goal.currentAmount vienen de la BD como
  // Prisma.Decimal; Number(...) los normaliza para poder sumar con aritmética JS.
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return {
    totalIncome,
    totalExpenses,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    cashExpenses: expenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + Number(e.amount), 0),
    debitExpenses: expenses
      .filter((e) => e.paymentMethod === 'debit')
      .reduce((sum, e) => sum + Number(e.amount), 0),
    creditExpenses: expenses
      .filter((e) => e.paymentMethod === 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0),
    savingsGoals: savingsGoals.length,
    totalSavings: savingsGoals.reduce((sum, g) => sum + Number(g.currentAmount), 0),
  }
}
