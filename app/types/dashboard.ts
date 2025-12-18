export interface User {
  id: number
  name: string
  email: string
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  incomeCount: number
  expenseCount: number
  cashExpenses: number
  debitExpenses: number
  creditExpenses: number
  savingsGoals: number
  totalSavings: number
}
