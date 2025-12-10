import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  return prisma.budgetProjection.create({
    data: {
      name: body.name,
      totalBudget: body.totalBudget,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      description: body.description,
      expectedIncome: body.expectedIncome || 0,
      fixedExpenses: body.fixedExpenses || 0,
      debtPayments: body.debtPayments || 0,
      availableAmount: body.availableAmount || 0,
      debitUsage: body.debitUsage || 0,
      creditUsage: body.creditUsage || 0,
      savingsImpact: body.savingsImpact || 0,
      userId: user.id,
    },
  })
})
