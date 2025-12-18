export interface SavingsGoal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  isCompleted: boolean
  userId: number
  createdAt: string
  updatedAt: string
  _count?: {
    contributions: number
  }
}
