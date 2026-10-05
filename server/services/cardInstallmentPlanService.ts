import { Prisma } from '@prisma/client'
import { prisma } from '@server/utils/db'

// Lima es UTC-5 fijo (sin horario de verano) y el server corre en UTC (Vercel). Los
// vencimientos (plan y CreditCardStatement) se guardan a mediodía Lima (17:00Z): para leer
// año/mes/día Lima se corre el instante -5h y se usan getters UTC (mismo criterio que
// reportService.ts / dashboardService.ts).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000
const NOON_LIMA = { h: 12, mi: 0, s: 0, ms: 0 }

const pad = (n: number) => String(n).padStart(2, '0')

interface LimaParts {
  y: number
  /** 0-11 */
  m: number
  d: number
  /** Hora local Lima, para reconstruir el instante conservando la hora del día */
  time: { h: number; mi: number; s: number; ms: number }
}

function limaParts(date: Date): LimaParts {
  const l = new Date(date.getTime() - LIMA_OFFSET_MS)
  return {
    y: l.getUTCFullYear(),
    m: l.getUTCMonth(),
    d: l.getUTCDate(),
    time: {
      h: l.getUTCHours(),
      mi: l.getUTCMinutes(),
      s: l.getUTCSeconds(),
      ms: l.getUTCMilliseconds(),
    },
  }
}

/** Índice absoluto de mes (año*12 + mes) para comparar/restar meses sin Date. */
const monthIndex = (p: { y: number; m: number }) => p.y * 12 + p.m
const monthKeyOfIndex = (idx: number) => `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/** Instante UTC del día Lima (año, mes 0-11, día) a la hora Lima indicada; el día se acota al fin de mes. */
function limaInstant(y: number, m: number, d: number, time: LimaParts['time']): Date {
  // Date.UTC normaliza meses fuera de rango (m < 0 o m > 11)
  const norm = new Date(Date.UTC(y, m, 1))
  const day = Math.min(d, daysInMonth(norm.getUTCFullYear(), norm.getUTCMonth()))
  return new Date(
    Date.UTC(norm.getUTCFullYear(), norm.getUTCMonth(), day, time.h, time.mi, time.s, time.ms) +
      LIMA_OFFSET_MS
  )
}

/** Vencimiento de la cuota `n` (1-based): firstDueDate + (n-1) meses, mismo día (acotado a fin de mes). */
export function installmentDueDate(firstDueDate: Date, n: number): Date {
  const p = limaParts(firstDueDate)
  return limaInstant(p.y, p.m + (n - 1), p.d, p.time)
}

/** Redondea a 2 decimales y pasa a number recién al final (Decimal-safe). */
const toMoney = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toNumber()

export interface CardInstallmentPlanRow {
  id: number
  description: string
  totalInstallments: number
  installmentAmount: Prisma.Decimal | number | string
  firstDueDate: Date
  principal: Prisma.Decimal | number | string | null
  interestRate: number | null
  notes: string | null
  isActive: boolean
  creditCardId: number
}

export interface CardInstallmentPlanView {
  id: number
  description: string
  totalInstallments: number
  installmentAmount: number
  firstDueDate: Date
  principal: number | null
  interestRate: number | null
  notes: string | null
  isActive: boolean
  creditCardId: number
  /** Cuota que vence en el próximo recibo (acotada a 1..totalInstallments) */
  currentInstallment: number
  /** Cuotas por pagar contando la del próximo recibo; 0 si el plan ya terminó */
  remainingInstallments: number
  lastDueDate: Date
  /** installmentAmount * remainingInstallments */
  remainingAmount: number
}

export interface CardInstallmentProjectionMonth {
  /** 'YYYY-MM' del vencimiento (mes Lima) */
  month: string
  dueDate: Date
  total: number
  items: Array<{
    planId: number
    description: string
    installmentNumber: number
    totalInstallments: number
    amount: number
  }>
  /** Monto del CreditCardStatement de la tarjeta con vencimiento en ese mes, o null */
  statementAmount: number | null
}

/**
 * Próximo vencimiento de la tarjeta: el `paymentDay` de este mes Lima si todavía no pasó
 * (el día de hoy cuenta como "próximo"), o el del mes siguiente.
 */
function nextDueMonthIndex(paymentDay: number, today: Date): number {
  const t = limaParts(today)
  const day = Math.min(paymentDay, daysInMonth(t.y, t.m))
  return monthIndex(t) + (t.d <= day ? 0 : 1)
}

/**
 * Cálculo puro (sin BD): enriquece los planes con cuota actual/restantes/fin/saldo y arma la
 * proyección mensual de cuotas de los planes activos desde el próximo recibo hasta la última cuota.
 */
export function computeCardInstallmentOverview(
  plans: CardInstallmentPlanRow[],
  statements: Array<{ dueDate: Date; amount: Prisma.Decimal | number | string }>,
  paymentDay: number,
  today = new Date()
): { plans: CardInstallmentPlanView[]; projection: CardInstallmentProjectionMonth[] } {
  const nextIdx = nextDueMonthIndex(paymentDay, today)

  // Recibos cargados por mes de vencimiento (el más temprano del mes manda)
  const statementByMonth = new Map<string, Prisma.Decimal>()
  for (const s of statements) {
    const p = limaParts(s.dueDate)
    const key = monthKeyOfIndex(monthIndex(p))
    if (!statementByMonth.has(key)) statementByMonth.set(key, new Prisma.Decimal(s.amount))
  }

  const planViews: CardInstallmentPlanView[] = []
  const byMonth = new Map<
    number,
    { items: CardInstallmentProjectionMonth['items']; total: Prisma.Decimal }
  >()

  for (const plan of plans) {
    const amount = new Prisma.Decimal(plan.installmentAmount)
    const firstIdx = monthIndex(limaParts(plan.firstDueDate))
    // Cuota que vence en el próximo recibo (puede ser <1 si el plan aún no empieza o >total si terminó)
    const dueN = nextIdx - firstIdx + 1
    const firstPending = Math.max(dueN, 1)
    const remaining = Math.max(0, plan.totalInstallments - firstPending + 1)

    planViews.push({
      id: plan.id,
      description: plan.description,
      totalInstallments: plan.totalInstallments,
      installmentAmount: toMoney(amount),
      firstDueDate: plan.firstDueDate,
      principal: plan.principal == null ? null : toMoney(new Prisma.Decimal(plan.principal)),
      interestRate: plan.interestRate,
      notes: plan.notes,
      isActive: plan.isActive,
      creditCardId: plan.creditCardId,
      currentInstallment: Math.min(firstPending, plan.totalInstallments),
      remainingInstallments: remaining,
      lastDueDate: installmentDueDate(plan.firstDueDate, plan.totalInstallments),
      remainingAmount: toMoney(amount.mul(remaining)),
    })

    if (!plan.isActive) continue
    for (let n = firstPending; n <= plan.totalInstallments; n++) {
      const idx = firstIdx + n - 1
      const bucket = byMonth.get(idx) ?? { items: [], total: new Prisma.Decimal(0) }
      bucket.items.push({
        planId: plan.id,
        description: plan.description,
        installmentNumber: n,
        totalInstallments: plan.totalInstallments,
        amount: toMoney(amount),
      })
      bucket.total = bucket.total.add(amount)
      byMonth.set(idx, bucket)
    }
  }

  const projection: CardInstallmentProjectionMonth[] = []
  if (byMonth.size > 0) {
    const lastIdx = Math.max(...byMonth.keys())
    for (let idx = nextIdx; idx <= lastIdx; idx++) {
      const bucket = byMonth.get(idx)
      const key = monthKeyOfIndex(idx)
      const stmt = statementByMonth.get(key)
      projection.push({
        month: key,
        dueDate: limaInstant(Math.floor(idx / 12), idx % 12, paymentDay, NOON_LIMA),
        total: bucket ? toMoney(bucket.total) : 0,
        items: bucket?.items ?? [],
        statementAmount: stmt ? toMoney(stmt) : null,
      })
    }
  }

  return { plans: planViews, projection }
}

/** Planes de cuotas de la tarjeta + proyección mensual. La tarjeta debe ser del usuario (la ruta lo verifica). */
export async function getCardInstallmentOverview(
  card: { id: number; paymentDay: number },
  userId: number,
  today = new Date()
) {
  const [plans, statements] = await Promise.all([
    prisma.cardInstallmentPlan.findMany({
      where: { creditCardId: card.id, userId },
      orderBy: [{ firstDueDate: 'asc' }, { id: 'asc' }],
    }),
    prisma.creditCardStatement.findMany({
      where: { creditCardId: card.id, userId },
      orderBy: { dueDate: 'asc' },
    }),
  ])
  return computeCardInstallmentOverview(plans, statements, card.paymentDay, today)
}
