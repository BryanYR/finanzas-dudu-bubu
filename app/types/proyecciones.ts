export interface AmortizationRow {
  installmentNumber: number
  dueDate: string
  amount: number
  principal: number
  interest: number
  insurance: number
  status: 'pending' | 'paid' | 'overdue' | 'advanced'
  cumulativePrincipal: number
  cumulativeInterest: number
  remainingBalance: number
}

export interface AmortizationTable {
  debt: {
    id: number
    name: string
    creditor: string
    totalAmount: number
    remainingAmount: number
    interestRate: number
    monthlyPayment: number
    totalInstallments: number | null
    isPaid: boolean
  }
  rows: AmortizationRow[]
  summary: {
    totalPrincipalPaid: number
    totalInterestPaid: number
    totalInsurancePaid: number
    totalAmountPaid: number
    paidCount: number
    pendingCount: number
  }
}

export interface SimulatorScenarioPlazo {
  newPrincipal: number
  newInstallments: number
  installmentsSaved: number
  totalInterestNow: number
  totalInterestAfter: number
  interestSaved: number
  completionDate: string
  completionDateNow: string
}

export interface SimulatorScenarioCuota {
  newPrincipal: number
  newMonthlyPayment: number
  monthlySavings: number
  remainingInstallments: number
  totalInterestNow: number
  totalInterestAfter: number
  interestSaved: number
  completionDate: string
  completionDateNow: string
}

export interface SimulatorResult {
  debt: {
    id: number
    name: string
    remainingAmount: number
    interestRate: number
    monthlyPayment: number
    remainingInstallments: number
    nextDueDate: string
    completionDateNow: string
  }
  extraPayment: number
  reduccionPlazo: SimulatorScenarioPlazo
  reduccionCuota: SimulatorScenarioCuota
}

export interface ForecastMonth {
  yearMonth: string
  label: string
  fullLabel: string
  income: number
  debtPayments: number
  cardEstimate: number
  recurringExpenses: number
  totalExpenses: number
  netBalance: number
  runningBalance: number
  isCurrentMonth: boolean
  debtsCompletingThisMonth: string[]
}

export interface CashForecast {
  months: ForecastMonth[]
  debtsFreed: Array<{ name: string; yearMonth: string; monthlyRelief: number }>
  currentBalance: number
}
