<script setup lang="ts">
import type { User, DashboardStats } from '#types/dashboard'
import MoneyIcon from '@components/icons/dashboard/MoneyIcon.vue'
import CreditCardIcon from '@components/icons/dashboard/CreditCardIcon.vue'
import WalletIcon from '@components/icons/dashboard/WalletIcon.vue'
import GoalIcon from '@components/icons/ahorros/GoalIcon.vue'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import PaymentIcon from '@components/icons/common/PaymentIcon.vue'
import ChartBarIcon from '@components/icons/planificacion/ChartBarIcon.vue'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'

// Obtener datos del usuario autenticado
const { data: user } = await useFetchAuth<User>('/api/auth/me')

// Obtener estadísticas del mes actual
const { data: stats, refresh: refreshStats } =
  await useFetchAuth<DashboardStats>('/api/dashboard/stats')

const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const currentHour = dayjs().hour()
const greeting = computed(() => {
  if (currentHour < 12) return '¡Buenos días'
  if (currentHour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const balance = computed(() => {
  return (stats.value?.totalIncome || 0) - (stats.value?.totalExpenses || 0)
})

const balanceColor = computed(() => {
  if (balance.value > 0) return 'from-green-400 to-green-600'
  if (balance.value < 0) return 'from-red-400 to-red-600'
  return 'from-gray-400 to-gray-600'
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
    <div class="mx-auto max-w-6xl">
      <!-- Welcome Header -->
      <div class="mb-8 rounded-2xl bg-white p-8 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="mb-2 text-4xl font-bold text-gray-800">
              {{ greeting }}, {{ user?.name }}! 👋
            </h1>
            <p class="text-lg text-gray-600">Bienvenido a tu centro de control financiero</p>
          </div>
          <div class="hidden md:block">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl text-white shadow-lg"
            >
              💰
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Cards -->
      <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <!-- Card 1: Ingresos -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-green-400 to-green-600 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Ingresos del Mes</h3>
            <MoneyIcon />
          </div>
          <p class="text-3xl font-bold">{{ formatCurrency(stats?.totalIncome || 0) }}</p>
          <p class="mt-2 text-sm opacity-80">{{ stats?.incomeCount || 0 }} transacciones</p>
        </div>

        <!-- Card 2: Gastos -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-red-400 to-red-600 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Gastos del Mes</h3>
            <CreditCardIcon />
          </div>
          <p class="text-3xl font-bold">{{ formatCurrency(stats?.totalExpenses || 0) }}</p>
          <div class="mt-2 flex gap-2 text-xs opacity-80">
            <span>💵 {{ formatCurrency(stats?.cashExpenses || 0) }}</span>
            <span>💳 {{ formatCurrency(stats?.debitExpenses || 0) }}</span>
            <span>💳 {{ formatCurrency(stats?.creditExpenses || 0) }}</span>
          </div>
        </div>

        <!-- Card 3: Balance -->
        <div
          :class="[
            'transform rounded-xl bg-gradient-to-br p-6 text-white shadow-lg transition hover:scale-105',
            balanceColor,
          ]"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Balance</h3>
            <WalletIcon />
          </div>
          <p class="text-3xl font-bold">{{ formatCurrency(balance) }}</p>
          <p class="mt-2 text-sm opacity-80">
            {{ balance > 0 ? '✅ Superávit' : balance < 0 ? '⚠️ Déficit' : 'Equilibrado' }}
          </p>
        </div>

        <!-- Card 4: Ahorros -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Metas de Ahorro</h3>
            <GoalIcon />
          </div>
          <p class="text-3xl font-bold">{{ stats?.savingsGoals || 0 }} activas</p>
          <p class="mt-2 text-sm opacity-80">
            {{ formatCurrency(stats?.totalSavings || 0) }} ahorrado
          </p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8 rounded-2xl bg-white p-8 shadow-lg">
        <h2 class="mb-6 text-2xl font-bold text-gray-800">Acciones Rápidas</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NuxtLink
            to="/ingresos"
            class="flex flex-col items-center rounded-xl bg-green-50 p-6 text-center transition hover:bg-green-100"
          >
            <div class="mb-3 rounded-full bg-green-500 p-4 text-white">
              <PlusIcon custom-class="h-6 w-6" />
            </div>
            <span class="font-medium text-gray-800">Nuevo Ingreso</span>
          </NuxtLink>

          <NuxtLink
            to="/gastos"
            class="flex flex-col items-center rounded-xl bg-red-50 p-6 text-center transition hover:bg-red-100"
          >
            <div class="mb-3 rounded-full bg-red-500 p-4 text-white">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                />
              </svg>
            </div>
            <span class="font-medium text-gray-800">Nuevo Gasto</span>
          </NuxtLink>

          <NuxtLink
            to="/ahorros"
            class="flex flex-col items-center rounded-xl bg-yellow-50 p-6 text-center transition hover:bg-yellow-100"
          >
            <div class="mb-3 rounded-full bg-yellow-500 p-4 text-white">
              <PaymentIcon custom-class="h-6 w-6" />
            </div>
            <span class="font-medium text-gray-800">Meta de Ahorro</span>
          </NuxtLink>

          <NuxtLink
            to="/reportes"
            class="flex flex-col items-center rounded-xl bg-purple-50 p-6 text-center transition hover:bg-purple-100"
          >
            <div class="mb-3 rounded-full bg-purple-500 p-4 text-white">
              <ChartBarIcon custom-class="h-6 w-6" />
            </div>
            <span class="font-medium text-gray-800">Ver Reportes</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Getting Started Tips -->
      <div
        class="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white shadow-lg"
      >
        <h2 class="mb-4 text-2xl font-bold">💡 Consejos para Comenzar</h2>
        <ul class="space-y-3">
          <li class="flex items-start">
            <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
            <span>Crea categorías personalizadas para organizar mejor tus ingresos y gastos</span>
          </li>
          <li class="flex items-start">
            <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
            <span>Registra tus ingresos y gastos diarios para tener un mejor control</span>
          </li>
          <li class="flex items-start">
            <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
            <span>Establece metas de ahorro y realiza seguimiento a tu progreso</span>
          </li>
          <li class="flex items-start">
            <CheckCircleIcon custom-class="mr-3 mt-1 h-5 w-5 flex-shrink-0" />
            <span>Revisa los reportes mensuales para identificar oportunidades de ahorro</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
