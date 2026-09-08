import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, SavingsGoalSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(SavingsGoalSchema, await readBody(event))

  const savingsGoal = await prisma.savingsGoal.create({
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
  return serializeDecimals(savingsGoal)
})
