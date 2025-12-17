import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  // Crear registro de pago
  await prisma.debtPayment.create({
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

  // Actualizar monto restante
  const newRemaining = debt.remainingAmount - body.principal
  const isPaid = newRemaining <= 0

  return prisma.debt.update({
    where: { id },
    data: {
      remainingAmount: Math.max(0, newRemaining),
      isPaid,
    },
  })
})
