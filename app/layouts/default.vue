<script lang="ts" setup>
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const route = useRoute()

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
const closeSidebar = () => {
  sidebarOpen.value = false
}
const toggleCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  }
)

const pageTitle = computed(() => {
  const names: Record<string, string> = {
    index: 'Inicio',
    gastos: 'Gastos',
    ingresos: 'Ingresos',
    tarjetas: 'Tarjetas',
    ahorros: 'Ahorros',
    deudas: 'Deudas',
    planificacion: 'Planificación',
    reportes: 'Reportes',
    proyecciones: 'Proyecciones',
    'analisis-deudas': 'Análisis de Deudas',
    categorias: 'Categorías',
  }
  return names[String(route.name ?? '')] ?? 'App'
})

const bottomNavItems = [
  {
    to: '/',
    label: 'Inicio',
    exact: true,
    activeColor: 'text-indigo-600',
    strokePath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/gastos',
    label: 'Gastos',
    exact: false,
    activeColor: 'text-red-500',
    strokePath:
      'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    to: '/ingresos',
    label: 'Ingresos',
    exact: false,
    activeColor: 'text-emerald-500',
    strokePath:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    to: '/ahorros',
    label: 'Ahorros',
    exact: false,
    activeColor: 'text-amber-500',
    strokePath:
      'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    to: '/deudas',
    label: 'Deudas',
    exact: false,
    activeColor: 'text-purple-500',
    strokePath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
]

const isActive = (item: (typeof bottomNavItems)[0]) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar -->
    <UtilsSidebar
      :is-open="sidebarOpen"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
      @navigate="closeSidebar"
      @collapse="toggleCollapse"
    />

    <!-- Main content -->
    <div
      class="flex flex-1 flex-col overflow-hidden transition-all duration-300"
      :class="sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'"
    >
      <!-- Top Bar -->
      <header
        class="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm lg:h-16 lg:px-6"
      >
        <!-- Hamburger (solo mobile) -->
        <button
          @click="toggleSidebar"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 lg:hidden"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <!-- Título -->
        <h1 class="text-base font-semibold text-gray-800 lg:text-lg">
          {{ pageTitle }}
        </h1>

        <!-- Notificaciones -->
        <button
          class="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
          title="Notificaciones"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span
            class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
          ></span>
        </button>
      </header>

      <!-- Contenido -->
      <main class="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
        <slot />
      </main>
    </div>

    <!-- Bottom Navigation (solo mobile) -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white lg:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="grid grid-cols-5">
        <NuxtLink
          v-for="item in bottomNavItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
          :class="isActive(item) ? item.activeColor : 'text-gray-400'"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="item.strokePath"
            />
          </svg>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>

  <UiToast />
  <UiConfirmDialog />
</template>
