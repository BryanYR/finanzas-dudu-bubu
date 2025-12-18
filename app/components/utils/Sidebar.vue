<template>
  <aside
    :class="[
      'fixed left-0 top-0 z-40 h-screen transition-transform',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      'w-64 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white shadow-xl',
    ]"
  >
    <!-- Header -->
    <div class="flex h-16 items-center justify-between border-b border-indigo-800 px-6">
      <div class="flex items-center space-x-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <span class="text-xl font-bold">Finanzas DUDU-BUBU</span>
      </div>
      <button @click="$emit('toggle')" class="text-white hover:text-indigo-300 lg:hidden">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <!-- Dashboard -->
      <NuxtLink to="/" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span>Dashboard</span>
      </NuxtLink>

      <!-- Ingresos -->
      <NuxtLink to="/ingresos" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Ingresos</span>
      </NuxtLink>

      <!-- Gastos -->
      <NuxtLink to="/gastos" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span>Gastos</span>
      </NuxtLink>

      <!-- Tarjetas de Crédito -->
      <NuxtLink to="/tarjetas" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        <span>Tarjetas</span>
      </NuxtLink>

      <!-- Ahorros -->
      <NuxtLink to="/ahorros" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <span>Ahorros</span>
      </NuxtLink>

      <!-- Deudas -->
      <NuxtLink to="/deudas" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
        <span>Deudas</span>
      </NuxtLink>

      <div class="my-2 border-t border-indigo-800"></div>

      <!-- Planificación de Pagos -->
      <NuxtLink to="/planificacion" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span>Planificación de Pagos</span>
      </NuxtLink>

      <!-- Reportes -->
      <NuxtLink to="/reportes" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span>Reportes</span>
      </NuxtLink>

      <!-- Proyecciones -->
      <NuxtLink to="/proyecciones" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <span>Proyecciones</span>
      </NuxtLink>

      <!-- Categorías -->
      <NuxtLink to="/categorias" :class="menuItemClass" @click="$emit('navigate')">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <span>Categorías</span>
      </NuxtLink>
    </nav>

    <!-- User Section -->
    <div class="border-t border-indigo-800 p-4">
      <div class="flex items-center space-x-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold"
        >
          {{ userInitials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ userName }}</p>
          <p class="truncate text-xs text-indigo-300">{{ userEmail }}</p>
        </div>
        <button
          @click="handleLogout"
          class="text-indigo-300 hover:text-white"
          title="Cerrar sesión"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Overlay for mobile -->
  <div
    v-if="isOpen"
    @click="$emit('toggle')"
    class="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
  ></div>
</template>

<script setup lang="ts">
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['toggle', 'navigate'])

// Obtener datos del usuario autenticado
const { data: user } = await useFetch('/api/auth/me')

const userName = computed(() => user.value?.name || 'Usuario')
const userEmail = computed(() => user.value?.email || '')

const userInitials = computed(() => {
  return userName.value
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const menuItemClass =
  'flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-indigo-800 hover:text-white router-link-active:bg-indigo-700 router-link-active:text-white'

const handleLogout = async () => {
  // Hacer logout en el servidor para limpiar la cookie httpOnly
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }

  // Redirigir a login con recarga completa
  window.location.href = '/login'
}
</script>
