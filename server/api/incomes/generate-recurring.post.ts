import { requireUser } from '@server/utils/auth'
import { generateRecurringIncomes } from '@server/services/incomeService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return generateRecurringIncomes(user.id)
})
