import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const card = await prisma.creditCard.findFirst({ where: { id, userId: user.id } })
  if (!card) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })

  const statements = await prisma.creditCardStatement.findMany({
    where: { creditCardId: id, userId: user.id },
    orderBy: { dueDate: 'asc' },
  })

  return serializeDecimals(statements)
})
