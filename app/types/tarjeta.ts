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
  /** Monto a pagar: recibo pendiente más próximo, o carriedBalance + gastos del periodo si no hay recibos */
  totalAmount: number
  source?: 'statement' | 'expenses'
  statementId?: number | null
  /** Con recibo cargado: totalAmount = baseAmount (recibo) + newExpensesAmount (consumos posteriores a coveredUntil) */
  baseAmount?: number
  newExpensesAmount?: number
  newExpensesCount?: number
  coveredUntil?: string | null
  /** Uso de la línea: carriedBalance + gastos del periodo (base de creditUsagePercent/availableCredit) */
  usedAmount?: number
  periodExpensesAmount: number
  carriedBalance: number
  transactionCount: number
  creditUsagePercent: number
  availableCredit: number
  paymentDueDate: string
}

/** Recibo mensual de la tarjeta (CreditCardStatement): monto a pagar por vencimiento */
export interface CardBill {
  id: number
  dueDate: string
  amount: number
  /** Día hasta el que `amount` ya incluye consumos; los posteriores se suman al pago */
  coveredUntil: string | null
  isPaid: boolean
  paidAt: string | null
  paidAmount: number | null
  notes: string | null
  creditCardId: number
}

/** Plan de cuotas vigente de una tarjeta (CardInstallmentPlan) con los campos calculados por la API */
export interface CardInstallmentPlan {
  id: number
  description: string
  totalInstallments: number
  /** Cuota mensual (capital + interés) */
  installmentAmount: number
  /** Vencimiento del recibo que trae la cuota 1 */
  firstDueDate: string
  principal: number | null
  interestRate: number | null
  notes: string | null
  isActive: boolean
  creditCardId: number
  /** Cuota que vence en el próximo recibo */
  currentInstallment: number
  remainingInstallments: number
  lastDueDate: string
  remainingAmount: number
}

export interface CardInstallmentProjectionItem {
  planId: number
  description: string
  installmentNumber: number
  totalInstallments: number
  amount: number
}

/** Cuotas que vencen en un mes; `statementAmount` es el recibo ya cargado para ese vencimiento */
export interface CardInstallmentProjectionMonth {
  /** YYYY-MM */
  month: string
  dueDate: string
  total: number
  items: CardInstallmentProjectionItem[]
  statementAmount: number | null
}

export interface CardInstallmentsResponse {
  plans: CardInstallmentPlan[]
  projection: CardInstallmentProjectionMonth[]
}

/** Body de POST / PUT de /api/credit-cards/[id]/installment-plans */
export interface CardInstallmentPlanInput {
  description: string
  totalInstallments: number
  installmentAmount: number
  firstDueDate: string
  principal?: number | null
  interestRate?: number | null
  notes?: string | null
  isActive?: boolean
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
