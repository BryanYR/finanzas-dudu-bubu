import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, BudgetUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)

  const budget = await prisma.budgetProjection.findUnique({ where: { id } })
  if (!budget || budget.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Presupuesto no encontrado' })
  }

  const body = validateBody(BudgetUpdateSchema, await readBody(event))

  const updated = await prisma.budgetProjection.update({
    where: { id },
    data: { isCompleted: body.isCompleted },
  })

  return serializeDecimals(updated)
})
