import { prisma } from '@server/utils/db'

interface CardBillingConfig {
  billingDay: number
  paymentDay: number
}

interface BillingWindow {
  start: Date
  end: Date
  paymentDue: Date
}

function getPaymentDueDate(billingEnd: Date, paymentDay: number): Date {
  const month = billingEnd.getMonth()
  const year = billingEnd.getFullYear()
  const billingDay = billingEnd.getDate()
  return paymentDay > billingDay
    ? new Date(year, month, paymentDay, 23, 59, 59)
    : new Date(year, month + 1, paymentDay, 23, 59, 59)
}

export function computeBillingWindows(
  card: CardBillingConfig,
  today = new Date()
): { lastClosed: BillingWindow; current: BillingWindow } {
  const d = today.getDate()
  const m = today.getMonth()
  const y = today.getFullYear()

  if (d > card.billingDay) {
    const lastClosedEnd = new Date(y, m, card.billingDay, 23, 59, 59)
    const currentEnd = new Date(y, m + 1, card.billingDay, 23, 59, 59)
    return {
      lastClosed: {
        start: new Date(y, m - 1, card.billingDay + 1, 0, 0, 0),
        end: lastClosedEnd,
        paymentDue: getPaymentDueDate(lastClosedEnd, card.paymentDay),
      },
      current: {
        start: new Date(y, m, card.billingDay + 1, 0, 0, 0),
        end: currentEnd,
        paymentDue: getPaymentDueDate(currentEnd, card.paymentDay),
      },
    }
  } else {
    const lastClosedEnd = new Date(y, m - 1, card.billingDay, 23, 59, 59)
    const currentEnd = new Date(y, m, card.billingDay, 23, 59, 59)
    return {
      lastClosed: {
        start: new Date(y, m - 2, card.billingDay + 1, 0, 0, 0),
        end: lastClosedEnd,
        paymentDue: getPaymentDueDate(lastClosedEnd, card.paymentDay),
      },
      current: {
        start: new Date(y, m - 1, card.billingDay + 1, 0, 0, 0),
        end: currentEnd,
        paymentDue: getPaymentDueDate(currentEnd, card.paymentDay),
      },
    }
  }
}

/**
 * Ciclo de facturación cuyo recibo vence en `dueDate`: el corte es el `billingDay`
 * del mismo mes si el pago cae después del corte, o del mes anterior si no
 * (inverso de getPaymentDueDate).
 */
export function billingWindowForDueDate(card: CardBillingConfig, dueDate: Date): BillingWindow {
  const endMonthOffset = card.paymentDay > card.billingDay ? 0 : -1
  const y = dueDate.getFullYear()
  const m = dueDate.getMonth() + endMonthOffset
  return {
    start: new Date(y, m - 1, card.billingDay + 1, 0, 0, 0),
    end: new Date(y, m, card.billingDay, 23, 59, 59),
    paymentDue: dueDate,
  }
}

/** Recibo pendiente más próximo (aunque ya esté vencido), o null si no hay recibos cargados. */
export function findNextUnpaidStatement(cardId: number, userId: number) {
  return prisma.creditCardStatement.findFirst({
    where: { creditCardId: cardId, userId, isPaid: false },
    orderBy: { dueDate: 'asc' },
  })
}

/**
 * Monto a pagar de la tarjeta: si hay un CreditCardStatement pendiente, manda su monto
 * y vencimiento (el pago del mes o, si ya se pagó, el siguiente). Si no hay recibos
 * cargados, cae al cálculo por Expense del periodo activo + carriedBalance.
 * `usedAmount` siempre es carriedBalance + gastos del periodo (uso de la línea).
 */
export async function resolveCardAmountDue(
  card: { id: number; carriedBalance: unknown } & CardBillingConfig,
  userId: number,
  today = new Date()
) {
  const period = await resolveActiveBillingPeriod(card, userId, today)
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      creditCardId: card.id,
      date: { gte: period.billingStartDate, lte: period.billingEndDate },
      isPaidOff: false,
    },
  })
  // carriedBalance / expense.amount vienen como Prisma.Decimal
  const periodExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const usedAmount = Number(card.carriedBalance) + periodExpensesAmount

  const statement = await findNextUnpaidStatement(card.id, userId)
  if (statement) {
    const window = billingWindowForDueDate(card, statement.dueDate)
    return {
      source: 'statement' as const,
      statementId: statement.id,
      amountDue: Number(statement.amount),
      billingStartDate: window.start,
      billingEndDate: window.end,
      paymentDueDate: statement.dueDate,
      usedAmount,
      periodExpensesAmount,
      expenses,
    }
  }

  return {
    source: 'expenses' as const,
    statementId: null,
    amountDue: usedAmount,
    ...period,
    usedAmount,
    periodExpensesAmount,
    expenses,
  }
}

export async function resolveActiveBillingPeriod(
  card: { id: number } & CardBillingConfig,
  userId: number,
  today = new Date()
) {
  const { lastClosed, current } = computeBillingWindows(card, today)

  const unpaidCount = await prisma.expense.count({
    where: {
      userId,
      creditCardId: card.id,
      date: { gte: lastClosed.start, lte: lastClosed.end },
      isPaidOff: false,
    },
  })

  // Si hay gastos sin pagar en el ciclo cerrado, ese es el periodo activo a mostrar,
  // independientemente de si el día de corte ya pasó o no en el mes actual.
  const useLastClosed = unpaidCount > 0
  const period = useLastClosed ? lastClosed : current

  return {
    billingStartDate: period.start,
    billingEndDate: period.end,
    paymentDueDate: period.paymentDue,
  }
}
