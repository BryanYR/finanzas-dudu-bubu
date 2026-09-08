import { prisma } from '@server/utils/db'

export interface InstallmentInput {
  debtId: number
  totalAmount: number
  monthlyPayment: number
  interestRate: number
  totalInstallments: number
  startDate: Date
  paymentDayOfMonth: number
}

export function buildInstallments(params: InstallmentInput) {
  const {
    debtId,
    totalAmount,
    monthlyPayment,
    interestRate,
    totalInstallments,
    startDate,
    paymentDayOfMonth,
  } = params
  const monthlyRate = interestRate / 100 / 12
  const installments = []
  let remainingPrincipal = totalAmount

  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(startDate.getMonth() + i)
    dueDate.setDate(paymentDayOfMonth)

    const interestAmount = remainingPrincipal * monthlyRate
    const principalAmount = monthlyPayment - interestAmount
    const isLast = i === totalInstallments

    installments.push({
      installmentNumber: i,
      dueDate,
      amount: isLast ? remainingPrincipal + interestAmount : monthlyPayment,
      principal: isLast ? remainingPrincipal : principalAmount,
      interest: interestAmount,
      insurance: 0,
      status: 'pending',
      debtId,
    })

    remainingPrincipal -= principalAmount
  }

  return installments
}

export async function processDebtPayment(params: {
  debtId: number
  userId: number
  amount: number
  principal: number
  interest: number
  insurance?: number
  date?: Date
  paymentNumber: number
  notes?: string
  installmentIds?: number[]
}) {
  const {
    debtId,
    userId,
    amount,
    principal,
    interest,
    insurance = 0,
    date,
    paymentNumber,
    notes,
    installmentIds,
  } = params

  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
    include: {
      installments: {
        where: { status: { in: ['pending', 'overdue'] } },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  })

  if (!debt || debt.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  if (debt.isPaid) {
    throw createError({ statusCode: 400, message: 'Esta deuda ya está pagada' })
  }

  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const payment = await tx.debtPayment.create({
      data: {
        amount,
        principal,
        interest,
        insurance,
        date: date ?? new Date(),
        paymentNumber,
        notes,
        debtId,
      },
    })

    const idsToMark = installmentIds?.length
      ? installmentIds
      : debt.installments[0]
        ? [debt.installments[0].id]
        : []

    for (const installmentId of idsToMark) {
      const installment = debt.installments.find((i) => i.id === installmentId)
      if (!installment) continue
      await tx.debtInstallment.update({
        where: { id: installmentId },
        data: {
          status: now < new Date(installment.dueDate) ? 'advanced' : 'paid',
          debtPaymentId: payment.id,
        },
      })
    }

    // Marcar cuotas vencidas pendientes
    await tx.debtInstallment.updateMany({
      where: { debtId, status: 'pending', dueDate: { lt: now } },
      data: { status: 'overdue' },
    })

    // Decremento atómico del saldo restante (evita condiciones de carrera con
    // pagos casi simultáneos que leerían el mismo remainingAmount desactualizado)
    await tx.debt.update({
      where: { id: debtId },
      data: { remainingAmount: { decrement: principal } },
    })

    const refreshedDebt = await tx.debt.findUniqueOrThrow({ where: { id: debtId } })
    const remainingAmount = Number(refreshedDebt.remainingAmount)
    const isPaid = remainingAmount <= 0

    return tx.debt.update({
      where: { id: debtId },
      data: { remainingAmount: Math.max(0, remainingAmount), isPaid },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    })
  })
}

export async function updateDebtPayment(params: {
  paymentId: number
  userId: number
  amount: number
  principal: number
  interest: number
  insurance: number
  date: Date
  paymentNumber: number
  notes?: string
}) {
  const { paymentId, userId, amount, principal, interest, insurance, date, paymentNumber, notes } =
    params

  const payment = await prisma.debtPayment.findUnique({
    where: { id: paymentId },
    include: { debt: true },
  })

  if (!payment) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  }

  if (payment.debt.userId !== userId) {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  // payment.principal / payment.debt.remainingAmount vienen como Prisma.Decimal
  const principalDelta = principal - Number(payment.principal)

  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.update({
      where: { id: paymentId },
      data: { amount, principal, interest, insurance, date, paymentNumber, notes: notes || null },
    })

    const newRemaining = Math.max(0, Number(payment.debt.remainingAmount) - principalDelta)
    await tx.debt.update({
      where: { id: payment.debtId },
      data: { remainingAmount: newRemaining, isPaid: newRemaining <= 0 },
    })
  })
}

export async function reverseDebtPayment(params: { paymentId: number; userId: number }) {
  const { paymentId, userId } = params

  const payment = await prisma.debtPayment.findUnique({
    where: { id: paymentId },
    include: {
      debt: true,
      installments: true,
    },
  })

  if (!payment) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  }

  if (payment.debt.userId !== userId) {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Reset linked installments back to pending or overdue
    for (const installment of payment.installments) {
      const status = new Date(installment.dueDate) < now ? 'overdue' : 'pending'
      await tx.debtInstallment.update({
        where: { id: installment.id },
        data: { status, debtPaymentId: null },
      })
    }

    // Restore remaining amount and unpay debt if applicable.
    // payment.debt.remainingAmount / payment.principal vienen como Prisma.Decimal;
    // `+` entre dos Decimal concatena strings en vez de sumar, así que hay que
    // normalizar ambos con Number(...) antes de sumar.
    const newRemaining = Number(payment.debt.remainingAmount) + Number(payment.principal)
    await tx.debt.update({
      where: { id: payment.debtId },
      data: { remainingAmount: newRemaining, isPaid: false },
    })

    // Delete the payment record
    await tx.debtPayment.delete({ where: { id: paymentId } })
  })
}
