import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  // Obtener fecha del mes actual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Obtener ingresos del mes
  const incomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Obtener gastos del mes
  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  // Obtener metas de ahorro activas
  const savingsGoals = await prisma.savingsGoal.findMany({
    where: {
      userId: user.id,
      isCompleted: false,
    },
  })

  // Calcular totales
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Gastos por método de pago
  const cashExpenses = expenses
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0)

  const debitExpenses = expenses
    .filter((e) => e.paymentMethod === 'debit')
    .reduce((sum, e) => sum + e.amount, 0)

  const creditExpenses = expenses
    .filter((e) => e.paymentMethod === 'credit')
    .reduce((sum, e) => sum + e.amount, 0)

  // Total ahorrado en metas activas
  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)

  return {
    totalIncome,
    totalExpenses,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    cashExpenses,
    debitExpenses,
    creditExpenses,
    savingsGoals: savingsGoals.length,
    totalSavings,
  }
})
