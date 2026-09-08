export interface CreditCard {
  id: number
  name: string
  bank: string
  lastDigits: string
  creditLimit: number
  billingDay: number
  paymentDay: number
  interestRate?: number
  carriedBalance?: number
  isActive: boolean
  userId?: number
  createdAt?: string
  updatedAt?: string
  _count?: {
    expenses: number
  }
}

export interface CardStatement {
  totalAmount: number
  periodExpensesAmount: number
  carriedBalance: number
  transactionCount: number
  creditUsagePercent: number
  availableCredit: number
  billingEndDate: string
  paymentDueDate: string
}
