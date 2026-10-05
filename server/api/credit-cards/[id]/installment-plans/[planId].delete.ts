import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const planId = Number(event.context.params?.planId)
  if (!id || !planId) throw createError({ statusCode: 400, message: 'Parámetros inválidos' })

  const { count } = await prisma.cardInstallmentPlan.deleteMany({
    where: { id: planId, creditCardId: id, userId: user.id },
  })
  if (!count) throw createError({ statusCode: 404, message: 'Plan de cuotas no encontrado' })

  return { success: true }
})
