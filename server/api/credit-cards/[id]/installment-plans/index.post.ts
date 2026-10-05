import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CardInstallmentPlanSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(event.context.params?.id)
  if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = validateBody(CardInstallmentPlanSchema, await readBody(event))

  const card = await prisma.creditCard.findFirst({ where: { id, userId: user.id } })
  if (!card) throw createError({ statusCode: 404, message: 'Tarjeta no encontrada' })

  const plan = await prisma.cardInstallmentPlan.create({
    data: {
      description: body.description,
      totalInstallments: body.totalInstallments,
      installmentAmount: body.installmentAmount,
      firstDueDate: new Date(body.firstDueDate),
      principal: body.principal ?? null,
      interestRate: body.interestRate ?? null,
      notes: body.notes || null,
      isActive: body.isActive,
      creditCardId: id,
      userId: user.id,
    },
  })

  return serializeDecimals(plan)
})
