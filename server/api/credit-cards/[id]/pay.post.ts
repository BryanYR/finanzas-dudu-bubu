import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CreditCardPaymentSchema } from '@server/utils/validation'
import {
  billingWindowForDueDate,
  computeBillingWindows,
  findNextUnpaidStatement,
} from '@server/services/creditCardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(CreditCardPaymentSchema, await readBody(event))

  const card = await prisma.creditCard.findUnique({ where: { id } })
  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  const category = await prisma.category.findFirst({
    where: { id: body.categoryId, userId: user.id },
  })
  if (!category) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })

  const paidAt = body.date ? new Date(body.date) : new Date()

  // Si hay un recibo cargado pendiente, el pago lo salda (y la tarjeta pasa a mostrar el
  // siguiente); los gastos a marcar son los del ciclo que vence en ese recibo. Si no hay
  // recibos, se paga el período cerrado como antes.
  const statement = await findNextUnpaidStatement(id, user.id)
  const window = statement
    ? billingWindowForDueDate(card, statement.dueDate)
    : computeBillingWindows(card).lastClosed

  if (statement) {
    await prisma.creditCardStatement.update({
      where: { id: statement.id },
      data: { isPaid: true, paidAt, paidAmount: body.amount },
    })
  }

  // Marcar todos los gastos del ciclo pagado como pagados
  await prisma.expense.updateMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: window.start, lte: window.end },
      isPaidOff: false,
    },
    data: { isPaidOff: true },
  })

  // Registrar el pago como un gasto de débito (sale de la cuenta bancaria); no se
  // asocia a la tarjeta (creditCardId: null) porque es un débito, no un consumo con ella.
  await prisma.expense.create({
    data: {
      description: `Pago Tarjeta ${card.name} - ${card.bank}`,
      amount: body.amount,
      date: paidAt,
      isRecurring: false,
      paymentMethod: 'debit' as const,
      creditCardId: null,
      categoryId: body.categoryId,
      userId: user.id,
      isPaidOff: false,
    },
  })

  return { success: true, message: 'Pago registrado exitosamente' }
})
