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

  // debt.totalAmount / inst.amount / inst.principal / inst.interest / inst.insurance
  // vienen de la BD como Prisma.Decimal; Number(...) los normaliza antes de operar
  // con aritmética JS (`+=` con un Decimal concatena strings en vez de sumar).
  const totalAmount = Number(debt.totalAmount)
  let cumulativePrincipal = 0
  let cumulativeInterest = 0

  const rows = debt.installments.map((inst) => {
    const principal = Number(inst.principal)
    const interest = Number(inst.interest)
    cumulativePrincipal += principal
    cumulativeInterest += interest

    return {
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate.toISOString(),
      amount: Number(inst.amount),
      principal,
      interest,
      insurance: Number(inst.insurance),
      status: inst.status,
      cumulativePrincipal: Number(cumulativePrincipal.toFixed(2)),
      cumulativeInterest: Number(cumulativeInterest.toFixed(2)),
      remainingBalance: Number(Math.max(0, totalAmount - cumulativePrincipal).toFixed(2)),
    }
  })

  const paidRows = rows.filter((r) => r.status === 'paid' || r.status === 'advanced')
  const paidCount = paidRows.length
  const pendingCount = debt.installments.length - paidCount

  return {
    debt: {
      id: debt.id,
      name: debt.name,
      creditor: debt.creditor,
      totalAmount,
      remainingAmount: Number(debt.remainingAmount),
      interestRate: debt.interestRate,
      monthlyPayment: Number(debt.monthlyPayment),
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
