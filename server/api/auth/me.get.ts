import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  return await getUserFromSession(event)
})
