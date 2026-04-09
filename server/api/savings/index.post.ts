import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber } from '@server/utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  assertRequired(body, ['name', 'targetAmount'])
  assertPositiveNumber(body, ['targetAmount'])

  return prisma.savingsGoal.create({
    data: {
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount || 0,
      deadline: body.deadline ? new Date(body.deadline) : null,
      priority: body.priority || 1,
      description: body.description,
      userId: user.id,
    },
  })
})
