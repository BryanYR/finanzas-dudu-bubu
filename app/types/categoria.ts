export type CategoryType = 'income' | 'expense'

export interface Category {
  id: number
  name: string
  type: CategoryType
  icon?: string
  color?: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}
