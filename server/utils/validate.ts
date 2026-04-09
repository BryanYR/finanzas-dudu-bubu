/**
 * Valida que los campos requeridos estén presentes y no vacíos.
 * Lanza un error 400 si falta alguno.
 */
export function assertRequired(data: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((f) => data[f] === undefined || data[f] === null || data[f] === '')
  if (missing.length > 0) {
    throw createError({ statusCode: 400, message: `Campos requeridos faltantes: ${missing.join(', ')}` })
  }
}

/**
 * Valida que los campos sean números estrictamente positivos.
 * Lanza un error 400 si alguno no lo es.
 */
export function assertPositiveNumber(data: Record<string, unknown>, fields: string[]) {
  const invalid = fields.filter((f) => typeof data[f] !== 'number' || (data[f] as number) <= 0)
  if (invalid.length > 0) {
    throw createError({ statusCode: 400, message: `Deben ser números positivos: ${invalid.join(', ')}` })
  }
}

/**
 * Valida que un valor sea un enum válido.
 * Lanza un error 400 si no coincide con ninguna opción.
 */
export function assertEnum(value: unknown, allowed: string[], fieldName: string) {
  if (!allowed.includes(value as string)) {
    throw createError({ statusCode: 400, message: `${fieldName} debe ser uno de: ${allowed.join(', ')}` })
  }
}
