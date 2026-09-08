export default defineNuxtRouteMiddleware(async (to) => {
  // No aplicar middleware en la página de login
  if (to.path === '/login') {
    return
  }

  // Verificar autenticación en el servidor
  if (process.server) {
    try {
      const requestFetch = useRequestFetch()
      await requestFetch('/api/auth/me')
    } catch (error) {
      return navigateTo('/login')
    }
  }
})
