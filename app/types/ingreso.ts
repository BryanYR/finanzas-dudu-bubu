import type { Category } from '#types/categoria'

export interface Income {
  id: number
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  categoryId: number
  category: Category
  notes?: string
  userId: number
  createdAt: string
  updatedAt: string
}
