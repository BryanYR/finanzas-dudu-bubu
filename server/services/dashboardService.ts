import { prisma } from '@server/utils/db'

export async function getMonthlyStats(userId: number) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [incomes, expenses, savingsGoals] = await Promise.all([
    prisma.income.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.savingsGoal.findMany({ where: { userId, isCompleted: false } }),
  ])

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    totalIncome,
    totalExpenses,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    cashExpenses: expenses.filter((e) => e.paymentMethod === 'cash').reduce((sum, e) => sum + e.amount, 0),
    debitExpenses: expenses.filter((e) => e.paymentMethod === 'debit').reduce((sum, e) => sum + e.amount, 0),
    creditExpenses: expenses.filter((e) => e.paymentMethod === 'credit').reduce((sum, e) => sum + e.amount, 0),
    savingsGoals: savingsGoals.length,
    totalSavings: savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0),
  }
}
