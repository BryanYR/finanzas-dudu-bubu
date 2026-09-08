import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, DebtPaymentSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

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

    // Marcar cuotas vencidas pendientes
    await tx.debtInstallment.updateMany({
      where: { debtId: id, status: 'pending', dueDate: { lt: now } },
      data: { status: 'overdue' },
    })

    // Decremento atómico del saldo restante (evita condiciones de carrera con
    // pagos casi simultáneos que leerían el mismo remainingAmount desactualizado)
    await tx.debt.update({
      where: { id },
      data: { remainingAmount: { decrement: body.principal } },
    })

    const refreshedDebt = await tx.debt.findUniqueOrThrow({ where: { id } })
    const remainingAmount = Number(refreshedDebt.remainingAmount)
    const isPaid = remainingAmount <= 0

    return tx.debt.update({
      where: { id },
      data: { remainingAmount: Math.max(0, remainingAmount), isPaid },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    })
  })

  return serializeDecimals(updatedDebt)
})
