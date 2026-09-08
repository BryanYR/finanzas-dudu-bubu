import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, CategorySchema } from '@server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const body = validateBody(CategorySchema, await readBody(event))

  return prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
      icon: body.icon,
      color: body.color || null,
      userId: user.id,
    },
  })
})
