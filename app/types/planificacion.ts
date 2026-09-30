export interface PaymentSuggestion {
  id: string
  type: 'debt' | 'creditCard' | 'expense'
  name: string
  amount: number
  /** Día calendario YYYY-MM-DD */
  dueDate: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  reason: string
  interestRate?: number
  remainingBalance?: number
  /** Día calendario YYYY-MM-DD; nunca antes de que entre el sueldo que financia el pago */
  suggestedPaymentDate: string
  installmentNumber?: number
  installmentId?: number
  /** Ciclo de sueldo que lo paga: el actual o el que empieza con el próximo sueldo */
  cycle: 'current' | 'next'
  isOverdue?: boolean
}

export interface CashFlowDay {
  date: string
  income: number
  expenses: number
  balance: number
  payments: PaymentSuggestion[]
  type?: 'income' | 'expense'
}

export type CycleStatus = 'healthy' | 'tight' | 'deficit'

/** Ciclo de sueldo: [startDate, endDate), ambos YYYY-MM-DD (endDate = día del siguiente sueldo). */
export interface PaymentCycle {
  startDate: string
  endDate: string
  /** Ciclo actual: ingresos recibidos desde el sueldo. Próximo: sueldo esperado. */
  income: number
  /** Ciclo actual: gastos sin tarjeta + cuotas pagadas desde el sueldo. Próximo: 0. */
  spent: number
  /** Lo que sobra (o falta) del ciclo anterior. Ciclo actual: 0. */
  carryOver: number
  /** carryOver + income - spent */
  available: number
  obligationsTotal: number
  obligationsCount: number
  /** available - obligationsTotal */
  result: number
  /** income - spent - obligationsTotal (sin arrastre del ciclo anterior) */
  resultWithoutCarry: number
  status: CycleStatus
}

export interface PaymentPlanSummary {
  totalIncome: number
  totalObligations: number
  availableBalance: number
  currentBalance: number
  suggestedSafetyBuffer: number
  cashFlowStatus: CycleStatus
  warnings: string[]
  pendingIncome?: number
  projectedBalance?: number
  /** El sueldo que abre el próximo ciclo ya debió llegar pero no está registrado */
  salaryPending?: boolean
}

export interface PaymentPlan {
  summary: PaymentPlanSummary
  cycles: { current: PaymentCycle; next: PaymentCycle }
  suggestions: PaymentSuggestion[]
  cashFlowProjection: CashFlowDay[]
}
