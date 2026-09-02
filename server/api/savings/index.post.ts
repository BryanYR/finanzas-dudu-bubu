import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, SavingsGoalSchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = validateBody(SavingsGoalSchema, await readBody(event))

  return prisma.savingsGoal.create({
    data: {
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount,
      deadline: body.deadline ? new Date(body.deadline) : null,
      priority: body.priority,
      description: body.description,
      userId: user.id,
    },
  })
})
