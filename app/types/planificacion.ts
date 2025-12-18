export interface PaymentSuggestion {
  id: string
  type: 'debt' | 'creditCard' | 'expense'
  name: string
  amount: number
  dueDate: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  reason: string
  interestRate?: number
  remainingBalance?: number
  suggestedPaymentDate: string
}

export interface CashFlowDay {
  date: string
  income: number
  expenses: number
  balance: number
  payments: PaymentSuggestion[]
}

export interface PaymentPlanSummary {
  totalIncome: number
  totalObligations: number
  availableBalance: number
  currentBalance: number
  suggestedSafetyBuffer: number
  cashFlowStatus: 'healthy' | 'tight' | 'deficit'
  warnings: string[]
}

export interface PaymentPlan {
  summary: PaymentPlanSummary
  suggestions: PaymentSuggestion[]
  cashFlowProjection: CashFlowDay[]
}
