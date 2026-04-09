import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const debtId = Number(event.context.params?.debtId)

  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
    include: {
      installments: { orderBy: { installmentNumber: 'asc' } },
    },
  })

  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  let cumulativePrincipal = 0
  let cumulativeInterest = 0

  const rows = debt.installments.map((inst) => {
    cumulativePrincipal += inst.principal
    cumulativeInterest += inst.interest

    return {
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate.toISOString(),
      amount: inst.amount,
      principal: inst.principal,
      interest: inst.interest,
      insurance: inst.insurance,
      status: inst.status,
      cumulativePrincipal: Number(cumulativePrincipal.toFixed(2)),
      cumulativeInterest: Number(cumulativeInterest.toFixed(2)),
      remainingBalance: Number(Math.max(0, debt.totalAmount - cumulativePrincipal).toFixed(2)),
    }
  })

  const paidRows = debt.installments.filter((i) => i.status === 'paid' || i.status === 'advanced')
  const paidCount = paidRows.length
  const pendingCount = debt.installments.length - paidCount

  return {
    debt: {
      id: debt.id,
      name: debt.name,
      creditor: debt.creditor,
      totalAmount: debt.totalAmount,
      remainingAmount: debt.remainingAmount,
      interestRate: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      totalInstallments: debt.totalInstallments,
      isPaid: debt.isPaid,
    },
    rows,
    summary: {
      totalPrincipalPaid: Number(paidRows.reduce((s, r) => s + r.principal, 0).toFixed(2)),
      totalInterestPaid: Number(paidRows.reduce((s, r) => s + r.interest, 0).toFixed(2)),
      totalInsurancePaid: Number(paidRows.reduce((s, r) => s + r.insurance, 0).toFixed(2)),
      totalAmountPaid: Number(paidRows.reduce((s, r) => s + r.amount, 0).toFixed(2)),
      paidCount,
      pendingCount,
    },
  }
})
