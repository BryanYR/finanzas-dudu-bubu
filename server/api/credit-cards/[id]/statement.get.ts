import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { resolveActiveBillingPeriod } from '@server/services/creditCardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)

  const card = await prisma.creditCard.findUnique({ where: { id } })

  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  const { billingStartDate, billingEndDate, paymentDueDate } = await resolveActiveBillingPeriod(card, user.id)

  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: billingStartDate, lte: billingEndDate },
      isPaidOff: false,
    },
  })

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    card: {
      id: card.id,
      name: card.name,
      bank: card.bank,
      lastDigits: card.lastDigits,
      creditLimit: card.creditLimit,
      billingDay: card.billingDay,
      paymentDay: card.paymentDay,
    },
    billingPeriod: {
      startDate: billingStartDate.toISOString(),
      endDate: billingEndDate.toISOString(),
      paymentDueDate: paymentDueDate.toISOString(),
    },
    statement: {
      totalAmount,
      transactionCount: expenses.length,
      creditUsagePercent: Number(((totalAmount / card.creditLimit) * 100).toFixed(2)),
      availableCredit: card.creditLimit - totalAmount,
      paymentDueDate: paymentDueDate.toISOString(),
    },
    expenses,
  }
})
