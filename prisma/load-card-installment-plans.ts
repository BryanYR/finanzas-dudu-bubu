import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Carga los planes de cuotas de CMR y SIP del usuario 2 (docs/plans/card-installment-plans.md,
 * "Datos iniciales") y el recibo SIP faltante del 15/06/2027. Idempotente: no duplica planes
 * (misma tarjeta + descripción + firstDueDate) ni el recibo.
 * Ejecutar con: npx tsx prisma/load-card-installment-plans.ts
 */
const USER_ID = 2

// Los vencimientos se guardan a mediodía Lima (17:00Z), igual que los CreditCardStatement.
const limaNoon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 17))

interface PlanSeed {
  description: string
  installmentAmount: number
  totalInstallments: number
  firstDueDate: Date
  principal: number
  interestRate?: number
}

const CMR_PLANS: PlanSeed[] = [
  {
    description: 'Tablet',
    installmentAmount: 105.5,
    totalInstallments: 18,
    firstDueDate: limaNoon(2026, 8, 5),
    principal: 1899,
  },
  {
    description: 'Compra Jacky',
    installmentAmount: 61.06,
    totalInstallments: 6,
    firstDueDate: limaNoon(2026, 8, 5),
    principal: 296.8,
    interestRate: 109.83,
  },
  {
    description: 'Débito para pagar deudas',
    installmentAmount: 476.86,
    totalInstallments: 4,
    firstDueDate: limaNoon(2026, 9, 5),
    principal: 1700,
    interestRate: 74.92,
  },
  {
    description: 'Televisor tía Marga',
    installmentAmount: 301.0,
    totalInstallments: 5,
    firstDueDate: limaNoon(2026, 9, 5),
    principal: 1311.5,
    interestRate: 74.92,
  },
]

// En las conversiones SIP `principal` es el capital financiado
const SIP_CONVERSIONS: Array<{ merchant: string; amount: number; principal: number }> = [
  { merchant: 'Chimbote PVEA', amount: 26.72, principal: 143.06 },
  { merchant: 'PedidosYa Aida C', amount: 6.89, principal: 36.9 },
  { merchant: 'Makro Trujillo', amount: 54.2, principal: 290.43 },
  { merchant: 'PedidosYa Food', amount: 7.4, principal: 39.84 },
  { merchant: 'IZI Postres de Julio', amount: 12.06, principal: 65.0 },
  { merchant: 'Mass Casuap1 CQPS', amount: 5.95, principal: 32.1 },
]

const SIP_PLANS: PlanSeed[] = [
  {
    description: 'Traslado de saldo crédito efectivo',
    installmentAmount: 268.94,
    totalInstallments: 12,
    firstDueDate: limaNoon(2026, 7, 15),
    principal: 2600,
    interestRate: 43,
  },
  {
    description: 'IZI Poncemedent',
    installmentAmount: 232.19,
    totalInstallments: 3,
    firstDueDate: limaNoon(2026, 9, 15),
    principal: 650,
    interestRate: 40,
  },
  ...SIP_CONVERSIONS.map((c) => ({
    description: `Conversión a 6 cuotas: ${c.merchant}`,
    installmentAmount: c.amount,
    totalInstallments: 6,
    firstDueDate: limaNoon(2026, 10, 15),
    principal: c.principal,
    interestRate: 40,
  })),
]

async function findCard(nameLike: string) {
  const cards = await prisma.creditCard.findMany({
    where: { userId: USER_ID, name: { contains: nameLike, mode: 'insensitive' } },
  })
  if (cards.length !== 1) {
    throw new Error(
      `Se esperaba 1 tarjeta "${nameLike}" del usuario ${USER_ID} y hay ${cards.length}`
    )
  }
  return cards[0]!
}

async function loadPlans(card: { id: number; name: string }, plans: PlanSeed[]) {
  let created = 0
  let skipped = 0
  for (const p of plans) {
    const exists = await prisma.cardInstallmentPlan.findFirst({
      where: {
        creditCardId: card.id,
        userId: USER_ID,
        description: p.description,
        firstDueDate: p.firstDueDate,
      },
    })
    if (exists) {
      skipped++
      continue
    }
    await prisma.cardInstallmentPlan.create({
      data: {
        description: p.description,
        totalInstallments: p.totalInstallments,
        installmentAmount: p.installmentAmount,
        firstDueDate: p.firstDueDate,
        principal: p.principal,
        interestRate: p.interestRate ?? null,
        creditCardId: card.id,
        userId: USER_ID,
      },
    })
    created++
  }
  console.log(`   ${card.name}: ${created} planes creados, ${skipped} ya existían`)
}

/** Recibos SIP pendientes de abr-jun 2027 (por día Lima del vencimiento) y alta del del 15/06/2027. */
async function ensureSipJuneStatement(card: { id: number; name: string }) {
  const rangeStart = new Date(Date.UTC(2027, 3, 1, 5))
  const rangeEnd = new Date(Date.UTC(2027, 6, 1, 5))
  const pending = await prisma.creditCardStatement.findMany({
    where: {
      creditCardId: card.id,
      userId: USER_ID,
      isPaid: false,
      dueDate: { gte: rangeStart, lt: rangeEnd },
    },
    orderBy: { dueDate: 'asc' },
  })
  console.log(
    `\nRecibos ${card.name} pendientes abr-jun 2027 (antes del cambio): ${pending.length}`
  )
  for (const s of pending) {
    console.log(
      `   id ${s.id}  vence ${s.dueDate.toISOString()}  S/${s.amount}  ${s.notes ?? ''}`.trimEnd()
    )
  }

  const dueDate = limaNoon(2027, 6, 15)
  // Mismo mes de vencimiento (cualquier hora del 01/06 al 30/06 Lima), pagado o no
  const june = await prisma.creditCardStatement.findFirst({
    where: {
      creditCardId: card.id,
      userId: USER_ID,
      dueDate: { gte: new Date(Date.UTC(2027, 5, 1, 5)), lt: new Date(Date.UTC(2027, 6, 1, 5)) },
    },
  })
  if (june) {
    console.log(`   Recibo 15/06/2027 ya existe (id ${june.id}, S/${june.amount}); no se agrega`)
    return
  }
  const created = await prisma.creditCardStatement.create({
    data: {
      dueDate,
      amount: 268.94,
      notes:
        'Solo cuota del traslado de saldo crédito efectivo (S/2,600 en 12 cuotas), cuota 12/12',
      creditCardId: card.id,
      userId: USER_ID,
    },
  })
  console.log(`   Recibo 15/06/2027 creado (id ${created.id}, S/268.94)`)
}

async function main() {
  console.log(`Cargando planes de cuotas del usuario ${USER_ID}...`)
  const cmr = await findCard('CMR')
  const sip = await findCard('SIP')

  await loadPlans(cmr, CMR_PLANS)
  await loadPlans(sip, SIP_PLANS)
  await ensureSipJuneStatement(sip)

  console.log('\nProceso completado')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
