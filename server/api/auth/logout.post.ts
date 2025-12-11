import { deleteCookie } from 'h3'

export default defineEventHandler(async (event) => {
  // Eliminar la cookie de autenticación
  deleteCookie(event, 'token')

  return { message: 'Sesión cerrada exitosamente' }
})
