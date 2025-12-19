import { prisma } from '@server/utils/db'
import { getUserFromSession } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  if (!user) throw createError({ statusCode: 401 })

  // Obtener todos los ingresos recurrentes del usuario
  const recurringIncomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      isRecurring: true,
    },
    include: {
      category: true,
    },
  })

  if (recurringIncomes.length === 0) {
    return {
      message: 'No hay ingresos recurrentes configurados',
      generated: [],
    }
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Fecha de inicio del mes actual
  const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0)
  // Fecha de fin del mes actual
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)

  const generated = []
  const skipped = []

  for (const recurringIncome of recurringIncomes) {
    // Verificar si ya existe un ingreso generado este mes para este ingreso recurrente
    const existingIncome = await prisma.income.findFirst({
      where: {
        userId: user.id,
        amount: recurringIncome.amount,
        description: recurringIncome.description,
        categoryId: recurringIncome.categoryId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    if (existingIncome) {
      skipped.push({
        id: recurringIncome.id,
        description: recurringIncome.description,
        reason: 'Ya existe un ingreso similar este mes',
      })
      continue
    }

    // Determinar la fecha del ingreso basado en la frecuencia
    let incomeDate: Date

    if (recurringIncome.frequency === 'MONTHLY') {
      // Usar el mismo día del mes que el ingreso recurrente original
      const originalDay = new Date(recurringIncome.date).getDate()

      // Si estamos antes del día del mes, programar para este mes
      // Si ya pasó, ya no generarlo (se generará el próximo mes)
      if (now.getDate() >= originalDay) {
        incomeDate = new Date(currentYear, currentMonth, originalDay, 12, 0, 0)
      } else {
        skipped.push({
          id: recurringIncome.id,
          description: recurringIncome.description,
          reason: `Aún no es el día ${originalDay} del mes`,
        })
        continue
      }
    } else if (recurringIncome.frequency === 'BIWEEKLY') {
      // Para quincenal, generar el 15 y el último día del mes
      const day15 = new Date(currentYear, currentMonth, 15)
      const lastDay = new Date(currentYear, currentMonth + 1, 0)

      // Verificar si ya pasó alguna de estas fechas
      if (now >= day15 && now < lastDay) {
        incomeDate = day15
      } else if (now >= lastDay) {
        incomeDate = lastDay
      } else {
        skipped.push({
          id: recurringIncome.id,
          description: recurringIncome.description,
          reason: 'Aún no es fecha de pago quincenal',
        })
        continue
      }
    } else {
      // Para otras frecuencias, usar la fecha actual
      incomeDate = now
    }

    // Crear el nuevo ingreso
    const newIncome = await prisma.income.create({
      data: {
        amount: recurringIncome.amount,
        description: `${recurringIncome.description} (Auto-generado)`,
        date: incomeDate,
        isRecurring: false, // El generado no es recurrente
        frequency: null,
        categoryId: recurringIncome.categoryId,
        userId: user.id,
        notes: `Generado automáticamente desde ingreso recurrente #${recurringIncome.id}`,
      },
    })

    generated.push({
      id: newIncome.id,
      description: newIncome.description,
      amount: newIncome.amount,
      date: newIncome.date,
      category: recurringIncome.category?.name,
    })
  }

  return {
    message: `Se generaron ${generated.length} ingresos recurrentes`,
    generated,
    skipped,
  }
})
