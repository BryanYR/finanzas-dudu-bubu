import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)

  const creditCard = await prisma.creditCard.findUnique({ where: { id } })
  if (!creditCard || creditCard.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  await prisma.creditCard.delete({ where: { id } })
  return { message: 'Tarjeta eliminada' }
})
