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
  category: Category
  creditCard?: CreditCard
}
