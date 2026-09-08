import { prisma } from '@server/utils/db'

/**
 * Saldo actual real de efectivo/débito del usuario: ingresos recibidos este
 * mes menos gastos en efectivo/débito de este mes (excluye gastos con
 * tarjeta de crédito, ya que esos se pagan después vía el ciclo de
 * facturación, no de forma inmediata contra el saldo líquido) y menos las
 * cuotas de deuda pagadas este mes (esas se registran como `DebtPayment`,
 * no como `Expense`, así que hay que sumarlas aparte).
 *
 * El corte de mes se calcula en UTC porque las fechas sin hora (las que
 * ingresa el usuario en un input de fecha) se guardan como medianoche UTC;
 * usar la hora local del servidor aquí desalinearía el corte con esas fechas.
 *
 * Misma lógica que ya usaba `payment-plan/suggestions.get.ts` inline;
 * extraída aquí para reutilizarla también en `budgets/calculate.post.ts`.
 */
export async function getCurrentBalance(userId: number): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const receivedIncomesThisMonth = await prisma.income.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: now,
      },
    },
  })

  const expensesThisMonth = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: now,
      },
      // Excluir gastos con tarjeta de crédito (esos se pagan después)
      creditCardId: null,
    },
  })

  const debtPaymentsThisMonth = await prisma.debtPayment.findMany({
    where: {
      debt: { userId },
      date: {
        gte: startOfMonth,
        lte: now,
      },
    },
  })

  const totalReceivedIncome = receivedIncomesThisMonth.reduce(
    (sum, inc) => sum + Number(inc.amount),
    0
  )
  const totalSpentCashDebit = expensesThisMonth.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const totalDebtPayments = debtPaymentsThisMonth.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  )

  return totalReceivedIncome - totalSpentCashDebit - totalDebtPayments
}
