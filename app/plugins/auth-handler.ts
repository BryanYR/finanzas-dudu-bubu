export default defineNuxtPlugin((nuxtApp) => {
  const handleLogout = async () => {
    // Limpiar token
    const token = useCookie('token')
    token.value = null

    // Llamar al endpoint de logout si existe
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // Ignorar errores del logout
    }

    // Redirigir al login
    await navigateTo('/login', { replace: true })
  }

  // Interceptar todas las respuestas de $fetch globalmente
  const fetch = $fetch.create({
    async onResponseError({ response }) {
      if (response.status === 401) {
        await handleLogout()
      }
    },
  })

  // Reemplazar $fetch global con la versión interceptada
  nuxtApp.provide('fetch', fetch)

  return {
    provide: {
      authFetch: fetch,
      handleLogout,
    },
  }
})
