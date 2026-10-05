import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CreditCardStatementSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(CreditCardStatementSchema, await readBody(event))

  const card = await prisma.creditCard.findFirst({ where: { id, userId: user.id } })
  if (!card) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })

  const statement = await prisma.creditCardStatement.create({
    data: {
      dueDate: new Date(body.dueDate),
      amount: body.amount,
      coveredUntil: body.coveredUntil ? new Date(body.coveredUntil) : null,
      isPaid: body.isPaid,
      paidAt: body.isPaid ? (body.paidAt ? new Date(body.paidAt) : new Date()) : null,
      paidAmount: body.isPaid ? (body.paidAmount ?? body.amount) : null,
      notes: body.notes || null,
      creditCardId: id,
      userId: user.id,
    },
  })

  return serializeDecimals(statement)
})
