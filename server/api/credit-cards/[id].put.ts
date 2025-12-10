import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const creditCard = await prisma.creditCard.findUnique({ where: { id } })
  if (!creditCard || creditCard.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  return prisma.creditCard.update({
    where: { id },
    data: {
      name: body.name,
      bank: body.bank,
      lastDigits: body.lastDigits,
      creditLimit: body.creditLimit,
      billingDay: body.billingDay,
      paymentDay: body.paymentDay,
      interestRate: body.interestRate,
      isActive: body.isActive,
    },
  })
})
