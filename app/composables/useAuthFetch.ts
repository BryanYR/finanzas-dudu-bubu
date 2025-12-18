/**
 * Composable para obtener la instancia $authFetch
 * Para uso imperativo en funciones (POST, PUT, DELETE)
 *
 * @example
 * const $authFetch = useAuthFetch()
 * await $authFetch('/api/data', { method: 'POST', body: {...} })
 */
export const useAuthFetch = () => {
  const { $authFetch } = useNuxtApp()
  return $authFetch as typeof $fetch
}

/**
 * Wrapper de useFetch que maneja automáticamente errores 401
 * Para uso reactivo con data fetching (GET con estado reactivo)
 *
 * @example
 * const { data, pending, error, refresh } = await useFetchAuth<Type>('/api/data')
 */
export const useFetchAuth = <T>(url: string, options: any = {}) => {
  const handleLogout = async () => {
    const token = useCookie('token')
    token.value = null

    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // Ignorar errores
    }

    await navigateTo('/login', { replace: true })
  }

  return useFetch<T>(url, {
    ...options,
    async onResponseError({ response }) {
      if (response.status === 401) {
        await handleLogout()
      }
    },
  })
}
