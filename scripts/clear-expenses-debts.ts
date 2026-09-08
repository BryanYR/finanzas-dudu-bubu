/**
 * Script para borrar todos los gastos y deudas de la base de datos.
 *
 * Uso:
 *   npx tsx scripts/clear-expenses-debts.ts
 *
 * ADVERTENCIA: Esta acción es irreversible. Hacer backup antes de ejecutar.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando limpieza de gastos y deudas...\n')

  // DebtInstallment y DebtPayment tienen onDelete: Cascade desde Debt,
  // por lo que se borran automáticamente al borrar Debt.
  // Expense tiene relaciones con CreditCard (SetNull), se borra directo.

  const [deletedExpenses, deletedPayments, deletedInstallments, deletedDebts] =
    await prisma.$transaction([
      prisma.expense.deleteMany({}),
      prisma.debtPayment.deleteMany({}),
      prisma.debtInstallment.deleteMany({}),
      prisma.debt.deleteMany({}),
    ])

  console.log(`Gastos eliminados:            ${deletedExpenses.count}`)
  console.log(`Pagos de deuda eliminados:    ${deletedPayments.count}`)
  console.log(`Cuotas programadas eliminadas: ${deletedInstallments.count}`)
  console.log(`Deudas eliminadas:            ${deletedDebts.count}`)
  console.log('\nLimpieza completada exitosamente.')
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
