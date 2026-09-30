import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, ExpenseSkippedMonthsSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

// Reemplaza la lista de meses omitidos de un gasto recurrente. Un mes omitido
// no se cuenta en proyecciones ni en el plan de pagos, y no se acumula.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  const body = validateBody(ExpenseSkippedMonthsSchema, await readBody(event))

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense || expense.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Gasto no encontrado' })
  }
  if (!expense.isRecurring) {
    throw createError({
      statusCode: 400,
      message: 'Solo los gastos recurrentes pueden omitir meses',
    })
  }

  const skippedMonths = [...new Set(body.skippedMonths)].sort()

  const updated = await prisma.expense.update({
    where: { id },
    data: { skippedMonths },
  })
  return serializeDecimals(updated)
})
