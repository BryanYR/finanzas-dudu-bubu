import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
})
