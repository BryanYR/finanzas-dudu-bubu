import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  // Build update data conditionally
  const updateData: any = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.creditor !== undefined) updateData.creditor = body.creditor
  if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount
  if (body.remainingAmount !== undefined) updateData.remainingAmount = body.remainingAmount
  if (body.interestRate !== undefined) updateData.interestRate = body.interestRate
  if (body.monthlyPayment !== undefined) updateData.monthlyPayment = body.monthlyPayment
  if (body.totalInstallments !== undefined) updateData.totalInstallments = body.totalInstallments
  if (body.paymentDayOfMonth !== undefined) updateData.paymentDayOfMonth = body.paymentDayOfMonth
  if (body.startDate) updateData.startDate = new Date(body.startDate)
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null
  }

  return prisma.debt.update({
    where: { id },
    data: updateData,
  })
})
