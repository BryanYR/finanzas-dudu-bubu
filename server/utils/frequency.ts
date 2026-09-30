/**
 * Frecuencias soportadas por `Income.frequency` / `Expense.frequency`.
 */
export type Frequency = 'monthly' | 'biweekly' | 'weekly' | 'annual'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

/**
 * Convierte una fecha a un número de milisegundos UTC que representa
 * únicamente su día calendario (año/mes/día en hora LOCAL del proceso,
 * igual que el resto del código del server que ya usa `Date` sin timezone
 * explícito — ver `generate-recurring.post.ts` / `payment-plan/suggestions.get.ts`).
 * Esto permite comparar "días" sin que la hora del día afecte el resultado.
 */
function toDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Número de días que tiene `month` (0-indexado) en `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function isWithinRange(day: number, startDay: number, endDay: number): boolean {
  return day >= startDay && day <= endDay
}

/** Lista de meses (año/mes 0-indexado) que el rango [startDay, endDay] toca. */
function monthsOverlapping(
  startDay: number,
  endDay: number
): Array<{ year: number; month: number }> {
  const start = new Date(startDay)
  const end = new Date(endDay)

  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()
  const endYear = end.getUTCFullYear()
  const endMonth = end.getUTCMonth()

  const months: Array<{ year: number; month: number }> = []
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month })
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }
  return months
}

function countMonthly(anchorDate: Date, startDay: number, endDay: number): number {
  const anchorDay = anchorDate.getDate()
  let count = 0
  for (const { year, month } of monthsOverlapping(startDay, endDay)) {
    // Clamp al último día del mes si `anchorDay` no existe en ese mes (ej: 31 en febrero).
    const clampedDay = Math.min(anchorDay, daysInMonth(year, month))
    const occurrence = Date.UTC(year, month, clampedDay)
    if (isWithinRange(occurrence, startDay, endDay)) count++
  }
  return count
}

function countBiweekly(startDay: number, endDay: number): number {
  let count = 0
  for (const { year, month } of monthsOverlapping(startDay, endDay)) {
    const day15 = Date.UTC(year, month, 15)
    const lastDay = Date.UTC(year, month, daysInMonth(year, month))
    if (isWithinRange(day15, startDay, endDay)) count++
    if (isWithinRange(lastDay, startDay, endDay)) count++
  }
  return count
}

function countWeekly(anchorDate: Date, startDay: number, endDay: number): number {
  const anchorDay = toDayNumber(anchorDate)
  if (anchorDay > endDay) return 0

  let firstOccurrence = anchorDay
  if (firstOccurrence < startDay) {
    const weeksToSkip = Math.ceil((startDay - firstOccurrence) / MS_PER_WEEK)
    firstOccurrence += weeksToSkip * MS_PER_WEEK
  }
  if (firstOccurrence > endDay) return 0

  return Math.floor((endDay - firstOccurrence) / MS_PER_WEEK) + 1
}

function countAnnual(anchorDate: Date, startDay: number, endDay: number): number {
  const anchorMonth = anchorDate.getMonth()
  const anchorDayOfMonth = anchorDate.getDate()
  const startYear = new Date(startDay).getUTCFullYear()
  const endYear = new Date(endDay).getUTCFullYear()

  let count = 0
  for (let year = startYear; year <= endYear; year++) {
    const clampedDay = Math.min(anchorDayOfMonth, daysInMonth(year, anchorMonth))
    const occurrence = Date.UTC(year, anchorMonth, clampedDay)
    if (isWithinRange(occurrence, startDay, endDay)) count++
  }
  return count
}

/**
 * Cuenta cuántas ocurrencias de un ingreso/gasto recurrente (`frequency`,
 * anclado en `anchorDate` — la fecha original del registro) caen dentro de
 * `[rangeStart, rangeEnd]` (ambos límites inclusive, comparados por día
 * calendario, ignorando la hora del día).
 *
 * Reglas:
 * - `monthly`: una ocurrencia por mes, en el día-del-mes de `anchorDate`
 *   (clamp al último día si el mes es más corto, ej. 31 → 28/29 en febrero).
 * - `biweekly`: dos ocurrencias por mes, en el día 15 y el último día.
 * - `weekly`: una ocurrencia cada 7 días desde `anchorDate`.
 * - `annual`: una ocurrencia por año si el aniversario (mes/día de
 *   `anchorDate`) cae dentro del rango.
 *
 * `skippedMonths` ("YYYY-MM") descuenta las ocurrencias que caen en meses
 * omitidos (ej. un gasto fijo que no se paga ese mes por acuerdo).
 */
export function countOccurrencesInRange(
  frequency: Frequency,
  anchorDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  skippedMonths: string[] = []
): number {
  const startDay = toDayNumber(rangeStart)
  const endDay = toDayNumber(rangeEnd)
  if (startDay > endDay) return 0

  const total = countRaw(frequency, anchorDate, startDay, endDay)
  if (skippedMonths.length === 0) return total

  // Resta las ocurrencias que caen en meses omitidos (intersección mes ∩ rango).
  let skipped = 0
  for (const { year, month } of monthsOverlapping(startDay, endDay)) {
    if (!skippedMonths.includes(toYearMonth(year, month))) continue
    const monthStart = Math.max(startDay, Date.UTC(year, month, 1))
    const monthEnd = Math.min(endDay, Date.UTC(year, month, daysInMonth(year, month)))
    skipped += countRaw(frequency, anchorDate, monthStart, monthEnd)
  }
  return Math.max(0, total - skipped)
}

/** Clave "YYYY-MM" para `month` 0-indexado — mismo formato que `Expense.skippedMonths`. */
export function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** true si el gasto recurrente está omitido en el mes (0-indexado) indicado. */
export function isMonthSkipped(
  skippedMonths: string[] | null | undefined,
  year: number,
  month: number
): boolean {
  return !!skippedMonths?.includes(toYearMonth(year, month))
}

function countRaw(
  frequency: Frequency,
  anchorDate: Date,
  startDay: number,
  endDay: number
): number {
  switch (frequency) {
    case 'monthly':
      return countMonthly(anchorDate, startDay, endDay)
    case 'biweekly':
      return countBiweekly(startDay, endDay)
    case 'weekly':
      return countWeekly(anchorDate, startDay, endDay)
    case 'annual':
      return countAnnual(anchorDate, startDay, endDay)
    default:
      return 0
  }
}
