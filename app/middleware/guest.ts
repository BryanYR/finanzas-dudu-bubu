export default defineNuxtRouteMiddleware(async (to) => {
  // Solo permitir acceso a /login si NO está autenticado
  // Este middleware se aplicará en la página de login
  if (process.server) {
    try {
      await $fetch('/api/auth/me')
      // Si llega aquí, el usuario está autenticado, redirigir a home
      return navigateTo('/')
    } catch {
      // No autenticado, permitir acceso a login
      return
    }
  }
})
