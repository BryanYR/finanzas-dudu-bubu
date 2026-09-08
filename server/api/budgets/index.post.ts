import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, BudgetSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(BudgetSchema, await readBody(event))

  const startDate = new Date(body.startDate)
  const endDate = new Date(body.endDate)

  if (endDate <= startDate) {
    throw createError({
      statusCode: 400,
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    })
  }

  const budget = await prisma.budgetProjection.create({
    data: {
      name: body.name,
      totalBudget: body.totalBudget,
      startDate,
      endDate,
      description: body.description,
      expectedIncome: body.expectedIncome,
      fixedExpenses: body.fixedExpenses,
      debtPayments: body.debtPayments,
      availableAmount: body.availableAmount,
      debitUsage: body.debitUsage,
      creditUsage: body.creditUsage,
      savingsImpact: body.savingsImpact,
      userId: user.id,
    },
  })
  return serializeDecimals(budget)
})
