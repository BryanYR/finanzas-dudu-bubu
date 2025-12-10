import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const savingsGoal = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!savingsGoal || savingsGoal.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Meta de ahorro no encontrada' })
  }

  // Crear contribución
  await prisma.savingsContribution.create({
    data: {
      amount: body.amount,
      notes: body.notes,
      savingsGoalId: id,
    },
  })

  // Actualizar monto actual
  const newAmount = savingsGoal.currentAmount + body.amount
  const isCompleted = newAmount >= savingsGoal.targetAmount

  return prisma.savingsGoal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      isCompleted,
    },
  })
})
