import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { getCardInstallmentOverview } from '@server/services/cardInstallmentPlanService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const card = await prisma.creditCard.findFirst({ where: { id, userId: user.id } })
  if (!card) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })

  // { plans, projection }: montos ya como number (el servicio convierte Decimal al final)
  return getCardInstallmentOverview(card, user.id)
})
