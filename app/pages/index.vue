<script setup lang="ts">
import type { User, DashboardStats } from '#types/dashboard'
import MoneyIcon from '@components/icons/dashboard/MoneyIcon.vue'
import WalletIcon from '@components/icons/dashboard/WalletIcon.vue'
import GoalIcon from '@components/icons/ahorros/GoalIcon.vue'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import PaymentIcon from '@components/icons/common/PaymentIcon.vue'
import ChartBarIcon from '@components/icons/planificacion/ChartBarIcon.vue'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'
import WarningIcon from '@components/icons/common/WarningIcon.vue'
import LightBulbIcon from '@components/icons/planificacion/LightBulbIcon.vue'
import ExpenseIcon from '@components/icons/gastos/ExpenseIcon.vue'

// Obtener datos del usuario autenticado
const { data: user } = await useFetchAuth<User>('/api/auth/me')

// Obtener estadísticas del mes actual
const { data: stats } = await useFetchAuth<DashboardStats>('/api/dashboard/stats')

const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const currentHour = dayjs().hour()
const greeting = computed(() => {
  if (currentHour < 12) return '¡Buenos días'
  if (currentHour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

const balance = computed(() => {
  return (stats.value?.totalIncome || 0) - (stats.value?.totalExpenses || 0)
})

const balanceTheme = computed(() => {
  if (balance.value > 0) return { text: 'text-green-600', bg: 'bg-green-100' }
  if (balance.value < 0) return { text: 'text-red-600', bg: 'bg-red-100' }
  return { text: 'text-gray-600', bg: 'bg-gray-100' }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {{ greeting }}, {{ user?.name }}!
          </h1>
          <p class="text-sm text-gray-600 sm:text-base">
            Bienvenido a tu centro de control financiero
          </p>
        </div>
        <div class="hidden rounded-full bg-primary-100 p-4 text-primary-600 sm:block">
          <MoneyIcon />
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <!-- Card 1: Ingresos -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-600">Ingresos del Mes</h3>
          <div class="rounded-full bg-green-100 p-1 text-green-600">
            <MoneyIcon />
          </div>
        </div>
        <p class="text-3xl font-bold text-green-600">
          {{ formatCurrency(stats?.totalIncome || 0) }}
        </p>
        <p class="mt-2 text-sm text-gray-500">{{ stats?.incomeCount || 0 }} transacciones</p>
      </div>

      <!-- Card 2: Gastos -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-600">Gastos del Mes</h3>
          <div class="rounded-full bg-red-100 p-1 text-red-600">
            <ExpenseIcon />
          </div>
        </div>
        <p class="text-3xl font-bold text-red-600">
          {{ formatCurrency(stats?.totalExpenses || 0) }}
        </p>
        <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>Efectivo: {{ formatCurrency(stats?.cashExpenses || 0) }}</span>
          <span>Débito: {{ formatCurrency(stats?.debitExpenses || 0) }}</span>
          <span>Crédito: {{ formatCurrency(stats?.creditExpenses || 0) }}</span>
        </div>
      </div>

      <!-- Card 3: Balance -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-600">Balance</h3>
          <div :class="['rounded-full p-3', balanceTheme.bg, balanceTheme.text]">
            <WalletIcon />
          </div>
        </div>
        <p :class="['text-3xl font-bold', balanceTheme.text]">{{ formatCurrency(balance) }}</p>
        <p class="mt-2 flex items-center gap-1 text-sm text-gray-500">
          <CheckCircleIcon v-if="balance > 0" custom-class="text-green-600 h-10 w-10" />
          <WarningIcon v-else-if="balance < 0" custom-class="text-red-600 h-10 w-10" />
          {{ balance > 0 ? 'Superávit' : balance < 0 ? 'Déficit' : 'Equilibrado' }}
        </p>
      </div>

      <!-- Card 4: Ahorros -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-600">Metas de Ahorro</h3>
          <div class="rounded-full bg-blue-100 p-1 text-blue-600">
            <GoalIcon />
          </div>
        </div>
        <p class="text-3xl font-bold text-blue-600">{{ stats?.savingsGoals || 0 }} activas</p>
        <p class="mt-2 text-sm text-gray-500">
          {{ formatCurrency(stats?.totalSavings || 0) }} ahorrado
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 class="mb-6 text-xl font-bold text-gray-900">Acciones Rápidas</h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <NuxtLink
          to="/ingresos"
          class="flex flex-col items-center rounded-xl bg-green-50 p-6 text-center transition hover:bg-green-100"
        >
          <div class="mb-3 rounded-full bg-green-500 p-4 text-white">
            <PlusIcon custom-class="h-8 w-8" />
          </div>
          <span class="font-medium text-gray-800">Nuevo Ingreso</span>
        </NuxtLink>

        <NuxtLink
          to="/gastos"
          class="flex flex-col items-center rounded-xl bg-red-50 p-6 text-center transition hover:bg-red-100"
        >
          <div class="mb-3 rounded-full bg-red-500 p-4 text-white">
            <ExpenseIcon custom-class="h-8 w-8" />
          </div>
          <span class="font-medium text-gray-800">Nuevo Gasto</span>
        </NuxtLink>

        <NuxtLink
          to="/ahorros"
          class="flex flex-col items-center rounded-xl bg-blue-50 p-6 text-center transition hover:bg-blue-100"
        >
          <div class="mb-3 rounded-full bg-blue-500 p-4 text-white">
            <PaymentIcon custom-class="h-8 w-8" />
          </div>
          <span class="font-medium text-gray-800">Meta de Ahorro</span>
        </NuxtLink>

        <NuxtLink
          to="/reportes"
          class="flex flex-col items-center rounded-xl bg-primary-50 p-6 text-center transition hover:bg-primary-100"
        >
          <div class="mb-3 rounded-full bg-primary-600 p-4 text-white">
            <ChartBarIcon custom-class="h-8 w-8" />
          </div>
          <span class="font-medium text-gray-800">Ver Reportes</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Getting Started Tips -->
    <div class="rounded-xl border border-primary-100 bg-primary-50 p-6 shadow-sm sm:p-8">
      <h2 class="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
        <LightBulbIcon custom-class="h-6 w-6 text-primary-600" />
        Consejos para Comenzar
      </h2>
      <ul class="space-y-3">
        <li class="flex items-start">
          <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-primary-600" />
          <span class="text-gray-700"
            >Crea categorías personalizadas para organizar mejor tus ingresos y gastos</span
          >
        </li>
        <li class="flex items-start">
          <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-primary-600" />
          <span class="text-gray-700"
            >Registra tus ingresos y gastos diarios para tener un mejor control</span
          >
        </li>
        <li class="flex items-start">
          <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-primary-600" />
          <span class="text-gray-700"
            >Establece metas de ahorro y realiza seguimiento a tu progreso</span
          >
        </li>
        <li class="flex items-start">
          <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-primary-600" />
          <span class="text-gray-700"
            >Revisa los reportes mensuales para identificar oportunidades de ahorro</span
          >
        </li>
      </ul>
    </div>
  </div>
</template>
