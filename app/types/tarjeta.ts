export interface CreditCard {
  id: number
  name: string
  bank: string
  lastDigits: string
  creditLimit: number
  billingDay: number
  paymentDay: number
  interestRate?: number
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
  transactionCount: number
  creditUsagePercent: number
  availableCredit: number
  paymentDueDate: string
}
