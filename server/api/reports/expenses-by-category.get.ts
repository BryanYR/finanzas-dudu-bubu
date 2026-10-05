import { requireUser } from '@server/utils/auth'
import { validateQuery, ReportQuerySchema } from '@server/utils/validation'
import { getExpensesByCategory, resolveReportRange } from '@server/services/reportService'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = validateQuery(ReportQuerySchema, getQuery(event))
  const range = await resolveReportRange(user.id, query)
  return getExpensesByCategory(user.id, range, query.basis, query.categoryIds)
})
