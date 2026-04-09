<script setup lang="ts">
import type { AmortizationTable, SimulatorResult, CashForecast } from '#types/proyecciones'
import type { Debt } from '#types/deuda'

definePageMeta({ layout: 'default' })

const { formatDate, formatCurrency } = useDateFormatter()

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'simulador' | 'amortizacion' | 'forecast'
const activeTab = ref<Tab>('simulador')

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'simulador', label: 'Simulador de Pago', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'amortizacion', label: 'Tabla de Amortización', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { id: 'forecast', label: 'Forecast 12 Meses', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
]

// ── Debts list ────────────────────────────────────────────────────────────────
const { data: debts, pending: debtsLoading } = await useFetchAuth<Debt[]>('/api/debts')
const activeDebts = computed(() => (debts.value ?? []).filter((d) => !d.isPaid))

// ── Forecast ──────────────────────────────────────────────────────────────────
const forecastMonths = ref(12)
const {
  data: forecast,
  pending: forecastLoading,
  refresh: refreshForecast,
} = await useFetchAuth<CashForecast>(() => `/api/proyecciones/forecast?months=${forecastMonths.value}`)

watch(forecastMonths, () => refreshForecast())

const forecastTotalIncome = computed(() =>
  (forecast.value?.months ?? []).reduce((s, m) => s + m.income, 0),
)
const forecastTotalDebt = computed(() =>
  (forecast.value?.months ?? []).reduce((s, m) => s + m.debtPayments, 0),
)
const forecastTotalExpenses = computed(() =>
  (forecast.value?.months ?? []).reduce((s, m) => s + m.totalExpenses, 0),
)
const forecastNet = computed(() => forecastTotalIncome.value - forecastTotalExpenses.value)

// ── Amortización ──────────────────────────────────────────────────────────────
const selectedAmortDebtId = ref<number | null>(null)
const amortData = ref<AmortizationTable | null>(null)
const amortLoading = ref(false)
const showPaidRows = ref(true)

const amortRows = computed(() => {
  if (!amortData.value) return []
  if (showPaidRows.value) return amortData.value.rows
  return amortData.value.rows.filter((r) => r.status === 'pending' || r.status === 'overdue')
})

const loadAmortization = async () => {
  if (!selectedAmortDebtId.value) return
  amortLoading.value = true
  amortData.value = null
  try {
    amortData.value = await $fetch<AmortizationTable>(
      `/api/proyecciones/amortizacion/${selectedAmortDebtId.value}`,
    )
  } finally {
    amortLoading.value = false
  }
}

watch(selectedAmortDebtId, loadAmortization)

// ── Simulador ──────────────────────────────────────────────────────────────────
const selectedSimDebtId = ref<number | null>(null)
const extraPayment = ref<number | null>(null)
const simData = ref<SimulatorResult | null>(null)
const simLoading = ref(false)
const simError = ref<string | null>(null)

const selectedSimDebt = computed(() =>
  activeDebts.value.find((d) => d.id === selectedSimDebtId.value) ?? null,
)

const setQuickPayment = (multiplier: number) => {
  if (!selectedSimDebt.value) return
  extraPayment.value = Number((selectedSimDebt.value.monthlyPayment * multiplier).toFixed(2))
}

watch(selectedSimDebtId, () => {
  simData.value = null
  simError.value = null
  extraPayment.value = null
})

const runSimulator = async () => {
  if (!selectedSimDebtId.value || !extraPayment.value || extraPayment.value <= 0) return
  simLoading.value = true
  simError.value = null
  try {
    simData.value = await $fetch<SimulatorResult>(
      `/api/proyecciones/simulador?debtId=${selectedSimDebtId.value}&extraPayment=${extraPayment.value}`,
    )
  } catch (err: any) {
    simError.value = err?.data?.message ?? 'Error al calcular simulación'
  } finally {
    simLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusConfig = {
  paid:     { label: 'Pagada',      cls: 'bg-emerald-100 text-emerald-700' },
  advanced: { label: 'Adelantada',  cls: 'bg-blue-100 text-blue-700'      },
  pending:  { label: 'Pendiente',   cls: 'bg-gray-100 text-gray-600'      },
  overdue:  { label: 'Vencida',     cls: 'bg-red-100 text-red-700'        },
} as const

const rowBg = (status: string) => {
  if (status === 'paid' || status === 'advanced') return 'bg-emerald-50/40'
  if (status === 'overdue') return 'bg-red-50/40'
  return ''
}

const pctDiff = (a: number, b: number) => {
  if (b === 0) return 0
  return Math.round(((a - b) / b) * 100)
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Proyecciones</h1>
      <p class="text-sm text-gray-500">Simula escenarios, visualiza tu amortización y proyecta tu flujo</p>
    </div>

    <!-- Tab nav -->
    <div class="flex gap-1 rounded-xl bg-gray-100 p-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm"
        :class="activeTab === tab.id
          ? 'bg-white text-indigo-700 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
      >
        <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
        </svg>
        <span class="hidden sm:inline">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         TAB: SIMULADOR
    ══════════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'simulador'" class="space-y-5">

      <!-- Selector + input -->
      <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p class="mb-4 text-sm font-semibold text-gray-700">
          ¿Cuánto puedes pagar de más hoy?
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Deuda -->
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Selecciona la deuda</label>
            <select
              v-model="selectedSimDebtId"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option :value="null" disabled>— Elige una deuda —</option>
              <option v-for="d in activeDebts" :key="d.id" :value="d.id">
                {{ d.name }} · {{ formatCurrency(d.remainingAmount) }}
              </option>
            </select>
            <p v-if="activeDebts.length === 0 && !debtsLoading" class="mt-1 text-xs text-gray-400">
              No tienes deudas activas
            </p>
          </div>

          <!-- Pago extra -->
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Pago extraordinario ($)</label>
            <input
              v-model.number="extraPayment"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              :disabled="!selectedSimDebtId"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-40"
            />
            <!-- Quick buttons -->
            <div v-if="selectedSimDebt" class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="opt in [{ label: '+1 cuota', mult: 1 }, { label: '+2 cuotas', mult: 2 }, { label: '+3 cuotas', mult: 3 }]"
                :key="opt.label"
                @click="setQuickPayment(opt.mult)"
                type="button"
                class="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Debt info mini card -->
        <div v-if="selectedSimDebt" class="mt-4 flex flex-wrap gap-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          <span>Saldo: <strong class="text-gray-900">{{ formatCurrency(selectedSimDebt.remainingAmount) }}</strong></span>
          <span>Cuota mensual: <strong class="text-gray-900">{{ formatCurrency(selectedSimDebt.monthlyPayment) }}</strong></span>
          <span>TEA: <strong class="text-rose-600">{{ selectedSimDebt.interestRate }}%</strong></span>
          <span>Cuotas restantes: <strong class="text-gray-900">{{ selectedSimDebt._count?.installments ?? '—' }}</strong></span>
        </div>

        <!-- Simulate button -->
        <div class="mt-4 flex justify-end">
          <button
            @click="runSimulator"
            :disabled="!selectedSimDebtId || !extraPayment || extraPayment <= 0 || simLoading"
            class="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:opacity-40"
          >
            <svg v-if="simLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Calcular
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="simError" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
        {{ simError }}
      </div>

      <!-- Results -->
      <div v-if="simData" class="space-y-4">
        <!-- Header result -->
        <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg">
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-200">Simulación · {{ simData.debt.name }}</p>
          <p class="mt-1 text-base font-bold">
            Pago extraordinario de
            <span class="text-yellow-300">{{ formatCurrency(simData.extraPayment) }}</span>
          </p>
          <div class="mt-3 flex flex-wrap gap-5 text-sm">
            <div>
              <p class="text-xs text-indigo-200">Saldo actual</p>
              <p class="font-bold">{{ formatCurrency(simData.debt.remainingAmount) }}</p>
            </div>
            <div>
              <p class="text-xs text-indigo-200">Cuotas pendientes</p>
              <p class="font-bold">{{ simData.debt.remainingInstallments }}</p>
            </div>
            <div>
              <p class="text-xs text-indigo-200">Vence actualmente</p>
              <p class="font-bold">{{ formatDate(simData.debt.completionDateNow) }}</p>
            </div>
          </div>
        </div>

        <!-- Two scenarios -->
        <div class="grid gap-4 lg:grid-cols-2">

          <!-- Reducción de plazo -->
          <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div class="bg-emerald-600 px-4 py-3 text-white">
              <p class="text-[11px] font-bold uppercase tracking-widest text-emerald-100">Opción A</p>
              <p class="text-base font-bold">Reducción de Plazo</p>
              <p class="text-xs text-emerald-100">Misma cuota · terminas antes</p>
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Cuotas restantes</span>
                <div class="text-right">
                  <span class="text-sm text-gray-400 line-through">{{ simData.debt.remainingInstallments }}</span>
                  <span class="ml-2 text-base font-bold text-emerald-700">{{ simData.reduccionPlazo.newInstallments }}</span>
                  <span class="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    -{{ simData.reduccionPlazo.installmentsSaved }}
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Cuota mensual</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatCurrency(simData.debt.monthlyPayment) }} (sin cambio)</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Nueva fecha fin</span>
                <span class="text-sm font-semibold text-emerald-700">{{ formatDate(simData.reduccionPlazo.completionDate) }}</span>
              </div>
              <div class="rounded-xl bg-emerald-50 p-3">
                <p class="text-xs text-emerald-700">Interés total restante</p>
                <div class="mt-1 flex items-baseline gap-2">
                  <span class="text-xs text-gray-400 line-through">{{ formatCurrency(simData.reduccionPlazo.totalInterestNow) }}</span>
                  <span class="text-base font-bold text-emerald-800">{{ formatCurrency(simData.reduccionPlazo.totalInterestAfter) }}</span>
                </div>
                <p class="mt-1 text-sm font-bold text-emerald-700">
                  Ahorras {{ formatCurrency(simData.reduccionPlazo.interestSaved) }} en intereses
                </p>
              </div>
            </div>
          </div>

          <!-- Reducción de cuota -->
          <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div class="bg-blue-600 px-4 py-3 text-white">
              <p class="text-[11px] font-bold uppercase tracking-widest text-blue-100">Opción B</p>
              <p class="text-base font-bold">Reducción de Cuota</p>
              <p class="text-xs text-blue-100">Mismo plazo · menor cuota mensual</p>
            </div>
            <div class="space-y-3 p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Cuotas restantes</span>
                <span class="text-sm font-semibold text-gray-700">{{ simData.reduccionCuota.remainingInstallments }} (sin cambio)</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Nueva cuota mensual</span>
                <div class="text-right">
                  <span class="text-sm text-gray-400 line-through">{{ formatCurrency(simData.debt.monthlyPayment) }}</span>
                  <span class="ml-2 text-base font-bold text-blue-700">{{ formatCurrency(simData.reduccionCuota.newMonthlyPayment) }}</span>
                  <span class="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                    -{{ formatCurrency(simData.reduccionCuota.monthlySavings) }}/mes
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">Fecha fin</span>
                <span class="text-sm font-semibold text-gray-700">{{ formatDate(simData.reduccionCuota.completionDate) }} (sin cambio)</span>
              </div>
              <div class="rounded-xl bg-blue-50 p-3">
                <p class="text-xs text-blue-700">Interés total restante</p>
                <div class="mt-1 flex items-baseline gap-2">
                  <span class="text-xs text-gray-400 line-through">{{ formatCurrency(simData.reduccionCuota.totalInterestNow) }}</span>
                  <span class="text-base font-bold text-blue-800">{{ formatCurrency(simData.reduccionCuota.totalInterestAfter) }}</span>
                </div>
                <p class="mt-1 text-sm font-bold text-blue-700">
                  Ahorras {{ formatCurrency(simData.reduccionCuota.interestSaved) }} en intereses
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendation -->
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-amber-700">Recomendación</p>
          <p class="mt-1 text-sm text-amber-800">
            <template v-if="simData.reduccionPlazo.interestSaved >= simData.reduccionCuota.interestSaved">
              <strong>Elige Reducción de Plazo (Opción A)</strong> si tu banco lo permite.
              Ahorras <strong>{{ formatCurrency(simData.reduccionPlazo.interestSaved - simData.reduccionCuota.interestSaved) }} más</strong>
              en intereses que la opción B y terminas {{ simData.reduccionPlazo.installmentsSaved }} cuotas antes.
            </template>
            <template v-else>
              <strong>Elige Reducción de Cuota (Opción B)</strong> si necesitas aliviar tu flujo mensual.
              Reduces tu cuota en <strong>{{ formatCurrency(simData.reduccionCuota.monthlySavings) }}/mes</strong>.
            </template>
            En Perú indica al banco: <em>"Pago extraordinario con reducción de plazo"</em> o
            <em>"reducción de cuota"</em> según tu elección.
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!simLoading" class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <svg class="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="mt-4 text-sm font-medium text-gray-600">Selecciona una deuda e ingresa el monto a pagar de más</p>
        <p class="mt-1 text-xs text-gray-400">El simulador te mostrará cuánto ahorras según cada estrategia</p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         TAB: AMORTIZACIÓN
    ══════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'amortizacion'" class="space-y-5">

      <!-- Controls -->
      <div class="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div class="flex-1 min-w-48">
          <label class="mb-1 block text-xs font-medium text-gray-600">Selecciona la deuda</label>
          <select
            v-model="selectedAmortDebtId"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option :value="null" disabled>— Elige una deuda —</option>
            <option v-for="d in (debts ?? [])" :key="d.id" :value="d.id">
              {{ d.name }} {{ d.isPaid ? '✓' : '' }}
            </option>
          </select>
        </div>
        <label v-if="amortData" class="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input v-model="showPaidRows" type="checkbox" class="rounded" />
          Mostrar cuotas pagadas
        </label>
      </div>

      <!-- Loading -->
      <div v-if="amortLoading" class="flex justify-center py-16">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>

      <template v-else-if="amortData">
        <!-- Summary cards -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p class="text-xs text-gray-500">Cuotas pagadas</p>
            <p class="mt-1 text-xl font-bold text-emerald-700">{{ amortData.summary.paidCount }}</p>
            <p class="text-xs text-gray-400">de {{ amortData.rows.length }}</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p class="text-xs text-gray-500">Capital pagado</p>
            <p class="mt-1 text-xl font-bold text-emerald-700">{{ formatCurrency(amortData.summary.totalPrincipalPaid) }}</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p class="text-xs text-gray-500">Interés pagado</p>
            <p class="mt-1 text-xl font-bold text-orange-600">{{ formatCurrency(amortData.summary.totalInterestPaid) }}</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p class="text-xs text-gray-500">Saldo pendiente</p>
            <p class="mt-1 text-xl font-bold text-red-600">{{ formatCurrency(amortData.debt.remainingAmount) }}</p>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div class="border-b border-gray-50 px-4 py-3">
            <p class="text-sm font-semibold text-gray-700">{{ amortData.debt.name }} · {{ amortData.debt.creditor }}</p>
            <p class="text-xs text-gray-400">TEA {{ amortData.debt.interestRate }}% · {{ amortData.rows.length }} cuotas totales</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50 text-left">
                  <th class="px-3 py-2.5 font-semibold text-gray-500">#</th>
                  <th class="px-3 py-2.5 font-semibold text-gray-500">Vencimiento</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Capital</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Interés</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Seguro</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Cuota</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Cap. Acum.</th>
                  <th class="px-3 py-2.5 text-right font-semibold text-gray-500">Saldo</th>
                  <th class="px-3 py-2.5 text-center font-semibold text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="row in amortRows"
                  :key="row.installmentNumber"
                  class="transition-colors hover:bg-gray-50"
                  :class="rowBg(row.status)"
                >
                  <td class="px-3 py-2 font-medium text-gray-600">{{ row.installmentNumber }}</td>
                  <td class="px-3 py-2 text-gray-600">{{ formatDate(row.dueDate) }}</td>
                  <td class="px-3 py-2 text-right font-medium text-emerald-700">{{ formatCurrency(row.principal) }}</td>
                  <td class="px-3 py-2 text-right text-orange-600">{{ formatCurrency(row.interest) }}</td>
                  <td class="px-3 py-2 text-right text-purple-600">{{ formatCurrency(row.insurance) }}</td>
                  <td class="px-3 py-2 text-right font-semibold text-gray-800">{{ formatCurrency(row.amount) }}</td>
                  <td class="px-3 py-2 text-right text-gray-500">{{ formatCurrency(row.cumulativePrincipal) }}</td>
                  <td class="px-3 py-2 text-right font-semibold" :class="row.remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'">
                    {{ formatCurrency(row.remainingBalance) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="statusConfig[row.status as keyof typeof statusConfig]?.cls ?? 'bg-gray-100 text-gray-600'">
                      {{ statusConfig[row.status as keyof typeof statusConfig]?.label ?? row.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <!-- Footer totals -->
              <tfoot>
                <tr class="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colspan="2" class="px-3 py-2.5 text-xs text-gray-600">TOTALES</td>
                  <td class="px-3 py-2.5 text-right text-xs text-emerald-700">
                    {{ formatCurrency(amortData.rows.reduce((s, r) => s + r.principal, 0)) }}
                  </td>
                  <td class="px-3 py-2.5 text-right text-xs text-orange-600">
                    {{ formatCurrency(amortData.rows.reduce((s, r) => s + r.interest, 0)) }}
                  </td>
                  <td class="px-3 py-2.5 text-right text-xs text-purple-600">
                    {{ formatCurrency(amortData.rows.reduce((s, r) => s + r.insurance, 0)) }}
                  </td>
                  <td class="px-3 py-2.5 text-right text-xs text-gray-800">
                    {{ formatCurrency(amortData.rows.reduce((s, r) => s + r.amount, 0)) }}
                  </td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <svg class="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="mt-4 text-sm font-medium text-gray-600">Selecciona una deuda para ver su tabla de amortización</p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         TAB: FORECAST
    ══════════════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'forecast'" class="space-y-5">

      <!-- Controls + summary -->
      <div class="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-lg">
        <!-- Month selector -->
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-300">Proyección de flujo de caja</p>
            <p class="mt-0.5 text-xl font-bold">Próximos {{ forecastMonths }} meses</p>
          </div>
          <div class="flex gap-1.5 rounded-xl bg-white/10 p-1">
            <button
              v-for="m in [6, 12, 24]"
              :key="m"
              @click="forecastMonths = m"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition"
              :class="forecastMonths === m ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white'"
            >
              {{ m }}M
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="forecastLoading" class="flex justify-center py-4">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
        </div>

        <!-- Summary stats -->
        <div v-else-if="forecast" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-white/10 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Balance actual</p>
            <p class="mt-0.5 text-lg font-bold" :class="(forecast.currentBalance ?? 0) >= 0 ? 'text-white' : 'text-red-300'">
              {{ formatCurrency(forecast.currentBalance ?? 0) }}
            </p>
          </div>
          <div class="rounded-xl bg-white/10 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Ingresos proyectados</p>
            <p class="mt-0.5 text-lg font-bold text-emerald-300">{{ formatCurrency(forecastTotalIncome) }}</p>
          </div>
          <div class="rounded-xl bg-white/10 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Pagos deudas</p>
            <p class="mt-0.5 text-lg font-bold text-rose-300">{{ formatCurrency(forecastTotalDebt) }}</p>
          </div>
          <div class="rounded-xl bg-white/10 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">Flujo neto</p>
            <p class="mt-0.5 text-lg font-bold" :class="forecastNet >= 0 ? 'text-emerald-300' : 'text-red-300'">
              {{ forecastNet >= 0 ? '+' : '' }}{{ formatCurrency(forecastNet) }}
            </p>
          </div>
        </div>
      </div>

      <template v-if="forecast && !forecastLoading">

        <!-- Month cards grid -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="m in forecast.months"
            :key="m.yearMonth"
            class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md"
            :class="[
              m.runningBalance < 0 ? 'ring-red-200' : 'ring-gray-100',
              m.isCurrentMonth ? 'ring-2 ring-indigo-300' : '',
            ]"
          >
            <!-- Month header -->
            <div
              class="flex items-center justify-between px-4 py-2.5"
              :class="m.isCurrentMonth ? 'bg-indigo-600 text-white' : m.runningBalance < 0 ? 'bg-red-50' : 'bg-gray-50'"
            >
              <div>
                <p class="text-xs font-bold" :class="m.isCurrentMonth ? 'text-indigo-100' : 'text-gray-500'">
                  {{ m.isCurrentMonth ? 'Mes actual' : m.yearMonth }}
                </p>
                <p class="text-sm font-bold" :class="m.isCurrentMonth ? 'text-white' : 'text-gray-800'">
                  {{ m.fullLabel }}
                </p>
              </div>
              <div
                class="rounded-full px-2 py-1 text-xs font-bold"
                :class="m.netBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
              >
                {{ m.netBalance >= 0 ? '+' : '' }}{{ formatCurrency(m.netBalance) }}
              </div>
            </div>

            <!-- Month body -->
            <div class="space-y-1.5 px-4 py-3 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">Ingresos</span>
                <span class="font-semibold text-emerald-700">+{{ formatCurrency(m.income) }}</span>
              </div>
              <div v-if="m.debtPayments > 0" class="flex justify-between">
                <span class="text-gray-500">Cuotas deudas</span>
                <span class="font-semibold text-red-600">-{{ formatCurrency(m.debtPayments) }}</span>
              </div>
              <div v-if="m.recurringExpenses > 0" class="flex justify-between">
                <span class="text-gray-500">Gastos fijos</span>
                <span class="font-semibold text-orange-600">-{{ formatCurrency(m.recurringExpenses) }}</span>
              </div>
              <div v-if="m.cardEstimate > 0" class="flex justify-between">
                <span class="text-gray-500">Tarjetas (est.)</span>
                <span class="font-semibold text-purple-600">-{{ formatCurrency(m.cardEstimate) }}</span>
              </div>
              <div class="border-t border-gray-100 pt-1.5 flex justify-between font-semibold">
                <span class="text-gray-600">Saldo final est.</span>
                <span :class="m.runningBalance >= 0 ? 'text-gray-800' : 'text-red-600 font-bold'">
                  {{ formatCurrency(m.runningBalance) }}
                </span>
              </div>

              <!-- Debts completing -->
              <div
                v-for="debtName in m.debtsCompletingThisMonth"
                :key="debtName"
                class="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1"
              >
                <svg class="h-3 w-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-[10px] font-semibold text-emerald-700">Se libera: {{ debtName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Debts freedom table -->
        <div v-if="forecast.debtsFreed.length > 0" class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div class="border-b border-gray-50 px-4 py-3">
            <p class="text-sm font-semibold text-gray-700">Deudas que terminan en el período</p>
            <p class="text-xs text-gray-400">Cada deuda pagada libera ese monto para ahorro o inversión</p>
          </div>
          <div class="divide-y divide-gray-50">
            <div
              v-for="freed in forecast.debtsFreed"
              :key="freed.name"
              class="flex items-center gap-4 px-4 py-3"
            >
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <svg class="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-800">{{ freed.name }}</p>
                <p class="text-xs text-gray-500">Último pago: {{ freed.yearMonth }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-emerald-700">+{{ formatCurrency(freed.monthlyRelief) }}/mes</p>
                <p class="text-xs text-gray-400">alivio mensual</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Note -->
        <p class="text-xs text-gray-400 text-center">
          * El forecast usa ingresos y gastos recurrentes registrados. Las tarjetas de crédito se estiman con el promedio de los últimos 3 meses. Los montos reales pueden variar.
        </p>
      </template>
    </div>

  </div>
</template>
