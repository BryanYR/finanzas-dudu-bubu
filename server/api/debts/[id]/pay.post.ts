import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, DebtPaymentSchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(DebtPaymentSchema, await readBody(event))

  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
      installments: {
        where: { status: { in: ['pending', 'overdue'] } },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  })

  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  if (debt.isPaid) {
    throw createError({ statusCode: 400, message: 'Esta deuda ya está pagada' })
  }

  const now = new Date()

  const updatedDebt = await prisma.$transaction(async (tx) => {
    // Crear registro de pago
    const payment = await tx.debtPayment.create({
      data: {
        amount: body.amount,
        principal: body.principal,
        interest: body.interest,
        insurance: body.insurance,
        date: body.date ? new Date(body.date) : new Date(),
        paymentNumber: body.paymentNumber,
        notes: body.notes ?? undefined,
        debtId: id,
      },
    })

    // Determinar qué cuotas se están pagando
    const installmentsToPay = body.installmentIds?.length
      ? body.installmentIds
      : debt.installments[0]
        ? [debt.installments[0].id]
        : []

    // Actualizar el estado de las cuotas pagadas
    for (const installmentId of installmentsToPay) {
      const installment = debt.installments.find((i) => i.id === installmentId)
      if (installment) {
        const isPaidInAdvance = now < new Date(installment.dueDate)
        await tx.debtInstallment.update({
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

    // Marcar cuotas vencidas pendientes
    await tx.debtInstallment.updateMany({
      where: { debtId: id, status: 'pending', dueDate: { lt: now } },
      data: { status: 'overdue' },
    })

    return tx.debt.update({
      where: { id },
      data: { remainingAmount: Math.max(0, newRemaining), isPaid },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    })
  })

  return updatedDebt
})
