export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    // En SSR hay que reenviar las cookies del navegador manualmente,
    // porque $fetch del servidor no las incluye automáticamente.
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined
    await $fetch('/api/auth/me', { headers })
  } catch {
    return navigateTo('/login')
  }
})
