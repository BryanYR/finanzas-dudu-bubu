import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, CreditCardUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = validateBody(CreditCardUpdateSchema, await readBody(event))

  const creditCard = await prisma.creditCard.findUnique({ where: { id } })
  if (!creditCard || creditCard.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })
  }

  const updated = await prisma.creditCard.update({
    where: { id },
    data: {
      name: body.name,
      bank: body.bank,
      lastDigits: body.lastDigits,
      creditLimit: body.creditLimit,
      billingDay: body.billingDay,
      paymentDay: body.paymentDay,
      interestRate: body.interestRate,
      carriedBalance: body.carriedBalance,
      isActive: body.isActive,
    },
  })
  return serializeDecimals(updated)
})
