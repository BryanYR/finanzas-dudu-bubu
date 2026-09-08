import { requireUser } from '@server/utils/auth'
import { getMonthlyStats } from '@server/services/dashboardService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return getMonthlyStats(user.id)
})
