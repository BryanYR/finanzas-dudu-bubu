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

const DAY_MS = 24 * 60 * 60 * 1000
/** Día calendario (ms de medianoche UTC): las fechas guardadas usan su día UTC. */
const utcDayOf = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

/** Monto que un consumo aporta a un recibo: la cuota mensual si fue en cuotas, o el total. */
export function cardChargeOf(expense: {
  amount: unknown
  installments: number | null
  installmentAmount: unknown
}) {
  // amount / installmentAmount vienen como Prisma.Decimal
  if (expense.installments && expense.installments > 1) {
    return expense.installmentAmount != null
      ? Number(expense.installmentAmount)
      : Number(expense.amount) / expense.installments
  }
  return Number(expense.amount)
}

/**
 * Monto del recibo = `amount` (lo cargado a mano, que ya incluye los consumos hasta
 * `coveredUntil`) + los gastos con la tarjeta, sin pagar, hechos DESPUÉS de esa fecha y
 * dentro del ciclo de facturación del recibo. Sin `coveredUntil` no se asume ningún
 * consumo incluido: todo gasto sin pagar del ciclo se suma.
 * Trabaja en días UTC porque las fechas de los gastos se guardan a medianoche UTC.
 */
export function computeStatementDue(
  card: CardBillingConfig,
  statement: { dueDate: Date; amount: unknown; coveredUntil: Date | null },
  unpaidCardExpenses: Array<{
    date: Date
    amount: unknown
    installments: number | null
    installmentAmount: unknown
  }>
) {
  const due = statement.dueDate
  const endMonthOffset = card.paymentDay > card.billingDay ? 0 : -1
  const y = due.getUTCFullYear()
  const m = due.getUTCMonth() + endMonthOffset
  const cycleStart = Date.UTC(y, m - 1, card.billingDay + 1)
  const cycleEnd = Date.UTC(y, m, card.billingDay)
  const from = statement.coveredUntil
    ? Math.max(cycleStart, utcDayOf(statement.coveredUntil) + DAY_MS)
    : cycleStart

  const newExpenses = unpaidCardExpenses.filter((e) => {
    const day = utcDayOf(e.date)
    return day >= from && day <= cycleEnd
  })
  const baseAmount = Number(statement.amount)
  const newExpensesAmount = newExpenses.reduce((sum, e) => sum + cardChargeOf(e), 0)
  return {
    baseAmount,
    newExpenses,
    newExpensesAmount,
    totalAmount: baseAmount + newExpensesAmount,
  }
}

/** Gastos con la tarjeta aún sin pagar (de cualquier ciclo). */
export function findUnpaidCardExpenses(cardId: number, userId: number) {
  return prisma.expense.findMany({
    where: { userId, creditCardId: cardId, isPaidOff: false },
    orderBy: { date: 'asc' },
  })
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
    const unpaid = await findUnpaidCardExpenses(card.id, userId)
    const due = computeStatementDue(card, statement, unpaid)
    return {
      source: 'statement' as const,
      statementId: statement.id,
      amountDue: due.totalAmount,
      baseAmount: due.baseAmount,
      newExpensesAmount: due.newExpensesAmount,
      newExpensesCount: due.newExpenses.length,
      coveredUntil: statement.coveredUntil,
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
    baseAmount: Number(card.carriedBalance),
    newExpensesAmount: periodExpensesAmount,
    newExpensesCount: expenses.length,
    coveredUntil: null,
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
