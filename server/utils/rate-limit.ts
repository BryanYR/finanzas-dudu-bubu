import type { H3Event } from 'h3'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Store en memoria — se resetea al reiniciar el servidor (suficiente para protección básica)
const store = new Map<string, RateLimitEntry>()

/**
 * Rate limiter de ventana fija.
 * Lanza 429 si se supera el límite de intentos dentro de la ventana.
 *
 * @param key    - Identificador único (ej: IP + endpoint)
 * @param limit  - Número máximo de intentos permitidos
 * @param windowMs - Duración de la ventana en milisegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (entry.count >= limit) {
    const waitSecs = Math.ceil((entry.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      message: `Demasiados intentos. Espera ${waitSecs} segundos e intenta de nuevo.`,
    })
  }

  entry.count++
}

/**
 * Obtiene la IP del cliente desde el evento H3.
 * Considera proxies (X-Forwarded-For).
 */
export function getClientIp(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return event.node.req.socket?.remoteAddress ?? 'unknown'
}

/**
 * Elimina el registro de rate limit para una clave (ej: login exitoso).
 */
export function clearRateLimit(key: string): void {
  store.delete(key)
}
