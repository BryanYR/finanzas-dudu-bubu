import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, SavingsContributionSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(SavingsContributionSchema, await readBody(event))

  const savingsGoal = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!savingsGoal || savingsGoal.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Meta de ahorro no encontrada' })
  }

  if (savingsGoal.isCompleted) {
    throw createError({ statusCode: 400, message: 'Esta meta de ahorro ya está completada' })
  }

  const updatedGoal = await prisma.$transaction(async (tx) => {
    // Crear contribución
    await tx.savingsContribution.create({
      data: {
        amount: body.amount,
        notes: body.notes,
        savingsGoalId: id,
      },
    })

    // Incremento atómico del monto actual (evita condiciones de carrera con
    // contribuciones casi simultáneas que leerían el mismo currentAmount desactualizado)
    await tx.savingsGoal.update({
      where: { id },
      data: { currentAmount: { increment: body.amount } },
    })

    const refreshedGoal = await tx.savingsGoal.findUniqueOrThrow({ where: { id } })
    const isCompleted = Number(refreshedGoal.currentAmount) >= Number(refreshedGoal.targetAmount)

    return tx.savingsGoal.update({
      where: { id },
      data: { isCompleted },
    })
  })

  return serializeDecimals(updatedGoal)
})
