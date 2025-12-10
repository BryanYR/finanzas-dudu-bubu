import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

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
