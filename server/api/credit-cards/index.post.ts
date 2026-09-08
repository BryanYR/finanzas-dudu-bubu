import { Prisma } from '@prisma/client'
import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CreditCardSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

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
      // Prisma requiere Prisma.JsonNull (no `null` a secas) para un campo Json vacío
      installmentFees: body.installmentFees === null ? Prisma.JsonNull : body.installmentFees,
      carriedBalance: body.carriedBalance,
      isActive: body.isActive,
      userId: user.id,
    },
  })
  return serializeDecimals(creditCard)
})
