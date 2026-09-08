import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, BudgetCalculateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'
import { getCurrentBalance } from '@server/utils/cash-flow'
import { countOccurrencesInRange, type Frequency } from '@server/utils/frequency'

const currencyFormatter = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(BudgetCalculateSchema, await readBody(event))

  const startDate = new Date(body.startDate)
  const endDate = new Date(body.endDate)

  if (endDate <= startDate) {
    throw createError({
      statusCode: 400,
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    })
  }

  // ── 1. Saldo actual real (liquidez de HOY, no del rango del viaje) ──────
  const currentBalance = await getCurrentBalance(user.id)

  // ── 2. Ingresos esperados dentro del rango ──────────────────────────────
  const recurringIncomes = await prisma.income.findMany({
    where: { userId: user.id, isRecurring: true },
  })
  const expectedRecurringIncome = recurringIncomes.reduce((sum, income) => {
    if (!income.frequency) return sum
    const occurrences = countOccurrencesInRange(
      income.frequency as Frequency,
      new Date(income.date),
      startDate,
      endDate
    )
    return sum + occurrences * Number(income.amount)
  }, 0)

  const nonRecurringIncomesInRange = await prisma.income.findMany({
    where: {
      userId: user.id,
      isRecurring: false,
      date: { gte: startDate, lte: endDate },
    },
  })
  const expectedNonRecurringIncome = nonRecurringIncomesInRange.reduce(
    (sum, income) => sum + Number(income.amount),
    0
  )

  const expectedIncome = expectedRecurringIncome + expectedNonRecurringIncome

  // ── 3. Gastos fijos dentro del rango ────────────────────────────────────
  const recurringExpenses = await prisma.expense.findMany({
    where: { userId: user.id, isRecurring: true },
  })
  const fixedRecurringExpenses = recurringExpenses.reduce((sum, expense) => {
    if (!expense.frequency) return sum
    const occurrences = countOccurrencesInRange(
      expense.frequency as Frequency,
      new Date(expense.date),
      startDate,
      endDate
    )
    return sum + occurrences * Number(expense.amount)
  }, 0)

  const nonRecurringExpensesInRange = await prisma.expense.findMany({
    where: {
      userId: user.id,
      isRecurring: false,
      date: { gte: startDate, lte: endDate },
    },
  })
  const fixedNonRecurringExpenses = nonRecurringExpensesInRange.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  )

  const fixedExpenses = fixedRecurringExpenses + fixedNonRecurringExpenses

  // ── 4. Cuotas de deuda que caen dentro del rango ────────────────────────
  const installmentsInRange = await prisma.debtInstallment.findMany({
    where: {
      dueDate: { gte: startDate, lte: endDate },
      status: { in: ['pending', 'overdue'] },
      debt: { userId: user.id, isPaid: false },
    },
  })
  const debtPayments = installmentsInRange.reduce(
    (sum, installment) => sum + Number(installment.amount),
    0
  )

  // ── 5. Tarjetas activas: espacio disponible ─────────────────────────────
  // "Usado" = carriedBalance (deuda previa/cuotas que no vienen de un Expense
  // individual) + gastos con esa tarjeta aún no pagados (isPaidOff: false).
  // Misma convención que credit-cards/[id]/statement.get.ts, pero sumando
  // TODOS los gastos no pagados (no solo el período de facturación actual)
  // para reflejar la exposición total real de la tarjeta, no solo el último
  // estado de cuenta.
  const activeCards = await prisma.creditCard.findMany({
    where: { userId: user.id, isActive: true },
  })

  const cards = await Promise.all(
    activeCards.map(async (card) => {
      const unpaidExpenses = await prisma.expense.aggregate({
        where: { userId: user.id, creditCardId: card.id, isPaidOff: false },
        _sum: { amount: true },
      })
      const used = Number(card.carriedBalance) + Number(unpaidExpenses._sum.amount ?? 0)
      const limit = Number(card.creditLimit)
      const available = limit - used
      const nearLimit = limit > 0 ? used / limit > 0.8 : false

      return {
        id: card.id,
        name: card.name,
        bank: card.bank,
        available,
        nearLimit,
      }
    })
  )

  // ── 6. Cálculo de disponibilidad ────────────────────────────────────────
  const availableAmount = currentBalance + expectedIncome - fixedExpenses - debtPayments
  const safetyBuffer = expectedIncome * 0.1
  const safeToSpend = Math.max(availableAmount - safetyBuffer, 0)
  const debitUsage = Math.min(body.totalBudget, safeToSpend)
  const creditUsage = Math.max(body.totalBudget - debitUsage, 0)
  const savingsImpact = Math.max(body.totalBudget - debitUsage - creditUsage, 0)

  // ── 7. Veredicto ─────────────────────────────────────────────────────────
  const cardsWithSpace = cards.filter((card) => card.available > 0)
  const hasEnoughSpace = cardsWithSpace.some((card) => card.available >= creditUsage)
  const allSpaceCardsNearLimit =
    cardsWithSpace.length > 0 && cardsWithSpace.every((card) => card.nearLimit)

  let status: 'sin_deuda' | 'ajustado' | 'riesgo_deuda'
  if (creditUsage === 0) {
    status = 'sin_deuda'
  } else if (hasEnoughSpace && !allSpaceCardsNearLimit) {
    status = 'ajustado'
  } else {
    status = 'riesgo_deuda'
  }

  // ── 8. Advertencias ──────────────────────────────────────────────────────
  const warnings: string[] = []

  const nearLimitCards = cards.filter((card) => card.nearLimit)
  if (nearLimitCards.length > 0) {
    warnings.push(
      `⚠️ ${nearLimitCards.length} tarjeta(s) están cerca de su límite de crédito (${nearLimitCards.map((c) => c.name).join(', ')}). Evita cargarlas en este viaje.`
    )
  }

  if (currentBalance < safetyBuffer) {
    warnings.push(
      `💡 Tu saldo actual está por debajo del colchón de seguridad recomendado (${currencyFormatter.format(safetyBuffer)}).`
    )
  }

  if (savingsImpact > 0) {
    warnings.push(
      `🚨 ALERTA: Te faltan ${currencyFormatter.format(savingsImpact)} para cubrir este presupuesto solo con débito y crédito disponibles. Tendrías que recurrir a tus ahorros.`
    )
  }

  if (debtPayments > 0) {
    warnings.push(
      `📅 Tienes ${currencyFormatter.format(debtPayments)} en cuotas de deuda que vencen dentro de este rango de fechas.`
    )
  }

  return serializeDecimals({
    input: {
      name: body.name,
      totalBudget: body.totalBudget,
      startDate: body.startDate,
      endDate: body.endDate,
      description: body.description ?? null,
    },
    currentBalance,
    expectedIncome,
    fixedExpenses,
    debtPayments,
    availableAmount,
    debitUsage,
    creditUsage,
    savingsImpact,
    status,
    warnings,
    cards,
  })
})
