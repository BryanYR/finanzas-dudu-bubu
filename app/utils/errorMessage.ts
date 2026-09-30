/**
 * Extrae el mensaje de error devuelto por la API (createError en el servidor)
 * y usa el fallback si la respuesta no trae uno.
 *
 * @example
 * catch (err) {
 *   useToast().error(getErrorMessage(err, 'Error al guardar la deuda'))
 * }
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: unknown } } | null)?.data
  return typeof data?.message === 'string' && data.message ? data.message : fallback
}
