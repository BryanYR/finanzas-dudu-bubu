import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'
import { resolveCardAmountDue } from '@server/services/creditCardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)

  const card = await prisma.creditCard.findUnique({ where: { id } })

  if (!card || card.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  // amountDue = recibo pendiente más próximo (CreditCardStatement) si hay alguno cargado;
  // si no, carriedBalance + gastos no pagados del periodo activo. usedAmount (uso de la
  // línea) siempre es carriedBalance + gastos del periodo.
  const due = await resolveCardAmountDue(card, user.id)

  // card.creditLimit / card.carriedBalance vienen de la BD como Prisma.Decimal
  const creditLimit = Number(card.creditLimit)
  const carriedBalance = Number(card.carriedBalance)
  const creditUsagePercent = (due.usedAmount / creditLimit) * 100

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
      startDate: due.billingStartDate.toISOString(),
      endDate: due.billingEndDate.toISOString(),
      paymentDueDate: due.paymentDueDate.toISOString(),
    },
    statement: {
      totalAmount: due.amountDue,
      source: due.source,
      statementId: due.statementId,
      // totalAmount = baseAmount (recibo cargado) + newExpensesAmount (consumos posteriores a coveredUntil)
      baseAmount: due.baseAmount,
      newExpensesAmount: due.newExpensesAmount,
      newExpensesCount: due.newExpensesCount,
      coveredUntil: due.coveredUntil?.toISOString() ?? null,
      usedAmount: due.usedAmount,
      periodExpensesAmount: due.periodExpensesAmount,
      carriedBalance,
      transactionCount: due.expenses.length,
      creditUsagePercent: Number(creditUsagePercent.toFixed(2)),
      availableCredit: Math.max(0, creditLimit - due.usedAmount),
      billingEndDate: due.billingEndDate.toISOString(),
      paymentDueDate: due.paymentDueDate.toISOString(),
    },
    expenses: due.expenses,
  })
})
