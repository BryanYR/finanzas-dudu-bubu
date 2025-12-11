<script setup lang="ts">
// Obtener datos del usuario autenticado
const { data: user } = await useFetch('/api/auth/me')

const currentHour = new Date().getHours()
const greeting = computed(() => {
  if (currentHour < 12) return '¡Buenos días'
  if (currentHour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
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
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p class="text-3xl font-bold">$0.00</p>
        </div>

        <!-- Card 2: Gastos -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-red-400 to-red-600 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Gastos del Mes</h3>
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <p class="text-3xl font-bold">$0.00</p>
        </div>

        <!-- Card 3: Balance -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Balance</h3>
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p class="text-3xl font-bold">$0.00</p>
        </div>

        <!-- Card 4: Ahorros -->
        <div
          class="transform rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white shadow-lg transition hover:scale-105"
        >
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium opacity-90">Metas de Ahorro</h3>
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <p class="text-3xl font-bold">0 activas</p>
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
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
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
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span class="font-medium text-gray-800">Meta de Ahorro</span>
          </NuxtLink>

          <NuxtLink
            to="/reportes"
            class="flex flex-col items-center rounded-xl bg-purple-50 p-6 text-center transition hover:bg-purple-100"
          >
            <div class="mb-3 rounded-full bg-purple-500 p-4 text-white">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
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
            <svg class="mr-3 mt-1 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Crea categorías personalizadas para organizar mejor tus ingresos y gastos</span>
          </li>
          <li class="flex items-start">
            <svg class="mr-3 mt-1 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Registra tus ingresos y gastos diarios para tener un mejor control</span>
          </li>
          <li class="flex items-start">
            <svg class="mr-3 mt-1 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Establece metas de ahorro y realiza seguimiento a tu progreso</span>
          </li>
          <li class="flex items-start">
            <svg class="mr-3 mt-1 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Revisa los reportes mensuales para identificar oportunidades de ahorro</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
