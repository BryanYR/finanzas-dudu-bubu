import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)

  return prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
      icon: body.icon,
      color: body.color,
      userId: user.id,
    },
  })
})
