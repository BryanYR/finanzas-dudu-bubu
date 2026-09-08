import { prisma } from '@server/utils/db'
import { requireUser } from '@server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const debtId = Number(query.debtId)
  const extraPayment = Number(query.extraPayment)

  if (!debtId || Number.isNaN(extraPayment) || extraPayment <= 0) {
    throw createError({ statusCode: 400, message: 'debtId y extraPayment requeridos y positivos' })
  }

  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
    include: {
      installments: {
        where: { status: { in: ['pending', 'overdue'] } },
        orderBy: { dueDate: 'asc' },
      },
    },
  })

  if (!debt || debt.userId !== user.id) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const n = debt.installments.length
  if (n === 0) {
    throw createError({ statusCode: 400, message: 'Esta deuda ya no tiene cuotas pendientes' })
  }

  // debt.remainingAmount / debt.monthlyPayment vienen de la BD como Prisma.Decimal;
  // Number(...) los normaliza antes de operar con aritmética JS.
  const P = Number(debt.remainingAmount)
  const C = Number(debt.monthlyPayment)
  const TEA = debt.interestRate
  const TEM = Math.pow(1 + TEA / 100, 1 / 12) - 1

  if (extraPayment >= P) {
    throw createError({
      statusCode: 400,
      message: 'El pago extraordinario debe ser menor al saldo pendiente',
    })
  }

  const newP = P - extraPayment
  // n > 0 ya fue validado arriba, por lo que ambos índices existen.
  const nextDueDate = new Date(debt.installments[0]!.dueDate)
  const lastDueDateNow = new Date(debt.installments[n - 1]!.dueDate)

  // Total interest remaining in current plan
  const totalInterestNow = Math.max(0, C * n - P)

  // ── Reducción de plazo: same C, fewer installments ────────────────────────
  let nNew: number
  if (TEM < 0.0001) {
    nNew = Math.ceil(newP / C)
  } else {
    nNew = Math.ceil(Math.log(C / (C - newP * TEM)) / Math.log(1 + TEM))
  }
  nNew = Math.max(1, nNew)

  const totalInterestAfterPlazo = Math.max(0, C * nNew - newP)
  const interestSavedPlazo = Math.max(0, totalInterestNow - totalInterestAfterPlazo)

  const completionDatePlazo = new Date(nextDueDate)
  completionDatePlazo.setMonth(completionDatePlazo.getMonth() + nNew - 1)

  // ── Reducción de cuota: same n, lower payment ─────────────────────────────
  let cNew: number
  if (TEM < 0.0001) {
    cNew = newP / n
  } else {
    cNew = (newP * TEM) / (1 - Math.pow(1 + TEM, -n))
  }
  cNew = Math.max(0, cNew)

  const totalInterestAfterCuota = Math.max(0, cNew * n - newP)
  const interestSavedCuota = Math.max(0, totalInterestNow - totalInterestAfterCuota)

  return {
    debt: {
      id: debt.id,
      name: debt.name,
      remainingAmount: P,
      interestRate: TEA,
      monthlyPayment: C,
      remainingInstallments: n,
      nextDueDate: nextDueDate.toISOString(),
      completionDateNow: lastDueDateNow.toISOString(),
    },
    extraPayment,
    reduccionPlazo: {
      newPrincipal: Number(newP.toFixed(2)),
      newInstallments: nNew,
      installmentsSaved: n - nNew,
      totalInterestNow: Number(totalInterestNow.toFixed(2)),
      totalInterestAfter: Number(totalInterestAfterPlazo.toFixed(2)),
      interestSaved: Number(interestSavedPlazo.toFixed(2)),
      completionDate: completionDatePlazo.toISOString(),
      completionDateNow: lastDueDateNow.toISOString(),
    },
    reduccionCuota: {
      newPrincipal: Number(newP.toFixed(2)),
      newMonthlyPayment: Number(cNew.toFixed(2)),
      monthlySavings: Number(Math.max(0, C - cNew).toFixed(2)),
      remainingInstallments: n,
      totalInterestNow: Number(totalInterestNow.toFixed(2)),
      totalInterestAfter: Number(totalInterestAfterCuota.toFixed(2)),
      interestSaved: Number(interestSavedCuota.toFixed(2)),
      completionDate: lastDueDateNow.toISOString(),
      completionDateNow: lastDueDateNow.toISOString(),
    },
  }
})
