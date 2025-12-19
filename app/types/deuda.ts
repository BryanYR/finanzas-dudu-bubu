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
  }
  totalPayments?: number
}
