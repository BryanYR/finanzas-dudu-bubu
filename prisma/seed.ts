import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear usuario 1: Jacky Damar
  const user1 = await prisma.user.upsert({
    where: { email: 'damar08011991@gmail.com' },
    update: {},
    create: {
      name: 'Jacky Damar',
      email: 'damar08011991@gmail.com',
      password: await bcrypt.hash('bubu@123', 10),
      role: 'superadmin',
    },
  })
  console.log('✅ Usuario creado:', user1.name, '-', user1.email)

  // Crear usuario 2: Bryan Yepez
  const user2 = await prisma.user.upsert({
    where: { email: 'bjyepez15@gmail.com' },
    update: {},
    create: {
      name: 'Bryan Yepez',
      email: 'bjyepez15@gmail.com',
      password: await bcrypt.hash('Sigma-21-08*', 10),
      role: 'superadmin',
    },
  })
  console.log('✅ Usuario creado:', user2.name, '-', user2.email)

  // Crear categorías de ingresos para ambos usuarios
  const incomeCategories = [
    { name: 'Salario', icon: '💼', color: '#10b981' },
    { name: 'Ingreso Variable', icon: '💰', color: '#f59e0b' },
    { name: 'Freelance', icon: '💻', color: '#3b82f6' },
    { name: 'Inversiones', icon: '📈', color: '#8b5cf6' },
    { name: 'Otros Ingresos', icon: '💵', color: '#6b7280' },
  ]

  for (const user of [user1, user2]) {
    for (const cat of incomeCategories) {
      // Verificar si ya existe la categoría
      const existing = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: cat.name,
          type: 'income',
        },
      })

      if (!existing) {
        await prisma.category.create({
          data: {
            name: cat.name,
            type: 'income',
            icon: cat.icon,
            color: cat.color,
            userId: user.id,
          },
        })
      }
    }
    console.log(`✅ Categorías de ingresos creadas para ${user.name}`)
  }

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
