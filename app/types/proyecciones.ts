// Tipos del módulo "Proyecciones" (BudgetProjection).
//
// OJO: existen dos formas distintas de este dato en el frontend:
// - `ProjectionCalculation`: la respuesta de POST /api/budgets/calculate,
//   una previsualización que NO se persiste. Incluye currentBalance/status/
//   warnings/cards porque esos campos solo existen ahí.
// - `BudgetProjection`: lo que devuelven GET /api/budgets y POST /api/budgets
//   una vez guardado. El modelo Prisma (prisma/schema.prisma) NO tiene
//   currentBalance, status, warnings ni cards — no los inventes al leer una
//   proyección ya guardada.

export interface ProjectionCardInfo {
  id: number
  name: string
  bank: string
  available: number
  nearLimit: boolean
}

export type ProjectionStatus = 'sin_deuda' | 'ajustado' | 'riesgo_deuda'

// Datos que el usuario ingresa a mano en el paso 1 del formulario.
export interface ProjectionInput {
  name: string
  totalBudget: number
  startDate: string
  endDate: string
  description?: string | null
}

// Respuesta de POST /api/budgets/calculate (previsualización, no persiste).
export interface ProjectionCalculation {
  input: ProjectionInput
  currentBalance: number
  expectedIncome: number
  fixedExpenses: number
  debtPayments: number
  availableAmount: number
  debitUsage: number
  creditUsage: number
  savingsImpact: number
  status: ProjectionStatus
  warnings: string[]
  cards: ProjectionCardInfo[]
}

// Proyección guardada — shape exacto devuelto por GET/POST /api/budgets
// (ver server/api/budgets/index.get.ts y server/api/budgets/index.post.ts).
// NO extiende ProjectionCalculation: no tiene currentBalance/status/warnings/cards.
export interface BudgetProjection {
  id: number
  name: string
  totalBudget: number
  startDate: string
  endDate: string
  description?: string | null
  expectedIncome: number
  fixedExpenses: number
  debtPayments: number
  availableAmount: number
  debitUsage: number
  creditUsage: number
  savingsImpact: number
  isCompleted: boolean
  userId: number
  createdAt: string
  updatedAt: string
}
