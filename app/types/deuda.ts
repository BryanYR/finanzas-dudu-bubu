export interface Debt {
  id: number
  name: string
  creditor: string
  totalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  totalInstallments: number
  paymentDayOfMonth: number
  startDate: string
  endDate?: string
  isPaid: boolean
  _count?: {
    payments: number
    installments: number
  }
  totalPayments?: number
  installments?: DebtInstallment[]
}

export interface DebtPayment {
  id: number
  amount: number
  principal: number
  interest: number
  insurance: number
  date: string
  paymentNumber: number
  notes?: string
  debtId: number
}

export interface DebtInstallment {
  id: number
  installmentNumber: number
  dueDate: string
  amount: number
  principal: number
  interest: number
  insurance: number
  status: 'pending' | 'paid' | 'overdue' | 'advanced'
  debtId: number
  debtPaymentId?: number
  createdAt: string
  updatedAt: string
}
