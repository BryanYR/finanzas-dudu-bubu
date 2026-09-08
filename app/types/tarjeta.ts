export interface CreditCard {
  id: number
  name: string
  bank: string
  lastDigits: string
  creditLimit: number
  billingDay: number
  paymentDay: number
  interestRate?: number
  /** { "2": 15.806, "3": 19.156, ... } — % interés total sobre capital por n cuotas */
  installmentFees?: Record<string, number> | null
  /** Saldo previo / cuotas en curso que el banco reporta como usado y no viene de un Expense */
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
  paymentDueDate: string
}

export interface CardPayment {
  id: number
  amount: number
  date: string
  description: string
  category: {
    id: number
    name: string
    color: string | null
  } | null
}
