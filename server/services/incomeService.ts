import { prisma } from '@server/utils/db'

export async function generateRecurringIncomes(userId: number) {
  const recurringIncomes = await prisma.income.findMany({
    where: { userId, isRecurring: true },
    include: { category: true },
  })

  if (recurringIncomes.length === 0) {
    return { message: 'No hay ingresos recurrentes configurados', generated: [], skipped: [] }
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0)
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  const generated = []
  const skipped = []

  for (const recurring of recurringIncomes) {
    const existing = await prisma.income.findFirst({
      where: {
        userId,
        amount: recurring.amount,
        description: recurring.description,
        categoryId: recurring.categoryId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    if (existing) {
      skipped.push({ id: recurring.id, description: recurring.description, reason: 'Ya existe un ingreso similar este mes' })
      continue
    }

    let incomeDate: Date | null = null

    if (recurring.frequency === 'MONTHLY') {
      const originalDay = new Date(recurring.date).getDate()
      if (now.getDate() >= originalDay) {
        incomeDate = new Date(currentYear, currentMonth, originalDay, 12, 0, 0)
      } else {
        skipped.push({ id: recurring.id, description: recurring.description, reason: `Aún no es el día ${originalDay} del mes` })
        continue
      }
    } else if (recurring.frequency === 'BIWEEKLY') {
      const day15 = new Date(currentYear, currentMonth, 15)
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
      if (now >= day15 && now < lastDay) {
        incomeDate = day15
      } else if (now >= lastDay) {
        incomeDate = lastDay
      } else {
        skipped.push({ id: recurring.id, description: recurring.description, reason: 'Aún no es fecha de pago quincenal' })
        continue
      }
    } else {
      incomeDate = now
    }

    const newIncome = await prisma.income.create({
      data: {
        amount: recurring.amount,
        description: `${recurring.description} (Auto-generado)`,
        date: incomeDate,
        isRecurring: false,
        frequency: null,
        categoryId: recurring.categoryId,
        userId,
        notes: `Generado automáticamente desde ingreso recurrente #${recurring.id}`,
      },
    })

    generated.push({
      id: newIncome.id,
      description: newIncome.description,
      amount: newIncome.amount,
      date: newIncome.date,
      category: recurring.category?.name,
    })
  }

  return {
    message: `Se generaron ${generated.length} ingresos recurrentes`,
    generated,
    skipped,
  }
}
