import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
      installments: {
        where: {
          status: {
            in: ['pending', 'overdue'],
          },
        },
        orderBy: {
          installmentNumber: 'asc',
        },
      },
    },
  })

  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  // Crear registro de pago
  const payment = await prisma.debtPayment.create({
    data: {
      amount: body.amount,
      principal: body.principal,
      interest: body.interest,
      insurance: body.insurance || 0,
      date: body.date ? new Date(body.date) : new Date(),
      paymentNumber: body.paymentNumber,
      notes: body.notes,
      debtId: id,
    },
  })

  // Determinar qué cuotas se están pagando
  const now = new Date()
  const installmentsToPay = []

  if (body.installmentIds && body.installmentIds.length > 0) {
    // Si se especificaron cuotas específicas
    installmentsToPay.push(...body.installmentIds)
  } else {
    // Pagar la siguiente cuota pendiente
    const nextInstallment = debt.installments[0]
    if (nextInstallment) {
      installmentsToPay.push(nextInstallment.id)
    }
  }

  // Actualizar el estado de las cuotas pagadas
  for (const installmentId of installmentsToPay) {
    const installment = debt.installments.find((i) => i.id === installmentId)
    if (installment) {
      // Determinar el estado: si se paga antes de la fecha de vencimiento, es "advanced"
      const isPaidInAdvance = now < new Date(installment.dueDate)

      await prisma.debtInstallment.update({
        where: { id: installmentId },
        data: {
          status: isPaidInAdvance ? 'advanced' : 'paid',
          debtPaymentId: payment.id,
        },
      })
    }
  }

  // Actualizar monto restante de la deuda
  const newRemaining = debt.remainingAmount - body.principal
  const isPaid = newRemaining <= 0

  // Actualizar deuda
  const updatedDebt = await prisma.debt.update({
    where: { id },
    data: {
      remainingAmount: Math.max(0, newRemaining),
      isPaid,
    },
    include: {
      installments: {
        orderBy: {
          installmentNumber: 'asc',
        },
      },
    },
  })

  // Actualizar cuotas vencidas
  await prisma.debtInstallment.updateMany({
    where: {
      debtId: id,
      status: 'pending',
      dueDate: {
        lt: now,
      },
    },
    data: {
      status: 'overdue',
    },
  })

  return updatedDebt
})
