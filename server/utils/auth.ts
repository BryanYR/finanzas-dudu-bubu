import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { prisma } from './db'

export async function getUserFromSession(event: H3Event) {
  const token = getCookie(event, 'token')
  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    return await prisma.user.findUnique({ where: { id: decoded.id } })
  } catch {
    return null
  }
}

export async function requireUser(event: H3Event) {
  const user = await getUserFromSession(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }
  return user
}
