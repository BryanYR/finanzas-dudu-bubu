import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'
import { resolveActiveBillingPeriod } from '@server/services/creditCardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)

  const card = await prisma.creditCard.findUnique({ where: { id } })

  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  const { billingStartDate, billingEndDate, paymentDueDate } = await resolveActiveBillingPeriod(
    card,
    user.id
  )

  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      creditCardId: id,
      date: { gte: billingStartDate, lte: billingEndDate },
      isPaidOff: false,
    },
  })

  // card.creditLimit, card.carriedBalance y expense.amount vienen de la BD como
  // Prisma.Decimal; Number(...) los normaliza para poder operar con aritmética JS.
  const creditLimit = Number(card.creditLimit)
  const carriedBalance = Number(card.carriedBalance)
  const periodExpensesAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  // carriedBalance cubre lo que el banco reporta como usado (cuotas en curso, saldo
  // previo a registrar la tarjeta en la app) y que no existe como Expense individual
  const totalAmount = carriedBalance + periodExpensesAmount

  const creditUsagePercent = (totalAmount / creditLimit) * 100

  return serializeDecimals({
    card: {
      id: card.id,
      name: card.name,
      bank: card.bank,
      lastDigits: card.lastDigits,
      creditLimit,
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
      periodExpensesAmount,
      carriedBalance,
      transactionCount: expenses.length,
      creditUsagePercent: Number(creditUsagePercent.toFixed(2)),
      availableCredit: Math.max(0, creditLimit - totalAmount),
      billingEndDate: billingEndDate.toISOString(),
      paymentDueDate: paymentDueDate.toISOString(),
    },
    expenses,
  })
})
