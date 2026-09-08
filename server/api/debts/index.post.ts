import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, DebtSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(DebtSchema, await readBody(event))

  const startDate = new Date(body.startDate)
  const totalInstallments = body.totalInstallments!
  const monthlyPayment = body.monthlyPayment
  const interestRate = body.interestRate / 100 / 12 // Tasa mensual
  const totalAmount = body.totalAmount
  const paymentDay = body.paymentDayOfMonth!

  // Generar cuotas antes de crear la deuda para fallar rápido si hay algún error
  const installmentsData: {
    installmentNumber: number
    dueDate: Date
    amount: number
    principal: number
    interest: number
    insurance: number
    status: string
  }[] = []
  let remainingPrincipal = totalAmount

  for (let i = 1; i <= totalInstallments; i++) {
    // Calcular fecha de vencimiento usando UTC para evitar problemas de timezone
    const dueDate = new Date(
      Date.UTC(startDate.getFullYear(), startDate.getMonth() + i, paymentDay)
    )

    const interestAmount = remainingPrincipal * interestRate
    const principalAmount = monthlyPayment - interestAmount

    const finalPrincipal = i === totalInstallments ? remainingPrincipal : principalAmount
    const finalAmount =
      i === totalInstallments ? remainingPrincipal + interestAmount : monthlyPayment

    installmentsData.push({
      installmentNumber: i,
      dueDate,
      amount: finalAmount,
      principal: finalPrincipal,
      interest: interestAmount,
      insurance: 0,
      status: 'pending',
    })

    remainingPrincipal -= principalAmount
  }

  // Crear deuda + cuotas en una sola transacción para garantizar consistencia
  const debt = await prisma.$transaction(async (tx) => {
    const createdDebt = await tx.debt.create({
      data: {
        name: body.name,
        creditor: body.creditor,
        totalAmount: body.totalAmount,
        remainingAmount: body.remainingAmount ?? body.totalAmount,
        interestRate: body.interestRate,
        monthlyPayment: body.monthlyPayment,
        totalInstallments,
        paymentDayOfMonth: paymentDay,
        startDate,
        endDate: body.endDate ? new Date(body.endDate) : null,
        userId: user.id,
      },
    })

    await tx.debtInstallment.createMany({
      data: installmentsData.map((inst) => ({ ...inst, debtId: createdDebt.id })),
    })

    return tx.debt.findUnique({
      where: { id: createdDebt.id },
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    })
  })

  return serializeDecimals(debt)
})
