import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
})
