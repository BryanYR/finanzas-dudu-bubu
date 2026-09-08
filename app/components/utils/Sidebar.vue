<template>
  <aside
    :class="[
      'fixed left-0 top-0 z-40 h-screen transition-transform',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      'flex w-64 flex-col bg-gray-900 text-gray-300',
    ]"
  >
    <!-- Header -->
    <div class="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-800 px-6">
      <div class="flex items-center space-x-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <MoneyIcon custom-class="h-5 w-5 text-white" />
        </div>
        <span class="text-lg font-semibold text-white">Finanzas DUDU-BUBU</span>
      </div>
      <button @click="$emit('toggle')" class="text-gray-400 hover:text-white lg:hidden">
        <CloseIcon custom-class="h-6 w-6" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <!-- Dashboard -->
      <NuxtLink to="/" :class="menuItemClass" @click="$emit('navigate')">
        <HomeIcon custom-class="h-5 w-5" />
        <span>Dashboard</span>
      </NuxtLink>

      <!-- Ingresos -->
      <NuxtLink to="/ingresos" :class="menuItemClass" @click="$emit('navigate')">
        <IncomeIcon custom-class="h-5 w-5" />
        <span>Ingresos</span>
      </NuxtLink>

      <!-- Gastos -->
      <NuxtLink to="/gastos" :class="menuItemClass" @click="$emit('navigate')">
        <ExpenseIcon custom-class="h-5 w-5" />
        <span>Gastos</span>
      </NuxtLink>

      <!-- Tarjetas de Crédito -->
      <NuxtLink to="/tarjetas" :class="menuItemClass" @click="$emit('navigate')">
        <CardIcon custom-class="h-5 w-5" />
        <span>Tarjetas</span>
      </NuxtLink>

      <!-- Ahorros -->
      <NuxtLink to="/ahorros" :class="menuItemClass" @click="$emit('navigate')">
        <GoalIcon custom-class="h-5 w-5" />
        <span>Ahorros</span>
      </NuxtLink>

      <!-- Deudas -->
      <NuxtLink to="/deudas" :class="menuItemClass" @click="$emit('navigate')">
        <DebtIcon custom-class="h-5 w-5" />
        <span>Deudas</span>
      </NuxtLink>

      <div class="my-2 border-t border-gray-800"></div>

      <!-- Planificación de Pagos -->
      <NuxtLink to="/planificacion" :class="menuItemClass" @click="$emit('navigate')">
        <ChecklistIcon custom-class="h-5 w-5" />
        <span>Planificación de Pagos</span>
      </NuxtLink>

      <!-- Reportes -->
      <NuxtLink to="/reportes" :class="menuItemClass" @click="$emit('navigate')">
        <ChartBarIcon custom-class="h-5 w-5" />
        <span>Reportes</span>
      </NuxtLink>

      <!-- Proyecciones -->
      <NuxtLink to="/proyecciones" :class="menuItemClass" @click="$emit('navigate')">
        <TrendingUpIcon custom-class="h-5 w-5" />
        <span>Proyecciones</span>
      </NuxtLink>

      <!-- Categorías -->
      <NuxtLink to="/categorias" :class="menuItemClass" @click="$emit('navigate')">
        <TagIcon custom-class="h-5 w-5" />
        <span>Categorías</span>
      </NuxtLink>
    </nav>

    <!-- User Section -->
    <div class="flex-shrink-0 border-t border-gray-800 p-4">
      <div class="flex items-center space-x-3">
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white"
        >
          {{ userInitials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-white">{{ userName }}</p>
          <p class="truncate text-xs text-gray-400">{{ userEmail }}</p>
        </div>
        <button @click="handleLogout" class="text-gray-400 hover:text-white" title="Cerrar sesión">
          <LogoutIcon custom-class="h-5 w-5" />
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
import MoneyIcon from '@components/icons/dashboard/MoneyIcon.vue'
import HomeIcon from '@components/icons/common/HomeIcon.vue'
import LogoutIcon from '@components/icons/common/LogoutIcon.vue'
import CloseIcon from '@components/icons/common/CloseIcon.vue'
import IncomeIcon from '@components/icons/ingresos/IncomeIcon.vue'
import TrendingUpIcon from '@components/icons/ingresos/TrendingUpIcon.vue'
import ExpenseIcon from '@components/icons/gastos/ExpenseIcon.vue'
import CardIcon from '@components/icons/tarjetas/CardIcon.vue'
import GoalIcon from '@components/icons/ahorros/GoalIcon.vue'
import DebtIcon from '@components/icons/deudas/DebtIcon.vue'
import ChecklistIcon from '@components/icons/planificacion/ChecklistIcon.vue'
import ChartBarIcon from '@components/icons/planificacion/ChartBarIcon.vue'
import TagIcon from '@components/icons/categorias/TagIcon.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['toggle', 'navigate'])

// Obtener datos del usuario autenticado
const { data: user } = await useFetchAuth('/api/auth/me')

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
  'flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white [&.router-link-exact-active]:bg-primary-600/15 [&.router-link-exact-active]:text-primary-400'

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
