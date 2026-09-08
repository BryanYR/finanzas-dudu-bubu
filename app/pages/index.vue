<script setup lang="ts">
import type { User, DashboardStats } from '#types/dashboard'

const { data: user } = await useFetchAuth<User>('/api/auth/me')
const { data: stats } = await useFetchAuth<DashboardStats>('/api/dashboard/stats')

const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const { formatCurrency } = useDateFormatter()

const greeting = computed(() => {
  const h = dayjs().hour()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const firstName = computed(() => user.value?.name?.split(' ')[0] ?? '')

const currentDate = computed(() => dayjs().format('dddd, D [de] MMMM YYYY'))

const balance = computed(() => (stats.value?.totalIncome ?? 0) - (stats.value?.totalExpenses ?? 0))

const savingsRate = computed(() => {
  const income = stats.value?.totalIncome ?? 0
  if (income === 0) return 0
  return Math.max(0, Math.min(100, Math.round((balance.value / income) * 100)))
})

const quickActions = [
  {
    to: '/ingresos',
    label: 'Ingreso',
    icon: '↑',
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    light: 'bg-emerald-50',
  },
  {
    to: '/gastos',
    label: 'Gasto',
    icon: '↓',
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    light: 'bg-red-50',
  },
  {
    to: '/tarjetas',
    label: 'Tarjeta',
    icon: '💳',
    bg: 'bg-indigo-500',
    hover: 'hover:bg-indigo-600',
    light: 'bg-indigo-50',
  },
  {
    to: '/ahorros',
    label: 'Ahorro',
    icon: '⭐',
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    light: 'bg-amber-50',
  },
  {
    to: '/deudas',
    label: 'Deuda',
    icon: '📋',
    bg: 'bg-purple-500',
    hover: 'hover:bg-purple-600',
    light: 'bg-purple-50',
  },
  {
    to: '/reportes',
    label: 'Reporte',
    icon: '📊',
    bg: 'bg-sky-500',
    hover: 'hover:bg-sky-600',
    light: 'bg-sky-50',
  },
]
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4 lg:max-w-5xl">
    <!-- Saludo -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium capitalize text-gray-400">{{ currentDate }}</p>
        <h2 class="text-xl font-bold text-gray-800 lg:text-2xl">
          {{ greeting }}, {{ firstName }} 👋
        </h2>
      </div>
      <div
        class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl shadow-md"
      >
        💰
      </div>
    </div>

    <!-- Card principal: Balance -->
    <div
      class="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
      :class="
        balance >= 0
          ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700'
          : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700'
      "
    >
      <!-- Decoración de fondo -->
      <div class="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div class="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10" />

      <div class="relative">
        <p class="mb-1 text-sm font-medium text-white/70">Balance del mes</p>
        <p class="mb-4 text-4xl font-bold tracking-tight lg:text-5xl">
          {{ formatCurrency(balance) }}
        </p>

        <!-- Barra de tasa de ahorro -->
        <div v-if="balance >= 0" class="mb-3">
          <div class="mb-1 flex justify-between text-xs text-white/70">
            <span>Tasa de ahorro</span>
            <span>{{ savingsRate }}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              class="h-full rounded-full bg-white transition-all duration-700"
              :style="{ width: savingsRate + '%' }"
            />
          </div>
        </div>

        <!-- Mini stats -->
        <div class="flex gap-4">
          <div>
            <p class="text-xs text-white/60">Ingresos</p>
            <p class="font-semibold">{{ formatCurrency(stats?.totalIncome ?? 0) }}</p>
          </div>
          <div class="w-px bg-white/20" />
          <div>
            <p class="text-xs text-white/60">Gastos</p>
            <p class="font-semibold">{{ formatCurrency(stats?.totalExpenses ?? 0) }}</p>
          </div>
          <div class="w-px bg-white/20" />
          <div>
            <p class="text-xs text-white/60">Ahorros</p>
            <p class="font-semibold">{{ formatCurrency(stats?.totalSavings ?? 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats rápidas: 2x2 (mobile) / 4 en fila (desktop) -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <!-- Ingresos -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Ingresos</span>
          <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50">
            <svg
              class="h-3.5 w-3.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </div>
        </div>
        <p class="text-lg font-bold text-gray-800 lg:text-xl">
          {{ formatCurrency(stats?.totalIncome ?? 0) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ stats?.incomeCount ?? 0 }} transacciones</p>
      </div>

      <!-- Gastos -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Gastos</span>
          <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50">
            <svg
              class="h-3.5 w-3.5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
        <p class="text-lg font-bold text-gray-800 lg:text-xl">
          {{ formatCurrency(stats?.totalExpenses ?? 0) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ stats?.expenseCount ?? 0 }} transacciones</p>
      </div>

      <!-- Metas de ahorro -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Metas</span>
          <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50">
            <svg
              class="h-3.5 w-3.5 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
        </div>
        <p class="text-lg font-bold text-gray-800 lg:text-xl">
          {{ stats?.savingsGoals ?? 0 }} activas
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ formatCurrency(stats?.totalSavings ?? 0) }} ahorrado
        </p>
      </div>

      <!-- Gastos por método -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Métodos</span>
          <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50">
            <svg
              class="h-3.5 w-3.5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500">Efectivo</span>
            <span class="font-medium text-gray-700">{{
              formatCurrency(stats?.cashExpenses ?? 0)
            }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500">Débito</span>
            <span class="font-medium text-gray-700">{{
              formatCurrency(stats?.debitExpenses ?? 0)
            }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-gray-500">Crédito</span>
            <span class="font-medium text-gray-700">{{
              formatCurrency(stats?.creditExpenses ?? 0)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 lg:p-5">
      <h3 class="mb-4 text-sm font-semibold text-gray-700">Acciones rápidas</h3>
      <div class="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all active:scale-95 lg:p-4"
          :class="action.light + ' hover:opacity-90'"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-white shadow-sm"
            :class="action.bg"
          >
            {{ action.icon }}
          </div>
          <span class="text-xs font-medium text-gray-600">{{ action.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Footer info -->
    <div class="pb-2 text-center text-xs text-gray-300">
      Datos del mes actual · Actualizado ahora
    </div>
  </div>
</template>
