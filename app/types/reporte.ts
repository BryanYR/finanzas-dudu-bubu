export type ReportBasis = 'consumo' | 'caja'

export interface MonthlySummaryMonth {
  month: string // YYYY-MM
  isPartial: boolean // mes en curso
  income: number
  fixedExpenses: number
  variableExpenses: number
  expenses: number
  debtPayments: number
  net: number
  savingsRate: number | null // fracción (0.25 = 25 %); null si no hubo ingresos
}

export interface MonthlySummary {
  from: string
  to: string
  basis: ReportBasis
  months: MonthlySummaryMonth[]
  totals: Omit<MonthlySummaryMonth, 'month' | 'isPartial'>
  monthlyAverage: { income: number; expenses: number; net: number }
}

export interface ExpenseCategoryRow {
  categoryId: number
  name: string
  icon: string | null
  color: string | null
  total: number
  count: number
  percentage: number // 0-100
  previousTotal: number
  change: number | null // % vs período anterior; null = sin base de comparación
}

export interface ExpensesByCategory {
  from: string
  to: string
  basis: ReportBasis
  total: number
  previous: { from: string; to: string; total: number }
  change: number | null
  categories: ExpenseCategoryRow[]
}
