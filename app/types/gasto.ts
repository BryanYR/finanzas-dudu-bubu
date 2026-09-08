import type { Category } from '#types/categoria'
import type { CreditCard } from '#types/tarjeta'

export interface Expense {
  id: number
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  paymentMethod: string
  notes?: string
  categoryId: number
  creditCardId?: number
  installments?: number
  installmentAmount?: number
  totalWithInterest?: number
  category: Category
  creditCard?: CreditCard
}

export interface ExpenseInput {
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  categoryId: number
  paymentMethod: string
  creditCardId?: number
  installments?: number
  installmentAmount?: number
  totalWithInterest?: number
  notes?: string
}
