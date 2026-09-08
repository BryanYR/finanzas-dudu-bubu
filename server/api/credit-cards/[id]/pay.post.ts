import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CreditCardPaymentSchema } from '@server/utils/validation'
import { computeBillingWindows } from '@server/services/creditCardService'

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

  // Obtener el período cerrado usando la misma lógica del servicio
  const { lastClosed } = computeBillingWindows(card)

  // Marcar todos los gastos del período cerrado como pagados
  await prisma.expense.updateMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: lastClosed.start, lte: lastClosed.end },
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
      date: body.date ? new Date(body.date) : new Date(),
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
