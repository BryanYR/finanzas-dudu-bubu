<script setup lang="ts">
import type { PaymentPlan, PaymentSuggestion } from '#types/planificacion'
import RefreshIcon from '@components/icons/common/RefreshIcon.vue'
import ChartBarIcon from '@components/icons/planificacion/ChartBarIcon.vue'
import WalletIcon from '@components/icons/dashboard/WalletIcon.vue'

definePageMeta({
  layout: 'default',
})

// Data fetching
const {
  data: paymentPlan,
  pending,
  error,
  refresh,
} = await useFetchAuth<PaymentPlan>('/api/payment-plan/suggestions')

const { formatDate } = useDateFormatter()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return '🔴'
    case 'high':
      return '🟠'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'debt':
      return 'Deuda'
    case 'creditCard':
      return 'Tarjeta'
    case 'expense':
      return 'Gasto Fijo'
    default:
      return type
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'from-green-500 to-green-600'
    case 'tight':
      return 'from-yellow-500 to-yellow-600'
    case 'deficit':
      return 'from-red-500 to-red-600'
    default:
      return 'from-gray-500 to-gray-600'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'Saludable'
    case 'tight':
      return 'Ajustado'
    case 'deficit':
      return 'Déficit'
    default:
      return status
  }
}
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Planificación de Pagos</h1>
        <p class="mt-1 text-sm text-gray-600">Optimiza tus pagos y mantén tu salud financiera</p>
      </div>
      <UiButton @click="refresh()" variant="outline" :loading="pending">
        <RefreshIcon custom-class="mr-2" />
        Actualizar
      </UiButton>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
        ></div>
        <p class="mt-2 text-sm text-gray-600">Calculando plan de pagos...</p>
      </div>
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4">
      <p class="text-red-800">Error al cargar el plan de pagos</p>
    </div>

    <div v-else-if="paymentPlan" class="space-y-6">
      <!-- Resumen General -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Estado del Flujo -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Estado del Flujo</p>
              <p
                :class="[
                  'mt-2 text-2xl font-bold',
                  paymentPlan.summary.cashFlowStatus === 'healthy'
                    ? 'text-green-600'
                    : paymentPlan.summary.cashFlowStatus === 'tight'
                      ? 'text-yellow-600'
                      : 'text-red-600',
                ]"
              >
                {{ getStatusText(paymentPlan.summary.cashFlowStatus) }}
              </p>
            </div>
            <div
              :class="[
                'rounded-full bg-gradient-to-br p-3',
                getStatusColor(paymentPlan.summary.cashFlowStatus),
              ]"
            >
              <ChartBarIcon custom-class="text-white" />
            </div>
          </div>
        </div>

        <!-- Saldo Actual -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="w-full">
              <p class="text-sm font-medium text-gray-600">Saldo Actual</p>
              <p class="mt-2 text-2xl font-bold text-blue-600">
                {{ formatCurrency(paymentPlan.summary.currentBalance) }}
              </p>
              <div class="mt-2 space-y-1">
                <p
                  v-if="paymentPlan.summary.pendingIncome && paymentPlan.summary.pendingIncome > 0"
                  class="text-xs font-semibold text-green-600"
                >
                  + {{ formatCurrency(paymentPlan.summary.pendingIncome) }} pendiente
                </p>
                <p class="text-xs text-gray-500">
                  = {{ formatCurrency(paymentPlan.summary.availableBalance) }} disponible
                </p>
              </div>
            </div>
            <div class="rounded-full bg-blue-100 p-3">
              <WalletIcon custom-class="text-blue-600" />
            </div>
          </div>
        </div>

        <!-- Total Obligaciones -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Obligaciones</p>
              <p class="mt-2 text-2xl font-bold text-orange-600">
                {{ formatCurrency(paymentPlan.summary.totalObligations) }}
              </p>
              <p class="mt-1 text-xs text-gray-500">
                {{ paymentPlan.suggestions.length }} pagos pendientes
              </p>
            </div>
            <div class="rounded-full bg-orange-100 p-3">
              <svg
                class="h-8 w-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- Saldo Proyectado -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Saldo Proyectado</p>
              <p
                class="mt-2 text-2xl font-bold"
                :class="
                  paymentPlan.summary.projectedBalance && paymentPlan.summary.projectedBalance >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                "
              >
                {{ formatCurrency(paymentPlan.summary.projectedBalance ?? 0) }}
              </p>
              <p class="mt-1 text-xs text-gray-500">Después de pagos</p>
            </div>
            <div class="rounded-full bg-purple-100 p-3">
              <svg
                class="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Advertencias -->
      <div
        v-if="paymentPlan.summary.warnings.length > 0"
        class="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Análisis de tu Situación Financiera</h3>
            <div class="mt-2 text-sm text-yellow-700">
              <ul class="space-y-1">
                <li
                  v-for="(warning, idx) in paymentPlan.summary.warnings"
                  :key="idx"
                  class="flex items-start"
                >
                  <span class="mr-2 mt-0.5">•</span>
                  <span>{{ warning }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Estrategia de Pago Sugerida -->
      <div
        class="rounded-lg border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg
              class="h-8 w-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div class="ml-4 flex-1">
            <h3 class="text-lg font-bold text-indigo-900">📋 Estrategia de Pago Optimizada</h3>
            <div class="mt-3 space-y-2 text-sm text-indigo-800">
              <p class="font-medium">
                Con tu saldo actual de
                <span class="font-bold">{{
                  formatCurrency(paymentPlan.summary.currentBalance)
                }}</span>
                <span
                  v-if="paymentPlan.summary.pendingIncome && paymentPlan.summary.pendingIncome > 0"
                >
                  más
                  <span class="font-bold text-green-700">{{
                    formatCurrency(paymentPlan.summary.pendingIncome)
                  }}</span>
                  de ingresos esperados </span
                >, puedes cubrir tus obligaciones siguiendo este plan:
              </p>
              <div class="mt-4 grid gap-3 md:grid-cols-3">
                <div class="rounded-lg bg-white/80 p-3 shadow-sm">
                  <p class="text-xs font-medium text-gray-600">PASO 1: Pagos Urgentes</p>
                  <p class="mt-1 text-lg font-bold text-red-600">
                    {{ paymentPlan.suggestions.filter((s) => s.priority === 'urgent').length }}
                  </p>
                  <p class="text-xs text-gray-600">Hacerlos HOY</p>
                </div>
                <div class="rounded-lg bg-white/80 p-3 shadow-sm">
                  <p class="text-xs font-medium text-gray-600">PASO 2: Prioridad Alta</p>
                  <p class="mt-1 text-lg font-bold text-orange-600">
                    {{ paymentPlan.suggestions.filter((s) => s.priority === 'high').length }}
                  </p>
                  <p class="text-xs text-gray-600">Esta semana</p>
                </div>
                <div class="rounded-lg bg-white/80 p-3 shadow-sm">
                  <p class="text-xs font-medium text-gray-600">PASO 3: Resto</p>
                  <p class="mt-1 text-lg font-bold text-blue-600">
                    {{
                      paymentPlan.suggestions.filter(
                        (s) => s.priority === 'medium' || s.priority === 'low'
                      ).length
                    }}
                  </p>
                  <p class="text-xs text-gray-600">Antes de vencimiento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sugerencias de Pagos -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-bold text-gray-900">
          Plan de Pagos Sugerido (Ordenado por Prioridad)
        </h2>

        <div class="space-y-4">
          <div
            v-for="(suggestion, idx) in paymentPlan.suggestions"
            :key="suggestion.id"
            class="rounded-lg border-2 bg-white p-4 transition-shadow hover:shadow-md"
            :class="getPriorityColor(suggestion.priority)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ getPriorityIcon(suggestion.priority) }}</span>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold">{{ idx + 1 }}. {{ suggestion.name }}</h3>
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-semibold"
                        :class="getPriorityColor(suggestion.priority)"
                      >
                        {{ getTypeLabel(suggestion.type) }}
                      </span>
                    </div>
                    <p class="mt-1 text-sm">{{ suggestion.reason }}</p>
                  </div>
                </div>

                <div class="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <span class="font-medium">Monto:</span>
                    <span class="ml-1 font-bold">{{ formatCurrency(suggestion.amount) }}</span>
                  </div>
                  <div>
                    <span class="font-medium">Vence:</span>
                    <span class="ml-1">{{ formatDate(suggestion.dueDate) }}</span>
                  </div>
                  <div>
                    <span class="font-medium">Pagar en:</span>
                    <span class="ml-1 font-semibold text-blue-600">{{
                      formatDate(suggestion.suggestedPaymentDate)
                    }}</span>
                  </div>
                  <div v-if="suggestion.interestRate">
                    <span class="font-medium">Interés:</span>
                    <span class="ml-1">{{ suggestion.interestRate }}%</span>
                  </div>
                </div>

                <div v-if="suggestion.remainingBalance" class="mt-2 text-sm text-gray-600">
                  <span class="font-medium">Saldo pendiente:</span>
                  {{ formatCurrency(suggestion.remainingBalance) }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="paymentPlan.suggestions.length === 0" class="py-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">¡Excelente!</h3>
            <p class="mt-1 text-sm text-gray-500">No tienes pagos pendientes este mes.</p>
          </div>
        </div>
      </div>

      <!-- Proyección de Flujo de Caja -->
      <div
        v-if="paymentPlan.cashFlowProjection.length > 0"
        class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 class="mb-4 text-xl font-bold text-gray-900">Proyección de Flujo de Caja (30 días)</h2>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Fecha
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Tipo
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Descripción
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Ingresos
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Gastos
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr
                v-for="day in paymentPlan.cashFlowProjection"
                :key="day.date"
                :class="[
                  day.balance < 0 ? 'bg-red-50' : '',
                  day.type === 'income' ? 'bg-green-50' : '',
                ]"
              >
                <td class="whitespace-nowrap px-4 py-3 text-sm font-medium">
                  {{ formatDate(day.date) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    v-if="day.type === 'income'"
                    class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                  >
                    💰 Ingreso
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                  >
                    📤 Pagos
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <div v-if="day.type === 'income'" class="font-medium text-green-700">
                    Ingreso recurrente esperado
                  </div>
                  <div v-else class="space-y-1">
                    <div
                      v-for="payment in day.payments"
                      :key="payment.id"
                      class="text-xs text-gray-700"
                    >
                      {{ payment.name }}
                    </div>
                  </div>
                </td>
                <td
                  class="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-green-600"
                >
                  <span v-if="day.income > 0">+{{ formatCurrency(day.income) }}</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td
                  class="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600"
                >
                  <span v-if="day.expenses > 0">-{{ formatCurrency(day.expenses) }}</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td
                  class="whitespace-nowrap px-4 py-3 text-right text-sm font-bold"
                  :class="day.balance < 0 ? 'text-red-600' : 'text-green-600'"
                >
                  {{ formatCurrency(day.balance) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Consejos Adicionales -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 class="mb-3 flex items-center text-lg font-bold text-blue-900">
          <svg class="mr-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Consejos para una mejor salud financiera
        </h3>
        <ul class="space-y-2 text-sm text-blue-800">
          <li class="flex items-start">
            <span class="mr-2">💡</span>
            <span
              ><strong>Prioriza pagos urgentes:</strong> Los pagos marcados en rojo deben hacerse
              inmediatamente para evitar cargos adicionales.</span
            >
          </li>
          <li class="flex items-start">
            <span class="mr-2">💡</span>
            <span
              ><strong>Mantén un colchón:</strong> Siempre trata de mantener al menos el 10% de tus
              ingresos como reserva de emergencia.</span
            >
          </li>
          <li class="flex items-start">
            <span class="mr-2">💡</span>
            <span
              ><strong>Paga deudas de alto interés:</strong> Prioriza las deudas con tasas de
              interés superiores al 15% para ahorrar dinero a largo plazo.</span
            >
          </li>
          <li class="flex items-start">
            <span class="mr-2">💡</span>
            <span
              ><strong>Automatiza pagos recurrentes:</strong> Configura pagos automáticos para
              servicios básicos y evita olvidos.</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
