import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { assertRequired, assertPositiveNumber } from '@server/utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  assertRequired(body, ['name', 'bank', 'creditLimit', 'billingDay', 'paymentDay'])
  assertPositiveNumber(body, ['creditLimit'])

  return prisma.creditCard.create({
    data: {
      name: body.name,
      bank: body.bank,
      lastDigits: body.lastDigits,
      creditLimit: body.creditLimit,
      billingDay: body.billingDay,
      paymentDay: body.paymentDay,
      interestRate: body.interestRate ?? null,
      installmentFees: body.installmentFees ?? null,
      isActive: body.isActive ?? true,
      userId: user.id,
    },
  })
})
