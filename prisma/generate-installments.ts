import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Script para generar cuotas para deudas existentes que no tienen cuotas programadas
 * Ejecutar con: npx tsx prisma/generate-installments.ts
 */
async function generateInstallmentsForExistingDebts() {
  console.log('🔍 Buscando deudas sin cuotas programadas...')

  // Obtener todas las deudas sin cuotas
  const debtsWithoutInstallments = await prisma.debt.findMany({
    where: {
      installments: {
        none: {},
      },
    },
    include: {
      payments: {
        orderBy: {
          date: 'asc',
        },
      },
    },
  })

  console.log(`📊 Encontradas ${debtsWithoutInstallments.length} deudas sin cuotas`)

  for (const debt of debtsWithoutInstallments) {
    console.log(`\n🏦 Generando cuotas para: ${debt.name}`)

    const startDate = new Date(debt.startDate)
    const totalInstallments = debt.totalInstallments || 12
    // debt.monthlyPayment / debt.totalAmount vienen de la BD como Prisma.Decimal;
    // Number(...) los normaliza para poder operar con aritmética JS normal.
    const monthlyPayment = Number(debt.monthlyPayment)
    const interestRate = debt.interestRate / 100 / 12 // Tasa mensual
    const totalAmount = Number(debt.totalAmount)
    const paymentDay = debt.paymentDayOfMonth

    const installments = []
    let remainingPrincipal = totalAmount

    // Determinar cuántas cuotas ya fueron pagadas
    const paidInstallments = debt.payments.length

    for (let i = 1; i <= totalInstallments; i++) {
      // Calcular fecha de vencimiento
      const dueDate = new Date(startDate)
      dueDate.setMonth(startDate.getMonth() + i)
      dueDate.setDate(paymentDay)

      // Calcular interés sobre saldo restante
      const interestAmount = remainingPrincipal * interestRate

      // El principal es lo que queda de la cuota después del interés
      const principalAmount = monthlyPayment - interestAmount

      // Ajustar la última cuota si es necesario
      const finalPrincipal = i === totalInstallments ? remainingPrincipal : principalAmount

      const finalAmount =
        i === totalInstallments ? remainingPrincipal + interestAmount : monthlyPayment

      // Determinar el estado de la cuota
      let status = 'pending'
      const now = new Date()

      if (i <= paidInstallments && debt.payments[i - 1]) {
        // Esta cuota ya fue pagada
        const payment = debt.payments[i - 1]
        const paymentDate = new Date(payment.date)
        status = paymentDate < dueDate ? 'advanced' : 'paid'
      } else if (dueDate < now) {
        // Esta cuota está vencida
        status = 'overdue'
      }

      installments.push({
        installmentNumber: i,
        dueDate,
        amount: finalAmount,
        principal: finalPrincipal,
        interest: interestAmount,
        insurance: 0,
        status,
        debtId: debt.id,
        debtPaymentId: i <= paidInstallments ? debt.payments[i - 1]?.id : null,
      })

      remainingPrincipal -= principalAmount
    }

    // Crear todas las cuotas
    await prisma.debtInstallment.createMany({
      data: installments,
    })

    console.log(`✅ Generadas ${installments.length} cuotas para ${debt.name}`)
    console.log(
      `   - Pagadas/Adelantadas: ${installments.filter((i) => i.status === 'paid' || i.status === 'advanced').length}`
    )
    console.log(`   - Pendientes: ${installments.filter((i) => i.status === 'pending').length}`)
    console.log(`   - Vencidas: ${installments.filter((i) => i.status === 'overdue').length}`)
  }

  console.log('\n✨ Proceso completado!')
}

generateInstallmentsForExistingDebts()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
