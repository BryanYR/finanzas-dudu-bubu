import { Prisma } from '@prisma/client'

/**
 * Recursively converts any `Prisma.Decimal` instance found within a value
 * (object, array, or nested combination thereof) into a plain JS `number`.
 *
 * Money fields (Income.amount, Expense.amount, Debt.totalAmount, etc.) are
 * stored as `Decimal` in the DB for precision, so Prisma Client returns
 * `Prisma.Decimal` instances (decimal.js-backed) for them instead of plain
 * numbers. Those instances don't support native arithmetic/comparison
 * operators (`+`, `<=`, etc.) and don't `JSON.stringify` as numbers, which
 * would silently break both server-side math and the frontend contract
 * (Vue components expect plain numbers for `.toFixed()`, Chart.js, v-model,
 * etc.). Call this right before returning any Prisma result (or an object
 * built from one) from an API handler.
 */
export function serializeDecimals<T>(value: T): T {
  if (value instanceof Prisma.Decimal) {
    return Number(value) as unknown as T
  }
  if (value instanceof Date) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeDecimals(val)
    }
    return result as T
  }
  return value
}
