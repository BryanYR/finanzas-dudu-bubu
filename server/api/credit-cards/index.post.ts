import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'
import { validateBody, CreditCardSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = validateBody(CreditCardSchema, await readBody(event))

  const creditCard = await prisma.creditCard.create({
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
      userId: user.id,
    },
  })
  return serializeDecimals(creditCard)
})
