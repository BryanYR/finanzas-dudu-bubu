import { requireUser } from '@server/utils/auth'
import { getPaymentSuggestions } from '@server/services/paymentPlanService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return getPaymentSuggestions(user.id)
})
