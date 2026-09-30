import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { setCookie } from 'h3'
import { prisma } from '@server/utils/db'
import { validateBody, LoginSchema } from '@server/utils/validation'
import { checkRateLimit, clearRateLimit, getClientIp } from '@server/utils/rate-limit'

// 10 intentos por IP cada 15 minutos
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  checkRateLimit(`login:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)

  const body = validateBody(LoginSchema, await readBody(event))

  // Mensaje genérico para no revelar si el email existe
  const invalidError = createError({ statusCode: 401, message: 'Credenciales incorrectas' })

  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user) throw invalidError

  const match = await bcrypt.compare(body.password, user.password)
  if (!match) throw invalidError

  // Login exitoso: resetear contador de intentos
  clearRateLimit(`login:${ip}`)

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })

  // 'lax' (no 'strict'): al abrir la PWA desde el ícono, iOS a veces trata el
  // lanzamiento como navegación externa y 'strict' no envía la cookie → /login.
  setCookie(event, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return {
    message: 'Login exitoso',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
})
