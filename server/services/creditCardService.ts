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
