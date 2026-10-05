import { Prisma } from '@prisma/client'
import { prisma } from '@server/utils/db'
import { countOccurrencesInRange, type Frequency } from '@server/utils/frequency'

// Lima es UTC-5 fijo (sin horario de verano). Las fechas se guardan como medianoche Lima
// (05:00Z) y el server corre en UTC (Vercel): para agrupar por mes/día hay que correr el
// instante -5h y leer con getters UTC (mismo criterio que dashboardService.ts).
const LIMA_OFFSET_HOURS = 5
const LIMA_OFFSET_MS = LIMA_OFFSET_HOURS * 60 * 60 * 1000
const MAX_RANGE_MONTHS = 36
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Los pagos de tarjeta se registran como gasto de débito con esta descripción
// (ver credit-cards/[id]/pay.post.ts); no hay otro marcador en el modelo.
const CARD_PAYMENT_PREFIX = 'Pago Tarjeta '

export type ReportBasis = 'consumo' | 'caja'

export interface ReportRange {
  /** Primer día (YYYY-MM-DD, hora Lima), inclusive */
  from: string
  /** Último día (YYYY-MM-DD, hora Lima), inclusive */
  to: string
}

// ─── Fechas (hora Lima) ────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

function parseDay(day: string) {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return { y, m: m - 1, d }
}

/** Instante UTC en que empieza el día Lima `day` (YYYY-MM-DD). */
function dayStart(day: string): Date {
  const { y, m, d } = parseDay(day)
  return new Date(Date.UTC(y, m, d, LIMA_OFFSET_HOURS))
}

/** Instante UTC en que empieza el día siguiente a `day` (límite superior exclusivo). */
function dayEndExclusive(day: string): Date {
  const { y, m, d } = parseDay(day)
  return new Date(Date.UTC(y, m, d + 1, LIMA_OFFSET_HOURS))
}

function limaParts(date: Date) {
  const lima = new Date(date.getTime() - LIMA_OFFSET_MS)
  return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate() }
}

export function limaDay(date: Date): string {
  const { y, m, d } = limaParts(date)
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Clave "YYYY-MM" (mes calendario Lima) de un instante. */
export function limaMonthKey(date: Date): string {
  const { y, m } = limaParts(date)
  return `${y}-${pad(m + 1)}`
}

const addDays = (day: string, delta: number) => {
  const { y, m, d } = parseDay(day)
  return new Date(Date.UTC(y, m, d + delta)).toISOString().slice(0, 10)
}

const daysBetweenInclusive = (from: string, to: string) =>
  Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / MS_PER_DAY) + 1

/** Meses "YYYY-MM" que toca el rango, en orden. */
function monthsInRange(range: ReportRange): string[] {
  const start = parseDay(range.from)
  const end = parseDay(range.to)
  const months: string[] = []
  let y = start.y
  let m = start.m
  while (y < end.y || (y === end.y && m <= end.m)) {
    months.push(`${y}-${pad(m + 1)}`)
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return months
}

/**
 * Normaliza el rango pedido: `to` por defecto es hoy (Lima) y `from` por defecto es el mes
 * del primer registro (ingreso o gasto), con tope de 36 meses hacia atrás desde `to`.
 */
export async function resolveReportRange(
  userId: number,
  input: { from?: string; to?: string }
): Promise<ReportRange> {
  const to = input.to ?? limaDay(new Date())

  let from = input.from
  if (!from) {
    const [incomeMin, expenseMin] = await Promise.all([
      prisma.income.aggregate({ where: { userId }, _min: { date: true } }),
      prisma.expense.aggregate({ where: { userId }, _min: { date: true } }),
    ])
    const earliest = [incomeMin._min.date, expenseMin._min.date]
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0]
    from = earliest ? `${limaMonthKey(earliest)}-01` : `${to.slice(0, 7)}-01`

    // Tope de 36 meses: empieza en el día 1 del mes que está 35 meses antes del de `to`
    const { y, m } = parseDay(to)
    const floor = new Date(Date.UTC(y, m - (MAX_RANGE_MONTHS - 1), 1)).toISOString().slice(0, 10)
    if (from < floor) from = floor
    if (from > to) from = `${to.slice(0, 7)}-01`
  }

  if (from > to) {
    throw createError({ statusCode: 400, message: 'La fecha inicial debe ser anterior a la final' })
  }
  if (monthsInRange({ from, to }).length > MAX_RANGE_MONTHS) {
    throw createError({
      statusCode: 400,
      message: `El rango no puede superar ${MAX_RANGE_MONTHS} meses`,
    })
  }
  return { from, to }
}

/** Rango inmediatamente anterior y de la misma duración (para comparar períodos). */
export function previousRange(range: ReportRange): ReportRange {
  const length = daysBetweenInclusive(range.from, range.to)
  const to = addDays(range.from, -1)
  return { from: addDays(to, -(length - 1)), to }
}

// ─── Dinero ────────────────────────────────────────────────────────────────

// Los montos son Decimal(12,2): se suman como Decimal y se convierten a number solo
// al devolverlos, para no arrastrar error de coma flotante entre muchas filas.
const ZERO = new Prisma.Decimal(0)
const money = (d: Prisma.Decimal) => Number(d.toDecimalPlaces(2))

class DecimalMap {
  private map = new Map<string, Prisma.Decimal>()
  add(key: string, value: Prisma.Decimal | number) {
    this.map.set(key, (this.map.get(key) ?? ZERO).plus(value))
  }
  get(key: string) {
    return this.map.get(key) ?? ZERO
  }
  total() {
    let t = ZERO
    for (const v of this.map.values()) t = t.plus(v)
    return t
  }
}

// ─── Gastos ────────────────────────────────────────────────────────────────

interface ExpenseLine {
  month: string
  categoryId: number
  amount: Prisma.Decimal
  /** true = ocurrencia de un gasto recurrente (fijo); false = gasto puntual/variable */
  fixed: boolean
  /** Cantidad de gastos/ocurrencias que representa la línea */
  count: number
}

/**
 * Gastos del rango como líneas por mes:
 * - Gastos no recurrentes: una línea por fila, en el mes de su fecha.
 * - Gastos recurrentes: son UNA fila plantilla (a diferencia de los ingresos, no se copian
 *   cada mes), así que se expanden con `countOccurrencesInRange` desde su fecha de inicio,
 *   respetando `skippedMonths`. En el mes en curso solo cuenta hasta hoy.
 */
async function loadExpenseLines(
  userId: number,
  range: ReportRange,
  basis: ReportBasis,
  categoryIds?: number[]
): Promise<ExpenseLine[]> {
  const start = dayStart(range.from)
  const endExclusive = dayEndExclusive(range.to)

  const common: Prisma.ExpenseWhereInput = {
    userId,
    ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
    ...(basis === 'caja'
      ? { paymentMethod: { not: 'credit' } }
      : { NOT: { description: { startsWith: CARD_PAYMENT_PREFIX } } }),
  }

  const [rows, templates] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...common,
        date: { gte: start, lt: endExclusive },
        OR: [{ isRecurring: false }, { frequency: null }],
      },
      select: { date: true, amount: true, categoryId: true, description: true },
    }),
    prisma.expense.findMany({
      where: {
        ...common,
        isRecurring: true,
        frequency: { not: null },
        date: { lt: endExclusive },
      },
      select: {
        date: true,
        amount: true,
        categoryId: true,
        description: true,
        frequency: true,
        skippedMonths: true,
      },
    }),
  ])

  const lines: ExpenseLine[] = rows.map((r) => ({
    month: limaMonthKey(r.date),
    categoryId: r.categoryId,
    amount: r.amount,
    fixed: false,
    count: 1,
  }))

  // Igual que payment-plan: si el mes ya tiene un gasto registrado a mano con la misma
  // descripción (o misma categoría y monto), ese gasto reemplaza a la ocurrencia del recurrente
  const registered = new Set<string>()
  for (const r of rows) {
    const month = limaMonthKey(r.date)
    registered.add(`${month}|${r.description.trim().toLowerCase()}`)
    registered.add(`${month}|${r.categoryId}|${r.amount.toFixed(2)}`)
  }

  const today = limaDay(new Date())
  const months = monthsInRange(range)

  for (const t of templates) {
    const anchor = limaParts(t.date)
    // frequency.ts lee Date con getters locales: se pasan fechas construidas con
    // año/mes/día Lima para que el resultado no dependa de la zona del servidor.
    const anchorDate = new Date(anchor.y, anchor.m, anchor.d)
    const anchorDay = limaDay(t.date)

    for (const month of months) {
      if (
        registered.has(`${month}|${t.description.trim().toLowerCase()}`) ||
        registered.has(`${month}|${t.categoryId}|${t.amount.toFixed(2)}`)
      )
        continue
      const { y, m } = parseDay(`${month}-01`)
      const lastOfMonth = `${month}-${pad(new Date(Date.UTC(y, m + 1, 0)).getUTCDate())}`
      // Intersección de: rango pedido ∩ mes ∩ [inicio del recurrente, hoy]
      const from = [range.from, `${month}-01`, anchorDay].sort().at(-1)!
      const to = [range.to, lastOfMonth, today].sort().at(0)!
      if (from > to) continue

      const a = parseDay(from)
      const b = parseDay(to)
      const occurrences = countOccurrencesInRange(
        t.frequency as Frequency,
        anchorDate,
        new Date(a.y, a.m, a.d),
        new Date(b.y, b.m, b.d),
        t.skippedMonths
      )
      if (occurrences > 0) {
        lines.push({
          month,
          categoryId: t.categoryId,
          amount: t.amount.mul(occurrences),
          fixed: true,
          count: occurrences,
        })
      }
    }
  }
  return lines
}

// ─── Resumen mensual ───────────────────────────────────────────────────────

const rate = (net: Prisma.Decimal, income: Prisma.Decimal) =>
  income.gt(0) ? Number(net.div(income).toDecimalPlaces(4)) : null

export async function getMonthlySummary(userId: number, range: ReportRange, basis: ReportBasis) {
  const start = dayStart(range.from)
  const endExclusive = dayEndExclusive(range.to)

  const [lines, incomes, debtPayments] = await Promise.all([
    loadExpenseLines(userId, range, basis),
    prisma.income.findMany({
      where: { userId, date: { gte: start, lt: endExclusive } },
      select: { date: true, amount: true },
    }),
    prisma.debtPayment.findMany({
      where: { debt: { userId }, date: { gte: start, lt: endExclusive } },
      select: { date: true, amount: true },
    }),
  ])

  const income = new DecimalMap()
  const fixed = new DecimalMap()
  const variable = new DecimalMap()
  const debt = new DecimalMap()
  for (const i of incomes) income.add(limaMonthKey(i.date), i.amount)
  for (const l of lines) (l.fixed ? fixed : variable).add(l.month, l.amount)
  for (const p of debtPayments) debt.add(limaMonthKey(p.date), p.amount)

  const currentMonth = limaMonthKey(new Date())
  const months = monthsInRange(range).map((month) => {
    const inc = income.get(month)
    const fx = fixed.get(month)
    const vr = variable.get(month)
    const dp = debt.get(month)
    const net = inc.minus(fx).minus(vr).minus(dp)
    return {
      month,
      isPartial: month === currentMonth,
      income: money(inc),
      fixedExpenses: money(fx),
      variableExpenses: money(vr),
      expenses: money(fx.plus(vr)),
      debtPayments: money(dp),
      net: money(net),
      savingsRate: rate(net, inc),
    }
  })

  const totalIncome = income.total()
  const totalFixed = fixed.total()
  const totalVariable = variable.total()
  const totalDebt = debt.total()
  const totalNet = totalIncome.minus(totalFixed).minus(totalVariable).minus(totalDebt)
  const n = Math.max(months.length, 1)

  return {
    ...range,
    basis,
    months,
    totals: {
      income: money(totalIncome),
      fixedExpenses: money(totalFixed),
      variableExpenses: money(totalVariable),
      expenses: money(totalFixed.plus(totalVariable)),
      debtPayments: money(totalDebt),
      net: money(totalNet),
      savingsRate: rate(totalNet, totalIncome),
    },
    monthlyAverage: {
      income: money(totalIncome.div(n)),
      expenses: money(totalFixed.plus(totalVariable).div(n)),
      net: money(totalNet.div(n)),
    },
  }
}

// ─── Gastos por categoría ──────────────────────────────────────────────────

export async function getExpensesByCategory(
  userId: number,
  range: ReportRange,
  basis: ReportBasis,
  categoryIds?: number[]
) {
  const prev = previousRange(range)
  const [lines, prevLines] = await Promise.all([
    loadExpenseLines(userId, range, basis, categoryIds),
    loadExpenseLines(userId, prev, basis, categoryIds),
  ])

  const totals = new DecimalMap()
  const prevTotals = new DecimalMap()
  const counts = new Map<number, number>()
  for (const l of lines) {
    totals.add(String(l.categoryId), l.amount)
    counts.set(l.categoryId, (counts.get(l.categoryId) ?? 0) + l.count)
  }
  for (const l of prevLines) prevTotals.add(String(l.categoryId), l.amount)

  const ids = [...new Set(lines.map((l) => l.categoryId))]
  const categories = await prisma.category.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true, name: true, icon: true, color: true },
  })
  const byId = new Map(categories.map((c) => [c.id, c]))

  const total = totals.total()
  const prevTotal = prevTotals.total()
  const pct = (part: Prisma.Decimal, whole: Prisma.Decimal) =>
    whole.gt(0) ? Number(part.div(whole).mul(100).toDecimalPlaces(1)) : null

  const rows = ids
    .map((id) => {
      const t = totals.get(String(id))
      const p = prevTotals.get(String(id))
      const cat = byId.get(id)
      return {
        categoryId: id,
        name: cat?.name ?? 'Sin categoría',
        icon: cat?.icon ?? null,
        color: cat?.color ?? null,
        total: money(t),
        count: counts.get(id) ?? 0,
        percentage: pct(t, total) ?? 0,
        previousTotal: money(p),
        // null = no hay base de comparación (la categoría no tuvo gasto en el período anterior)
        change: p.gt(0) ? Number(t.minus(p).div(p).mul(100).toDecimalPlaces(1)) : null,
      }
    })
    .sort((a, b) => b.total - a.total)

  return {
    ...range,
    basis,
    total: money(total),
    previous: { ...prev, total: money(prevTotal) },
    change: prevTotal.gt(0)
      ? Number(total.minus(prevTotal).div(prevTotal).mul(100).toDecimalPlaces(1))
      : null,
    categories: rows,
  }
}
