import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

function buildCreditCardFields(body: Record<string, unknown>) {
  if (body.paymentMethod === 'credit' && body.creditCardId) {
    return {
      creditCardId: body.creditCardId as number,
      installments: (body.installments as number) > 1 ? (body.installments as number) : null,
      installmentAmount: (body.installmentAmount as number) > 0 ? (body.installmentAmount as number) : null,
      totalWithInterest: (body.totalWithInterest as number) > 0 ? (body.totalWithInterest as number) : null,
    }
  }
  if (body.paymentMethod !== 'credit') {
    return { creditCardId: null, installments: null, installmentAmount: null, totalWithInterest: null }
  }
  return {}
}

function buildUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}

  if (body.amount !== undefined) data.amount = body.amount
  if (body.description !== undefined) data.description = body.description
  if (body.date) data.date = new Date(body.date as string)
  if (body.isRecurring !== undefined) data.isRecurring = body.isRecurring
  if (body.categoryId !== undefined) data.categoryId = body.categoryId
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod
  if (body.notes !== undefined) data.notes = (body.notes as string) || null

  if (body.frequency) {
    data.frequency = body.frequency
  } else if (body.isRecurring === false) {
    data.frequency = null
  }

  return { ...data, ...buildCreditCardFields(body) }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (expense?.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }

  return prisma.expense.update({ where: { id }, data: buildUpdateData(body) })
})
