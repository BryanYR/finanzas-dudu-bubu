import { prisma } from '@server/utils/db'
import {
  cardChargeOf,
  computeStatementDue,
  findUnpaidCardExpenses,
  resolveActiveBillingPeriod,
} from './creditCardService'
import { isMonthSkipped } from '@server/utils/frequency'
import type {
  PaymentSuggestion,
  CashFlowDay,
  PaymentCycle,
  CycleStatus,
} from '#types/planificacion'

/**
 * Plan de pagos por CICLO DE SUELDO (ver docs/plans/planificacion-por-ciclo-de-sueldo.md).
 *
 * El sueldo que entra a fin de mes paga lo que vence hasta el siguiente sueldo, así que
 * todo se agrupa en `[sueldo k, sueldo k+1)` en vez de por mes calendario:
 * - ciclo actual: lo que entró desde el último sueldo − lo ya pagado − lo que falta
 *   pagar antes del próximo sueldo.
 * - próximo ciclo: sueldo esperado − lo que vence entre el próximo sueldo y el siguiente.
 *
 * Fechas: todo se maneja como "día calendario" (ms de medianoche UTC). Las fechas
 * guardadas usan su día UTC (los inputs de fecha se guardan a medianoche UTC; ver
 * server/utils/cash-flow.ts); "hoy" usa el día de Lima. Se devuelven como YYYY-MM-DD
 * para que el cliente no las corra un día al formatearlas en hora local.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000
/** Si el último sueldo registrado es más viejo que esto, se asume el día teórico de sueldo. */
const MAX_SALARY_AGE_DAYS = 40

type Priority = 'urgent' | 'high' | 'medium' | 'low'
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const formatPEN = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

/** Día calendario (UTC) de una fecha guardada en la BD. */
const dayOf = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
/** Día calendario usando la hora local del servidor (fechas armadas con new Date(y, m, d)). */
const localDayOf = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
const toISODay = (day: number) => new Date(day).toISOString().slice(0, 10)
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
/** Día `dayOfMonth` del mes (y, m) — m puede desbordarse — recortado al último día del mes. */
function dayInMonth(y: number, m: number, dayOfMonth: number) {
  const first = new Date(Date.UTC(y, m, 1))
  const yy = first.getUTCFullYear()
  const mm = first.getUTCMonth()
  return Date.UTC(yy, mm, Math.min(dayOfMonth, daysInMonth(yy, mm)))
}
const fmtDay = (day: number) => {
  const d = new Date(day)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Ocurrencias de un gasto recurrente dentro de [from, to). */
function recurringOccurrences(frequency: string | null, anchor: Date, from: number, to: number) {
  const anchorDay = dayOf(anchor)
  const a = new Date(anchorDay)
  const out: number[] = []
  const start = new Date(from)
  const end = new Date(to)
  const months: Array<[number, number]> = []
  for (
    let y = start.getUTCFullYear(), m = start.getUTCMonth();
    Date.UTC(y, m, 1) < to;
    m === 11 ? ((m = 0), y++) : m++
  ) {
    months.push([y, m])
  }

  switch (frequency) {
    case 'weekly':
      for (let d = anchorDay; d < to; d += 7 * DAY_MS) if (d >= from) out.push(d)
      break
    case 'biweekly':
      for (const [y, m] of months) out.push(Date.UTC(y, m, 15), Date.UTC(y, m, daysInMonth(y, m)))
      break
    case 'annual':
      for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++)
        out.push(dayInMonth(y, a.getUTCMonth(), a.getUTCDate()))
      break
    default: // monthly / null
      for (const [y, m] of months) out.push(dayInMonth(y, m, a.getUTCDate()))
  }
  // La plantilla misma es el registro de su primera ocurrencia: solo cuentan las posteriores.
  return out.filter((d) => d > anchorDay && d >= from && d < to)
}

function priorityFor(daysUntilDue: number, isOverdue: boolean): Priority {
  if (isOverdue || daysUntilDue <= 3) return 'urgent'
  if (daysUntilDue <= 7) return 'high'
  if (daysUntilDue <= 14) return 'medium'
  return 'low'
}

function statusFor(result: number, buffer: number): CycleStatus {
  if (result > buffer) return 'healthy'
  if (result >= 0) return 'tight'
  return 'deficit'
}

export async function getPaymentSuggestions(userId: number) {
  const now = new Date()
  const today = dayOf(new Date(now.getTime() - LIMA_OFFSET_MS))

  // ── 1. Ciclo de sueldo ─────────────────────────────────────────────────────
  const recurringIncomes = await prisma.income.findMany({ where: { userId, isRecurring: true } })
  const monthlyIncomes = recurringIncomes.filter(
    (i) => i.frequency === 'monthly' || i.frequency === null
  )
  // income.amount es Prisma.Decimal; Number(...) antes de operar
  const expectedSalary = monthlyIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const salaryTemplate = [...monthlyIncomes].sort((a, b) => Number(b.amount) - Number(a.amount))[0]

  let cycleStart: number
  let salaryDayOfMonth: number | null = null
  if (salaryTemplate) {
    salaryDayOfMonth = new Date(dayOf(salaryTemplate.date)).getUTCDate()
    const lastReceived = await prisma.income.findFirst({
      where: {
        userId,
        date: { lte: now },
        OR: [
          { id: salaryTemplate.id },
          { notes: { contains: `recurrente #${salaryTemplate.id}` } },
        ],
      },
      orderBy: { date: 'desc' },
    })
    const lastDay = lastReceived ? dayOf(lastReceived.date) : null
    if (lastDay !== null && (today - lastDay) / DAY_MS <= MAX_SALARY_AGE_DAYS) {
      cycleStart = lastDay
    } else {
      const t = new Date(today)
      const thisMonth = dayInMonth(t.getUTCFullYear(), t.getUTCMonth(), salaryDayOfMonth)
      cycleStart =
        thisMonth <= today
          ? thisMonth
          : dayInMonth(t.getUTCFullYear(), t.getUTCMonth() - 1, salaryDayOfMonth)
    }
  } else {
    const t = new Date(today)
    cycleStart = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1)
  }
  const cs = new Date(cycleStart)
  const nextDay = salaryDayOfMonth ?? 1
  const nextSalary = dayInMonth(cs.getUTCFullYear(), cs.getUTCMonth() + 1, nextDay)
  const cycleAfterNext = dayInMonth(cs.getUTCFullYear(), cs.getUTCMonth() + 2, nextDay)
  const salaryOverdue = !!salaryTemplate && today >= nextSalary

  const cycleOf = (dueDay: number): 'current' | 'next' | null =>
    dueDay < nextSalary ? 'current' : dueDay < cycleAfterNext ? 'next' : null

  // ── 2. Movimientos del ciclo actual (lo que ya entró / ya se pagó) ─────────
  const cycleStartDate = new Date(cycleStart)
  const horizonDate = new Date(cycleAfterNext)
  const [incomesInCycle, cashExpensesInCycle, debtPaymentsInCycle] = await Promise.all([
    prisma.income.findMany({ where: { userId, date: { gte: cycleStartDate, lte: now } } }),
    // Gastos con tarjeta no salen del débito ahora: se pagan con el recibo.
    prisma.expense.findMany({
      where: { userId, creditCardId: null, date: { gte: cycleStartDate, lte: now } },
    }),
    prisma.debtPayment.findMany({
      where: { debt: { userId }, date: { gte: cycleStartDate, lte: now } },
    }),
  ])
  const received = incomesInCycle.reduce((sum, i) => sum + Number(i.amount), 0)
  const spent =
    cashExpensesInCycle.reduce((sum, e) => sum + Number(e.amount), 0) +
    debtPaymentsInCycle.reduce((sum, p) => sum + Number(p.amount), 0)
  const available = received - spent

  // ── 3. Obligaciones hasta el fin del próximo ciclo ─────────────────────────
  const suggestions: PaymentSuggestion[] = []
  const pushSuggestion = (
    s: Omit<PaymentSuggestion, 'dueDate' | 'suggestedPaymentDate' | 'cycle' | 'priority'> & {
      dueDay: number
      priority?: Priority
      daysBefore?: number
    }
  ) => {
    const cycle = cycleOf(s.dueDay)
    if (!cycle) return
    const isOverdue = s.dueDay < today
    // Pagar unos días antes, pero no antes de que entre el sueldo que lo financia.
    const fundedFrom = cycle === 'next' ? nextSalary : today
    const suggested = Math.min(
      s.dueDay,
      Math.max(s.dueDay - (s.daysBefore ?? 2) * DAY_MS, fundedFrom, today)
    )
    const { dueDay, daysBefore, ...rest } = s
    suggestions.push({
      ...rest,
      priority: s.priority ?? priorityFor((dueDay - today) / DAY_MS, isOverdue),
      reason: isOverdue ? `🚨 VENCIDA - ${s.reason}` : s.reason,
      dueDate: toISODay(dueDay),
      suggestedPaymentDate: toISODay(isOverdue ? today : suggested),
      cycle,
      isOverdue,
    })
  }

  const [installments, creditCards, statements, recurringExpenses] = await Promise.all([
    prisma.debtInstallment.findMany({
      where: {
        debt: { userId, isPaid: false },
        status: { in: ['pending', 'overdue'] },
        dueDate: { lt: horizonDate },
      },
      include: { debt: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.creditCard.findMany({ where: { userId, isActive: true } }),
    prisma.creditCardStatement.findMany({
      where: { userId, isPaid: false, creditCard: { isActive: true } },
      include: { creditCard: true },
      orderBy: { dueDate: 'asc' },
    }),
    // Recurrentes cargados a tarjeta ya están dentro del recibo: no se cuentan aparte.
    prisma.expense.findMany({
      where: { userId, isRecurring: true, creditCardId: null },
      include: { category: true },
    }),
  ])

  // 3a. Cuotas de deuda
  for (const inst of installments) {
    const debt = inst.debt
    pushSuggestion({
      id: `debt-${debt.id}-installment-${inst.id}`,
      type: 'debt',
      name: `${debt.name} - Cuota ${inst.installmentNumber}/${debt.totalInstallments}`,
      // Prisma.Decimal → number
      amount: Number(inst.amount),
      dueDay: dayOf(inst.dueDate),
      priority:
        debt.interestRate > 15 && dayOf(inst.dueDate) - today > 7 * DAY_MS ? 'high' : undefined,
      reason:
        debt.interestRate > 15 ? `Alta tasa de interés (${debt.interestRate}%)` : 'Cuota de deuda',
      interestRate: debt.interestRate,
      remainingBalance: Number(debt.remainingAmount),
      installmentNumber: inst.installmentNumber,
      installmentId: inst.id,
    })
  }

  // 3b. Tarjetas: recibos cargados; si una tarjeta no tiene ninguno pendiente, estimación por gastos
  const cardsWithStatements = new Set(statements.map((s) => s.creditCardId))
  // Monto del recibo = lo cargado + consumos con la tarjeta posteriores a `coveredUntil`
  // dentro del ciclo del recibo (ver computeStatementDue).
  const unpaidByCard = new Map<number, Awaited<ReturnType<typeof findUnpaidCardExpenses>>>()
  for (const cardId of cardsWithStatements) {
    unpaidByCard.set(cardId, await findUnpaidCardExpenses(cardId, userId))
  }
  for (const st of statements) {
    const due = computeStatementDue(st.creditCard, st, unpaidByCard.get(st.creditCardId) ?? [])
    const extra = due.newExpensesAmount
    pushSuggestion({
      id: `card-${st.creditCardId}-statement-${st.id}`,
      type: 'creditCard',
      name: `${st.creditCard.name} - ${st.creditCard.bank}`,
      amount: due.totalAmount,
      dueDay: dayOf(st.dueDate),
      reason:
        extra > 0
          ? `Recibo de tarjeta (${formatPEN(due.baseAmount)} + ${formatPEN(extra)} en ${due.newExpenses.length} consumo(s) nuevo(s))`
          : 'Recibo de tarjeta de crédito',
      interestRate: st.creditCard.interestRate ?? undefined,
      remainingBalance: due.totalAmount,
    })
  }
  for (const card of creditCards.filter((c) => !cardsWithStatements.has(c.id))) {
    const period = await resolveActiveBillingPeriod(card, userId, now)
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        creditCardId: card.id,
        date: { gte: period.billingStartDate, lte: period.billingEndDate },
        isPaidOff: false,
      },
    })
    // En compras en cuotas se usa la cuota mensual real (installmentAmount) si existe.
    const totalAmount = expenses.reduce((sum, e) => sum + cardChargeOf(e), 0)
    if (totalAmount === 0) continue
    pushSuggestion({
      id: `card-${card.id}`,
      type: 'creditCard',
      name: `${card.name} - ${card.bank}`,
      amount: totalAmount,
      // paymentDueDate se arma con new Date(y, m, d) en hora local del servidor
      dueDay: localDayOf(period.paymentDueDate),
      reason: 'Pago de tarjeta (estimado por consumos del periodo)',
      interestRate: card.interestRate ?? undefined,
      remainingBalance: totalAmount,
    })
  }

  // 3c. Gastos fijos (sin tarjeta) que aún no se registraron en su mes
  const monthStartOfCycle = Date.UTC(cs.getUTCFullYear(), cs.getUTCMonth(), 1)
  const registeredExpenses = await prisma.expense.findMany({
    where: {
      userId,
      creditCardId: null,
      isRecurring: false,
      date: { gte: new Date(monthStartOfCycle), lt: horizonDate },
    },
  })
  for (const expense of recurringExpenses) {
    const occurrences = recurringOccurrences(
      expense.frequency,
      expense.date,
      cycleStart,
      cycleAfterNext
    )
    for (const occ of occurrences) {
      const o = new Date(occ)
      if (isMonthSkipped(expense.skippedMonths, o.getUTCFullYear(), o.getUTCMonth())) continue
      const isMonthly =
        !expense.frequency || expense.frequency === 'monthly' || expense.frequency === 'annual'
      const alreadyPaid = registeredExpenses.some((r) => {
        const rd = dayOf(r.date)
        const sameWindow = isMonthly
          ? new Date(rd).getUTCFullYear() === o.getUTCFullYear() &&
            new Date(rd).getUTCMonth() === o.getUTCMonth()
          : Math.abs(rd - occ) <= 3 * DAY_MS
        const sameExpense =
          r.description.startsWith(expense.description) ||
          (r.categoryId === expense.categoryId && Number(r.amount) === Number(expense.amount))
        return sameWindow && sameExpense
      })
      if (alreadyPaid) continue
      const isEssential = expense.category.name.toLowerCase().includes('servicios')
      pushSuggestion({
        id: `expense-${expense.id}-${toISODay(occ)}`,
        type: 'expense',
        name: expense.description,
        amount: Number(expense.amount),
        dueDay: occ,
        daysBefore: 1,
        reason: isEssential ? 'Servicio básico - Priorizar para evitar cortes' : 'Gasto fijo',
      })
    }
  }

  suggestions.sort((a, b) => {
    if (a.cycle !== b.cycle) return a.cycle === 'current' ? -1 : 1
    const diff =
      (PRIORITY_ORDER[a.priority as Priority] ?? 99) -
      (PRIORITY_ORDER[b.priority as Priority] ?? 99)
    return diff !== 0 ? diff : a.dueDate.localeCompare(b.dueDate)
  })

  // ── 4. Resumen por ciclo ───────────────────────────────────────────────────
  const safetyBuffer = expectedSalary * 0.1
  const sumOf = (cycle: 'current' | 'next') =>
    suggestions.filter((s) => s.cycle === cycle).reduce((sum, s) => sum + s.amount, 0)

  const currentObligations = sumOf('current')
  const currentResult = available - currentObligations
  const current: PaymentCycle = {
    startDate: toISODay(cycleStart),
    endDate: toISODay(nextSalary),
    income: received,
    spent,
    carryOver: 0,
    available,
    obligationsTotal: currentObligations,
    obligationsCount: suggestions.filter((s) => s.cycle === 'current').length,
    result: currentResult,
    resultWithoutCarry: currentResult,
    status: statusFor(currentResult, safetyBuffer),
  }

  const nextObligations = sumOf('next')
  const nextResult = currentResult + expectedSalary - nextObligations
  const next: PaymentCycle = {
    startDate: toISODay(nextSalary),
    endDate: toISODay(cycleAfterNext),
    income: expectedSalary,
    spent: 0,
    carryOver: currentResult,
    available: currentResult + expectedSalary,
    obligationsTotal: nextObligations,
    obligationsCount: suggestions.filter((s) => s.cycle === 'next').length,
    result: nextResult,
    resultWithoutCarry: expectedSalary - nextObligations,
    status: statusFor(nextResult, safetyBuffer),
  }

  // ── 5. Advertencias ────────────────────────────────────────────────────────
  const warnings: string[] = []
  const nextSalaryLabel = fmtDay(nextSalary)
  if (salaryOverdue) {
    warnings.push(
      `💼 Tu sueldo del ${nextSalaryLabel} aún no está registrado. Regístralo en Ingresos para cerrar el ciclo.`
    )
  }
  const overdue = suggestions.filter((s) => s.isOverdue)
  if (overdue.length > 0) {
    warnings.push(
      `🚨 Tienes ${overdue.length} pago(s) vencido(s) por ${formatPEN(overdue.reduce((s, p) => s + p.amount, 0))}.`
    )
  }
  if (current.status === 'deficit') {
    warnings.push(
      `🚨 Te faltan ${formatPEN(-current.result)} para cubrir lo que vence antes de tu sueldo del ${nextSalaryLabel}.`
    )
  } else if (current.obligationsCount === 0) {
    warnings.push(`✅ Todo lo que vence antes de tu sueldo del ${nextSalaryLabel} ya está pagado.`)
  } else if (current.status === 'tight') {
    warnings.push(
      '⚠️ El ciclo actual está ajustado. Evita gastos innecesarios hasta tu próximo sueldo.'
    )
  }
  if (expectedSalary > 0) {
    if (next.resultWithoutCarry < 0) {
      warnings.push(
        `📅 Con el sueldo del ${nextSalaryLabel} (${formatPEN(expectedSalary)}) te faltarán ${formatPEN(-next.resultWithoutCarry)} para los pagos hasta el ${fmtDay(cycleAfterNext - DAY_MS)}.`
      )
    } else {
      warnings.push(
        `📅 El sueldo del ${nextSalaryLabel} cubre los pagos del siguiente ciclo y te sobran ${formatPEN(next.resultWithoutCarry)}.`
      )
    }
  }
  const highInterestDebts = new Set(
    suggestions
      .filter((s) => s.type === 'debt' && (s.interestRate ?? 0) > 20)
      .map((s) => s.name.split(' - ')[0])
  )
  if (highInterestDebts.size > 0) {
    warnings.push(`🔥 Tienes ${highInterestDebts.size} deuda(s) con interés mayor al 20%.`)
  }

  // ── 6. Proyección diaria hasta el fin del próximo ciclo ────────────────────
  const cashFlowProjection: CashFlowDay[] = []
  let runningBalance = available
  const salaryEventDay = expectedSalary > 0 ? Math.max(nextSalary, today) : null
  for (let day = today; day < cycleAfterNext; day += DAY_MS) {
    const iso = toISODay(day)
    if (day === salaryEventDay) {
      runningBalance += expectedSalary
      cashFlowProjection.push({
        date: iso,
        income: expectedSalary,
        expenses: 0,
        balance: runningBalance,
        payments: [],
        type: 'income',
      })
    }
    const dayPayments = suggestions.filter((s) => s.suggestedPaymentDate === iso)
    if (dayPayments.length > 0) {
      const dayExpenses = dayPayments.reduce((sum, p) => sum + p.amount, 0)
      runningBalance -= dayExpenses
      cashFlowProjection.push({
        date: iso,
        income: 0,
        expenses: dayExpenses,
        balance: runningBalance,
        payments: dayPayments,
        type: 'expense',
      })
    }
  }

  return {
    summary: {
      // Campos históricos, ahora referidos al ciclo actual
      totalIncome: received,
      totalObligations: currentObligations,
      availableBalance: available,
      currentBalance: available,
      suggestedSafetyBuffer: safetyBuffer,
      cashFlowStatus: current.status,
      warnings,
      pendingIncome: expectedSalary,
      projectedBalance: currentResult,
      salaryPending: salaryOverdue,
    },
    cycles: { current, next },
    suggestions,
    cashFlowProjection,
  }
}
