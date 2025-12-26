import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  // Crear la deuda
  const debt = await prisma.debt.create({
    data: {
      name: body.name,
      creditor: body.creditor,
      totalAmount: body.totalAmount,
      remainingAmount: body.remainingAmount || body.totalAmount,
      interestRate: body.interestRate,
      monthlyPayment: body.monthlyPayment,
      totalInstallments: body.totalInstallments || 12,
      paymentDayOfMonth: body.paymentDayOfMonth || 15,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      userId: user.id,
    },
  })

  // Generar cuotas programadas
  const startDate = new Date(body.startDate)
  const totalInstallments = body.totalInstallments || 12
  const monthlyPayment = body.monthlyPayment
  const interestRate = body.interestRate / 100 / 12 // Tasa mensual
  const totalAmount = body.totalAmount
  const paymentDay = body.paymentDayOfMonth || 15

  const installments = []
  let remainingPrincipal = totalAmount

  for (let i = 1; i <= totalInstallments; i++) {
    // Calcular fecha de vencimiento
    const dueDate = new Date(startDate)
    dueDate.setMonth(startDate.getMonth() + i)
    dueDate.setDate(paymentDay)

    // Calcular interés sobre saldo restante
    const interestAmount = remainingPrincipal * interestRate

    // El principal es lo que queda de la cuota después del interés
    const principalAmount = monthlyPayment - interestAmount

    // Ajustar la última cuota si es necesario
    const finalPrincipal = i === totalInstallments ? remainingPrincipal : principalAmount

    const finalAmount =
      i === totalInstallments ? remainingPrincipal + interestAmount : monthlyPayment

    installments.push({
      installmentNumber: i,
      dueDate,
      amount: finalAmount,
      principal: finalPrincipal,
      interest: interestAmount,
      insurance: 0, // Se puede calcular si hay seguro
      status: 'pending',
      debtId: debt.id,
    })

    remainingPrincipal -= principalAmount
  }

  // Crear todas las cuotas
  await prisma.debtInstallment.createMany({
    data: installments,
  })

  // Retornar la deuda con las cuotas
  return prisma.debt.findUnique({
    where: { id: debt.id },
    include: {
      installments: {
        orderBy: {
          installmentNumber: 'asc',
        },
      },
    },
  })
})
