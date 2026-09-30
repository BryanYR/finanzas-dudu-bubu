import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const statementId = Number(event.context.params?.statementId)
  if (!id || !statementId) throw createError({ statusCode: 400, message: 'Parámetros inválidos' })

  const { count } = await prisma.creditCardStatement.deleteMany({
    where: { id: statementId, creditCardId: id, userId: user.id },
  })
  if (!count) throw createError({ statusCode: 404, message: 'Recibo no encontrado' })

  return { success: true }
})
