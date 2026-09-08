import { requireUser } from '@server/utils/auth'
import { generateRecurringIncomes } from '@server/services/incomeService'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const result = await generateRecurringIncomes(user.id)
  return serializeDecimals(result)
})
