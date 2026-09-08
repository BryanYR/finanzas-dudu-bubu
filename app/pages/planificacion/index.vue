<script setup lang="ts">
import type { PaymentPlan, PaymentSuggestion, CashFlowDay } from '#types/planificacion'

definePageMeta({ layout: 'default' })

const { formatDate, formatCurrency } = useDateFormatter()
const {
  data: paymentPlan,
  pending,
  error,
  refresh,
} = await useFetchAuth<PaymentPlan>('/api/payment-plan/suggestions')

const refreshing = ref(false)
const doRefresh = async () => {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

// ── Config maps ────────────────────────────────────────────────────────────────

const statusConfig = {
  healthy: {
    label: 'Saludable',
    gradient: 'from-emerald-600 via-emerald-700 to-teal-800',
    barColor: 'bg-emerald-400',
  },
  tight: {
    label: 'Ajustado',
    gradient: 'from-amber-500 via-orange-500 to-orange-700',
    barColor: 'bg-amber-300',
  },
  deficit: {
    label: 'Déficit',
    gradient: 'from-red-600 via-red-700 to-rose-800',
    barColor: 'bg-red-400',
  },
} as const

const priorityConfig = {
  urgent: {
    label: 'Urgente',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  },
  high: {
    label: 'Alta',
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Media',
    bar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
  },
  low: {
    label: 'Baja',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
} as const

const typeLabel: Record<string, string> = {
  debt: 'Deuda',
  creditCard: 'Tarjeta',
  expense: 'Gasto Fijo',
}

const typeBadge: Record<string, string> = {
  debt: 'bg-purple-100 text-purple-700',
  creditCard: 'bg-indigo-100 text-indigo-700',
  expense: 'bg-gray-100 text-gray-600',
}

// ── Computed ───────────────────────────────────────────────────────────────────

const status = computed(() => paymentPlan.value?.summary.cashFlowStatus ?? 'healthy')
const cfg = computed(() => statusConfig[status.value])

const urgentSuggestions = computed(
  () => paymentPlan.value?.suggestions.filter((s) => s.priority === 'urgent') ?? []
)
const highSuggestions = computed(
  () => paymentPlan.value?.suggestions.filter((s) => s.priority === 'high') ?? []
)
const restSuggestions = computed(
  () =>
    paymentPlan.value?.suggestions.filter((s) => s.priority === 'medium' || s.priority === 'low') ??
    []
)

// How much of obligations can be covered by available balance (capped at 100%)
const coveragePct = computed(() => {
  const plan = paymentPlan.value
  if (!plan || plan.summary.totalObligations === 0) return 100
  return Math.min(100, (plan.summary.availableBalance / plan.summary.totalObligations) * 100)
})

const daysUntilDue = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)

const dueDateLabel = (dateStr: string) => {
  const days = daysUntilDue(dateStr)
  if (days < 0) return { text: 'Vencida', cls: 'text-red-600 font-bold' }
  if (days === 0) return { text: 'Hoy', cls: 'text-red-600 font-bold' }
  if (days === 1) return { text: 'Mañana', cls: 'text-orange-600 font-semibold' }
  if (days <= 3) return { text: `${days} días`, cls: 'text-orange-600 font-semibold' }
  if (days <= 7) return { text: `${days} días`, cls: 'text-amber-600' }
  return { text: `${days} días`, cls: 'text-gray-500' }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Planificación</h1>
        <p class="text-sm text-gray-500">Optimiza tus pagos según tus ingresos disponibles</p>
      </div>
      <button
        @click="doRefresh"
        :disabled="refreshing || pending"
        class="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
      >
        <svg
          class="h-4 w-4"
          :class="refreshing || pending ? 'animate-spin' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Actualizar
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex flex-col items-center justify-center py-20 text-center">
      <div
        class="border-3 h-10 w-10 animate-spin rounded-full border-indigo-500 border-t-transparent"
      ></div>
      <p class="mt-3 text-sm text-gray-500">Calculando plan de pagos...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      Error al cargar el plan de pagos: {{ error.message }}
    </div>

    <template v-else-if="paymentPlan">
      <!-- ── Salud financiera (card principal) ─────────────────────────────── -->
      <div
        class="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        :class="`bg-gradient-to-br ${cfg.gradient}`"
      >
        <!-- Decorativos -->
        <div class="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div class="absolute -bottom-6 right-24 h-24 w-24 rounded-full bg-white/10" />

        <div class="relative">
          <!-- Fila superior -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest text-white/60">
                Estado financiero
              </p>
              <p class="mt-0.5 text-2xl font-bold">{{ cfg.label }}</p>
              <p class="mt-3 text-xs text-white/60">Saldo proyectado tras pagos</p>
              <p
                class="text-3xl font-bold tracking-tight"
                :class="
                  (paymentPlan.summary.projectedBalance ?? 0) < 0 ? 'text-red-300' : 'text-white'
                "
              >
                {{ formatCurrency(paymentPlan.summary.projectedBalance ?? 0) }}
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-xs text-white/60">Ingresos disponibles</p>
              <p class="text-xl font-bold">
                {{ formatCurrency(paymentPlan.summary.availableBalance) }}
              </p>
              <p class="mt-1 text-xs text-white/60">Total obligaciones</p>
              <p class="text-xl font-bold">
                {{ formatCurrency(paymentPlan.summary.totalObligations) }}
              </p>
            </div>
          </div>

          <!-- Barra de cobertura -->
          <div class="mt-4">
            <div class="mb-1 flex justify-between text-xs text-white/70">
              <span>Cobertura de obligaciones</span>
              <span class="font-semibold text-white">{{ coveragePct.toFixed(0) }}%</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="cfg.barColor"
                :style="{ width: coveragePct + '%' }"
              ></div>
            </div>
          </div>

          <!-- Mini stats -->
          <div class="mt-4 flex flex-wrap gap-5">
            <div>
              <p class="text-lg font-bold">{{ paymentPlan.suggestions.length }}</p>
              <p class="text-xs text-white/60">pagos pendientes</p>
            </div>
            <div>
              <p class="text-lg font-bold">
                {{ formatCurrency(paymentPlan.summary.currentBalance) }}
              </p>
              <p class="text-xs text-white/60">balance actual</p>
            </div>
            <div v-if="(paymentPlan.summary.pendingIncome ?? 0) > 0">
              <p class="text-lg font-bold">
                {{ formatCurrency(paymentPlan.summary.pendingIncome ?? 0) }}
              </p>
              <p class="text-xs text-white/60">ingresos esperados</p>
            </div>
            <div>
              <p class="text-lg font-bold">
                {{ formatCurrency(paymentPlan.summary.suggestedSafetyBuffer) }}
              </p>
              <p class="text-xs text-white/60">colchón sugerido</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Advertencias ───────────────────────────────────────────────────── -->
      <div
        v-if="paymentPlan.summary.warnings.length > 0"
        class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
      >
        <div class="flex items-center gap-2 border-b border-gray-50 px-4 py-3">
          <svg
            class="h-4 w-4 shrink-0 text-amber-500"
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
          <p class="text-sm font-semibold text-gray-700">Análisis de situación</p>
        </div>
        <ul class="divide-y divide-gray-50">
          <li
            v-for="(w, i) in paymentPlan.summary.warnings"
            :key="i"
            class="px-4 py-2.5 text-sm text-gray-600"
          >
            {{ w }}
          </li>
        </ul>
      </div>

      <!-- ── Estrategia de pago (chips resumen) ────────────────────────────── -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          Estrategia sugerida
        </p>
        <div class="flex flex-wrap gap-3">
          <div class="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
            <div class="h-2 w-2 rounded-full bg-red-500"></div>
            <div>
              <p class="text-xs font-bold text-red-700">Paso 1 · Urgente</p>
              <p class="text-xs text-red-600">
                {{ urgentSuggestions.length }} pago{{ urgentSuggestions.length !== 1 ? 's' : '' }} ·
                Hacer HOY
              </p>
            </div>
          </div>
          <div
            class="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 ring-1 ring-orange-100"
          >
            <div class="h-2 w-2 rounded-full bg-orange-500"></div>
            <div>
              <p class="text-xs font-bold text-orange-700">Paso 2 · Alta</p>
              <p class="text-xs text-orange-600">
                {{ highSuggestions.length }} pago{{ highSuggestions.length !== 1 ? 's' : '' }} ·
                Esta semana
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
            <div class="h-2 w-2 rounded-full bg-gray-400"></div>
            <div>
              <p class="text-xs font-bold text-gray-600">Paso 3 · Resto</p>
              <p class="text-xs text-gray-500">
                {{ restSuggestions.length }} pago{{ restSuggestions.length !== 1 ? 's' : '' }} ·
                Antes del vencimiento
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Lista de sugerencias de pago ──────────────────────────────────── -->
      <div>
        <p class="mb-3 text-sm font-semibold text-gray-700">
          Plan de pagos
          <span class="ml-1 text-xs font-normal text-gray-400">(ordenado por prioridad)</span>
        </p>

        <!-- Empty state -->
        <div
          v-if="paymentPlan.suggestions.length === 0"
          class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <svg
              class="h-8 w-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 class="mt-4 text-sm font-semibold text-gray-700">¡Todo al día!</h3>
          <p class="mt-1 text-sm text-gray-400">No tienes pagos pendientes este mes.</p>
        </div>

        <!-- Suggestions -->
        <div v-else class="space-y-2.5">
          <div
            v-for="(s, idx) in paymentPlan.suggestions"
            :key="s.id"
            class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
          >
            <!-- Barra de prioridad -->
            <div class="flex">
              <div class="w-1 shrink-0" :class="priorityConfig[s.priority].bar"></div>
              <div class="flex-1 p-4">
                <!-- Fila 1: número, nombre, badges -->
                <div class="flex flex-wrap items-start gap-2">
                  <span class="shrink-0 text-xs font-bold text-gray-300">{{
                    String(idx + 1).padStart(2, '0')
                  }}</span>
                  <p class="flex-1 text-sm font-semibold leading-tight text-gray-800">
                    {{ s.name }}
                  </p>
                  <div class="flex shrink-0 gap-1.5">
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      :class="priorityConfig[s.priority].badge"
                    >
                      {{ priorityConfig[s.priority].label }}
                    </span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      :class="typeBadge[s.type]"
                    >
                      {{ typeLabel[s.type] }}
                    </span>
                  </div>
                </div>

                <!-- Razón -->
                <p class="mt-1.5 text-xs italic text-gray-500">{{ s.reason }}</p>

                <!-- Fila de datos -->
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <!-- Monto -->
                  <div class="flex items-baseline gap-1">
                    <span class="text-xs text-gray-400">Monto</span>
                    <span class="text-base font-bold text-gray-900">{{
                      formatCurrency(s.amount)
                    }}</span>
                  </div>

                  <!-- Vence -->
                  <div class="flex items-center gap-1 text-xs">
                    <svg
                      class="h-3.5 w-3.5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span class="text-gray-400">Vence</span>
                    <span :class="dueDateLabel(s.dueDate).cls">{{ formatDate(s.dueDate) }}</span>
                    <span
                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="
                        dueDateLabel(s.dueDate).cls.includes('red')
                          ? 'bg-red-50'
                          : dueDateLabel(s.dueDate).cls.includes('orange')
                            ? 'bg-orange-50'
                            : 'bg-gray-50'
                      "
                    >
                      {{ dueDateLabel(s.dueDate).text }}
                    </span>
                  </div>

                  <!-- Pagar el -->
                  <div class="flex items-center gap-1 text-xs">
                    <svg
                      class="h-3.5 w-3.5 text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span class="text-gray-400">Pagar el</span>
                    <span class="font-semibold text-indigo-600">{{
                      formatDate(s.suggestedPaymentDate)
                    }}</span>
                  </div>

                  <!-- Interés -->
                  <div v-if="s.interestRate" class="flex items-center gap-1 text-xs">
                    <span class="text-gray-400">Interés</span>
                    <span class="font-semibold text-rose-600">{{ s.interestRate }}%</span>
                  </div>

                  <!-- Saldo pendiente -->
                  <div
                    v-if="s.remainingBalance && s.type === 'debt'"
                    class="flex items-center gap-1 text-xs"
                  >
                    <span class="text-gray-400">Saldo deuda</span>
                    <span class="font-semibold text-gray-600">{{
                      formatCurrency(s.remainingBalance)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Proyección de flujo de caja ───────────────────────────────────── -->
      <div
        v-if="paymentPlan.cashFlowProjection.length > 0"
        class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
      >
        <div class="border-b border-gray-50 px-4 py-3">
          <p class="text-sm font-semibold text-gray-700">Proyección de flujo (próximos 30 días)</p>
          <p class="text-xs text-gray-400">
            Saldo estimado día a día considerando pagos e ingresos esperados
          </p>
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="day in paymentPlan.cashFlowProjection"
            :key="day.date"
            class="flex items-center gap-4 px-4 py-3"
            :class="day.balance < 0 ? 'bg-red-50/60' : ''"
          >
            <!-- Fecha + tipo -->
            <div class="w-14 shrink-0 text-center">
              <p class="text-xs font-bold text-gray-700">{{ formatDate(day.date) }}</p>
            </div>

            <!-- Badge tipo -->
            <div class="shrink-0">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="
                  day.type === 'income'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-orange-100 text-orange-700'
                "
              >
                {{ day.type === 'income' ? 'Ingreso' : 'Pago' }}
              </span>
            </div>

            <!-- Descripción -->
            <div class="min-w-0 flex-1 text-xs text-gray-600">
              <div v-if="day.type === 'income'" class="font-medium text-emerald-700">
                Ingreso recurrente esperado
              </div>
              <div v-else class="space-y-0.5">
                <p v-for="p in day.payments" :key="p.id" class="truncate">
                  {{ p.name }}
                </p>
              </div>
            </div>

            <!-- Movimiento -->
            <div class="shrink-0 text-right">
              <p v-if="day.income > 0" class="text-sm font-semibold text-emerald-600">
                +{{ formatCurrency(day.income) }}
              </p>
              <p v-if="day.expenses > 0" class="text-sm font-semibold text-red-600">
                -{{ formatCurrency(day.expenses) }}
              </p>
            </div>

            <!-- Balance resultante -->
            <div class="w-24 shrink-0 text-right">
              <p
                class="text-sm font-bold"
                :class="day.balance < 0 ? 'text-red-600' : 'text-gray-800'"
              >
                {{ formatCurrency(day.balance) }}
              </p>
              <p class="text-[10px] text-gray-400">saldo</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Consejos ───────────────────────────────────────────────────────── -->
      <div>
        <p class="mb-3 text-sm font-semibold text-gray-700">Consejos financieros</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="tip in [
              {
                icon: '🎯',
                title: 'Prioriza lo urgente',
                body: 'Los pagos marcados como urgentes deben realizarse hoy para evitar intereses moratorios y daños a tu historial.',
              },
              {
                icon: '🛡️',
                title: 'Mantén un colchón',
                body: 'Intenta mantener al menos el 10% de tus ingresos como reserva de emergencia antes de hacer pagos opcionales.',
              },
              {
                icon: '🔥',
                title: 'Ataca el alto interés',
                body: 'Prioriza las deudas con tasa superior al 15%. Pagar el mínimo en las demás y concentrar el excedente aquí ahorra más dinero.',
              },
              {
                icon: '📅',
                title: 'Paga antes del corte',
                body: 'En tarjetas de crédito, pagar 2 días antes del vencimiento evita intereses. Nunca esperes al último día.',
              },
            ]"
            :key="tip.title"
            class="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <span class="shrink-0 text-2xl">{{ tip.icon }}</span>
            <div>
              <p class="text-sm font-semibold text-gray-800">{{ tip.title }}</p>
              <p class="mt-0.5 text-xs leading-relaxed text-gray-500">{{ tip.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
