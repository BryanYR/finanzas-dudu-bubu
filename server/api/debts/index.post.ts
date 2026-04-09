import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber } from '@server/utils/validate'
import { buildInstallments } from '@server/services/debtService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  assertRequired(body, ['name', 'creditor', 'totalAmount', 'monthlyPayment', 'interestRate', 'totalInstallments', 'startDate'])
  assertPositiveNumber(body, ['totalAmount', 'monthlyPayment', 'interestRate', 'totalInstallments'])

  const debt = await prisma.debt.create({
    data: {
      name: body.name,
      creditor: body.creditor,
      totalAmount: body.totalAmount,
      remainingAmount: body.remainingAmount || body.totalAmount,
      interestRate: body.interestRate,
      monthlyPayment: body.monthlyPayment,
      totalInstallments: body.totalInstallments,
      paymentDayOfMonth: body.paymentDayOfMonth || 15,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      userId: user.id,
    },
  })

  const installments = buildInstallments({
    debtId: debt.id,
    totalAmount: body.totalAmount,
    monthlyPayment: body.monthlyPayment,
    interestRate: body.interestRate,
    totalInstallments: body.totalInstallments,
    startDate: new Date(body.startDate),
    paymentDayOfMonth: body.paymentDayOfMonth || 15,
  })

  await prisma.debtInstallment.createMany({ data: installments })

  return prisma.debt.findUnique({
    where: { id: debt.id },
    include: { installments: { orderBy: { installmentNumber: 'asc' } } },
  })
})
