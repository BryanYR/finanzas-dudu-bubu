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
