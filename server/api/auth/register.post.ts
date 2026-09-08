import bcrypt from 'bcrypt'
import { prisma } from '@server/utils/db'
import { validateBody, RegisterSchema } from '@server/utils/validation'
import { checkRateLimit, getClientIp } from '@server/utils/rate-limit'

// 5 intentos por IP cada 15 minutos
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  checkRateLimit(`register:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)

  const body = validateBody(RegisterSchema, await readBody(event))

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Ya existe una cuenta con este correo' })
  }

  const hash = await bcrypt.hash(body.password, 12)

  await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hash,
    },
  })

  return { message: 'Usuario creado' }
})
