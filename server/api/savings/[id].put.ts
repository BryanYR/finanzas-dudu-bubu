import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, SavingsGoalUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = validateBody(SavingsGoalUpdateSchema, await readBody(event))

  // Verificar que la meta pertenece al usuario
  const goal = await prisma.savingsGoal.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })

  if (!goal) {
    throw createError({
      statusCode: 404,
      message: 'Meta de ahorro no encontrada',
    })
  }

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount,
      deadline: body.deadline ? new Date(body.deadline) : null,
      isCompleted: body.isCompleted,
    },
  })

  return serializeDecimals(updated)
})
