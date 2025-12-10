import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { setCookie } from 'h3'
import { prisma } from '@server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await prisma.user.findUnique({ where: { email: body.email } })

  if (!user) throw createError({ statusCode: 401, message: 'Usuario no encontrado' })
  const match = await bcrypt.compare(body.password, user.password)

  if (!match) throw createError({ statusCode: 401, message: 'Credenciales incorrectas' })

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

  setCookie(event, 'session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })

  return { message: 'OK' }
})
