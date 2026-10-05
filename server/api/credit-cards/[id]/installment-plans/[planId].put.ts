import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CardInstallmentPlanUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  const planId = Number(event.context.params?.planId)
  if (!id || !planId) throw createError({ statusCode: 400, message: 'Parámetros inválidos' })

  const body = validateBody(CardInstallmentPlanUpdateSchema, await readBody(event))

  const existing = await prisma.cardInstallmentPlan.findFirst({
    where: { id: planId, creditCardId: id, userId: user.id },
  })
  if (!existing) throw createError({ statusCode: 404, message: 'Plan de cuotas no encontrado' })

  const plan = await prisma.cardInstallmentPlan.update({
    where: { id: planId },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.totalInstallments !== undefined && { totalInstallments: body.totalInstallments }),
      ...(body.installmentAmount !== undefined && { installmentAmount: body.installmentAmount }),
      ...(body.firstDueDate !== undefined && { firstDueDate: new Date(body.firstDueDate) }),
      ...(body.principal !== undefined && { principal: body.principal }),
      ...(body.interestRate !== undefined && { interestRate: body.interestRate }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return serializeDecimals(plan)
})
