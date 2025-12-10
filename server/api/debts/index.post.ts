import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  return prisma.debt.create({
    data: {
      name: body.name,
      creditor: body.creditor,
      totalAmount: body.totalAmount,
      remainingAmount: body.remainingAmount || body.totalAmount,
      interestRate: body.interestRate,
      monthlyPayment: body.monthlyPayment,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      userId: user.id,
    },
  })
})
