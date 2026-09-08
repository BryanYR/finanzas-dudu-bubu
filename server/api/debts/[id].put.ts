import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'
import { validateBody, DebtUpdateSchema } from '@server/utils/validation'
import { serializeDecimals } from '@server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const id = Number(event.context.params?.id)
  const body = validateBody(DebtUpdateSchema, await readBody(event))

  const debt = await prisma.debt.findUnique({ where: { id } })
  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  // Build update data conditionally
  const updateData: any = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.creditor !== undefined) updateData.creditor = body.creditor
  if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount
  if (body.remainingAmount !== undefined) updateData.remainingAmount = body.remainingAmount
  if (body.interestRate !== undefined) updateData.interestRate = body.interestRate
  if (body.monthlyPayment !== undefined) updateData.monthlyPayment = body.monthlyPayment
  if (body.totalInstallments !== undefined) updateData.totalInstallments = body.totalInstallments
  if (body.paymentDayOfMonth !== undefined) updateData.paymentDayOfMonth = body.paymentDayOfMonth
  if (body.startDate) updateData.startDate = new Date(body.startDate)
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null
  }

  // Si cambia alguno de los parámetros que afectan la amortización (monto, tasa,
  // cuota, plazo, día de pago o fecha de inicio), hay que regenerar el cronograma
  // de cuotas pendientes/vencidas para que quede consistente con los nuevos
  // términos. Las cuotas ya pagadas o adelantadas se conservan intactas.
  const affectsSchedule =
    body.totalAmount !== undefined ||
    body.interestRate !== undefined ||
    body.monthlyPayment !== undefined ||
    body.totalInstallments !== undefined ||
    body.paymentDayOfMonth !== undefined ||
    body.startDate !== undefined

  if (!affectsSchedule) {
    return serializeDecimals(await prisma.debt.update({ where: { id }, data: updateData }))
  }

  // `debt.*` viene de la BD como Prisma.Decimal; `body.*` ya es number (validado
  // por Zod). Number(...) normaliza ambos casos para poder operar con aritmética
  // JS normal más abajo.
  const totalAmount = Number(body.totalAmount ?? debt.totalAmount)
  const interestRate = body.interestRate ?? debt.interestRate
  const monthlyPayment = Number(body.monthlyPayment ?? debt.monthlyPayment)
  const totalInstallments = body.totalInstallments ?? debt.totalInstallments ?? 12
  const paymentDay = body.paymentDayOfMonth ?? debt.paymentDayOfMonth
  const startDate = body.startDate ? new Date(body.startDate) : debt.startDate
  const remainingAmount = Number(body.remainingAmount ?? debt.remainingAmount)

  const result = await prisma.$transaction(async (tx) => {
    // Las cuotas ya pagadas/adelantadas no se tocan; el resto del cronograma se
    // recalcula a partir de ahí, igual que en server/api/debts/index.post.ts y
    // prisma/generate-installments.ts (amortización francesa, cuota fija).
    const paidInstallments = await tx.debtInstallment.findMany({
      where: { debtId: id, status: { in: ['paid', 'advanced'] } },
      orderBy: { installmentNumber: 'asc' },
    })

    const remainingInstallmentsCount = totalInstallments - paidInstallments.length
    if (remainingInstallmentsCount < 0) {
      throw createError({
        statusCode: 400,
        message: 'El número de cuotas no puede ser menor a las cuotas ya pagadas',
      })
    }

    await tx.debtInstallment.deleteMany({
      where: { debtId: id, status: { in: ['pending', 'overdue'] } },
    })

    const monthlyRate = interestRate / 100 / 12
    let remainingPrincipal = remainingAmount

    const newInstallments: {
      installmentNumber: number
      dueDate: Date
      amount: number
      principal: number
      interest: number
      insurance: number
      status: string
      debtId: number
    }[] = []

    for (let idx = 0; idx < remainingInstallmentsCount; idx++) {
      const installmentNumber = paidInstallments.length + idx + 1
      const dueDate = new Date(
        Date.UTC(startDate.getFullYear(), startDate.getMonth() + installmentNumber, paymentDay)
      )
      const interestAmount = remainingPrincipal * monthlyRate
      const principalAmount = monthlyPayment - interestAmount
      const isLast = idx === remainingInstallmentsCount - 1
      const finalPrincipal = isLast ? remainingPrincipal : principalAmount
      const finalAmount = isLast ? remainingPrincipal + interestAmount : monthlyPayment

      newInstallments.push({
        installmentNumber,
        dueDate,
        amount: finalAmount,
        principal: finalPrincipal,
        interest: interestAmount,
        insurance: 0,
        status: 'pending',
        debtId: id,
      })

      remainingPrincipal -= principalAmount
    }

    if (newInstallments.length > 0) {
      await tx.debtInstallment.createMany({ data: newInstallments })
    }

    updateData.totalAmount = totalAmount
    updateData.interestRate = interestRate
    updateData.monthlyPayment = monthlyPayment
    updateData.totalInstallments = totalInstallments
    updateData.paymentDayOfMonth = paymentDay
    updateData.startDate = startDate
    updateData.remainingAmount = remainingAmount

    return tx.debt.update({
      where: { id },
      data: updateData,
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    })
  })

  return serializeDecimals(result)
})
