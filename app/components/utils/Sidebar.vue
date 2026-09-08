<script setup lang="ts">
defineProps<{
  isOpen: boolean
  collapsed: boolean
}>()

defineEmits(['toggle', 'navigate', 'collapse'])

const { data: user } = await useFetchAuth('/api/auth/me')

const userName = computed(() => user.value?.name || 'Usuario')
const userEmail = computed(() => user.value?.email || '')
const userInitials = computed(() =>
  userName.value
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
)

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {}
  globalThis.location.href = '/login'
}
</script>

<template>
  <!-- Sidebar -->
  <aside
    :class="[
      'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      collapsed ? 'w-16' : 'w-64',
    ]"
    style="background: linear-gradient(180deg, #1e1b4b 0%, #2d2a72 60%, #1e1b4b 100%)"
  >
    <!-- Logo + Collapse button -->
    <div
      class="flex h-16 shrink-0 items-center border-b border-white/10 px-3"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 overflow-hidden">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-900/50"
        >
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div v-if="!collapsed" class="min-w-0">
          <p class="text-sm font-bold leading-tight text-white">Finanzas</p>
          <p class="text-[11px] font-medium leading-tight text-indigo-300">DUDU · BUBU</p>
        </div>
      </div>

      <!-- Botón de colapsar (solo desktop) -->
      <button
        v-if="!collapsed"
        @click="$emit('collapse')"
        class="hidden h-7 w-7 items-center justify-center rounded-lg text-indigo-300 transition hover:bg-white/10 hover:text-white lg:flex"
        title="Minimizar sidebar"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>

      <!-- Botón de expandir (desktop, collapsed mode) -->
      <button
        v-if="collapsed"
        @click="$emit('collapse')"
        class="hidden h-7 w-7 items-center justify-center rounded-lg text-indigo-300 transition hover:bg-white/10 hover:text-white lg:flex"
        title="Expandir sidebar"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      </button>

      <!-- Cerrar (mobile) -->
      <button
        @click="$emit('toggle')"
        class="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-300 hover:bg-white/10 hover:text-white lg:hidden"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4" :class="collapsed ? 'px-2' : 'px-3'">
      <!-- Sección: Principal -->
      <p
        v-if="!collapsed"
        class="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400"
      >
        Principal
      </p>

      <div class="space-y-0.5">
        <UtilsNavItem to="/" :exact="true" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </template>
          Inicio
        </UtilsNavItem>

        <UtilsNavItem to="/ingresos" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </template>
          Ingresos
        </UtilsNavItem>

        <UtilsNavItem to="/gastos" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </template>
          Gastos
        </UtilsNavItem>

        <UtilsNavItem to="/tarjetas" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </template>
          Tarjetas
        </UtilsNavItem>

        <UtilsNavItem to="/ahorros" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </template>
          Ahorros
        </UtilsNavItem>

        <UtilsNavItem to="/deudas" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </template>
          Deudas
        </UtilsNavItem>
      </div>

      <!-- Sección: Análisis -->
      <div class="mt-5">
        <p
          v-if="!collapsed"
          class="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400"
        >
          Análisis
        </p>
        <div v-else class="mx-1 mb-2 h-px bg-white/10"></div>
        <div class="space-y-0.5">
          <UtilsNavItem to="/analisis-deudas" :collapsed="collapsed" @click="$emit('navigate')">
            <template #icon>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </template>
            Análisis de Deudas
          </UtilsNavItem>

          <UtilsNavItem to="/planificacion" :collapsed="collapsed" @click="$emit('navigate')">
            <template #icon>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </template>
            Planificación
          </UtilsNavItem>

          <UtilsNavItem to="/reportes" :collapsed="collapsed" @click="$emit('navigate')">
            <template #icon>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </template>
            Reportes
          </UtilsNavItem>

          <UtilsNavItem to="/proyecciones" :collapsed="collapsed" @click="$emit('navigate')">
            <template #icon>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </template>
            Proyecciones
          </UtilsNavItem>
        </div>
      </div>

      <!-- Sección: Config -->
      <div class="mt-5">
        <p
          v-if="!collapsed"
          class="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400"
        >
          Config
        </p>
        <div v-else class="mx-1 mb-2 h-px bg-white/10"></div>
        <div class="space-y-0.5">
          <UtilsNavItem to="/categorias" :collapsed="collapsed" @click="$emit('navigate')">
            <template #icon>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </template>
            Categorías
          </UtilsNavItem>
        </div>
      </div>
    </nav>

    <!-- User Section -->
    <div class="shrink-0 border-t border-white/10 p-3">
      <div class="flex items-center" :class="collapsed ? 'justify-center' : 'gap-3'">
        <!-- Avatar -->
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold text-white shadow"
          :title="collapsed ? userName : ''"
        >
          {{ userInitials }}
        </div>
        <!-- Info (solo expandido) -->
        <div v-if="!collapsed" class="min-w-0 flex-1 overflow-hidden">
          <p class="truncate text-sm font-medium text-white">{{ userName }}</p>
          <p class="truncate text-xs text-indigo-300">{{ userEmail }}</p>
        </div>
        <!-- Logout (solo expandido) -->
        <button
          v-if="!collapsed"
          @click="handleLogout"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-indigo-300 transition hover:bg-white/10 hover:text-white"
          title="Cerrar sesión"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  <!-- Overlay (mobile) -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      @click="$emit('toggle')"
      class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
    />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
