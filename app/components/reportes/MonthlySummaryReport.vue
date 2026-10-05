<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import type { MonthlySummary } from '#types/reporte'

const props = defineProps<{ data: MonthlySummary }>()

const { formatCurrency } = useDateFormatter()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

// Colores categóricos fijos (slots 1 y 2 de la paleta validada): ingresos = azul, gastos = naranja
const INCOME_COLOR = '#2a78d6'
const EXPENSE_COLOR = '#eb6834'
const INK_MUTED = '#6b7280'
const GRID = '#e5e7eb'

const monthLabel = (ym: string) => dayjs(`${ym}-01`).format('MMM YY')
const percent = (rate: number | null) => (rate == null ? '—' : `${(rate * 100).toFixed(0)} %`)

const hasData = computed(() => props.data.months.some((m) => m.income || m.expenses))

const chartConfig = computed<ChartConfiguration>(() => ({
  type: 'bar',
  data: {
    labels: props.data.months.map((m) => monthLabel(m.month) + (m.isPartial ? '*' : '')),
    datasets: [
      {
        label: 'Ingresos',
        data: props.data.months.map((m) => m.income),
        backgroundColor: INCOME_COLOR,
        borderRadius: { topLeft: 4, topRight: 4 },
        maxBarThickness: 28,
      },
      {
        label: 'Gastos',
        data: props.data.months.map((m) => m.expenses),
        backgroundColor: EXPENSE_COLOR,
        borderRadius: { topLeft: 4, topRight: 4 },
        maxBarThickness: 28,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
          afterBody: (items) => {
            const m = props.data.months[items[0]?.dataIndex ?? 0]
            return m ? [`Neto: ${formatCurrency(m.net)}`] : []
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: INK_MUTED } },
      y: {
        beginAtZero: true,
        grid: { color: GRID },
        border: { display: false },
        ticks: { color: INK_MUTED, callback: (v) => `S/ ${Number(v).toLocaleString('es-PE')}` },
      },
    },
  },
}))

const exportCsv = () =>
  downloadCsv(
    `resumen-mensual_${props.data.from}_${props.data.to}.csv`,
    [
      'Mes',
      'Ingresos',
      'Gastos fijos',
      'Gastos variables',
      'Gastos',
      'Pagos de deuda',
      'Neto',
      'Tasa de ahorro',
    ],
    props.data.months.map((m) => [
      m.month,
      m.income,
      m.fixedExpenses,
      m.variableExpenses,
      m.expenses,
      m.debtPayments,
      m.net,
      m.savingsRate == null ? '' : Math.round(m.savingsRate * 1000) / 10,
    ])
  )
</script>

<template>
  <div class="space-y-5">
    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Ingresos</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ formatCurrency(data.totals.income) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          prom. {{ formatCurrency(data.monthlyAverage.income) }}/mes
        </p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Gastos</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ formatCurrency(data.totals.expenses) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          prom. {{ formatCurrency(data.monthlyAverage.expenses) }}/mes
        </p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Pagos de deuda</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ formatCurrency(data.totals.debtPayments) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">cuotas pagadas en el período</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Ahorro neto</p>
        <p
          class="mt-1.5 text-lg font-bold lg:text-xl"
          :class="data.totals.net < 0 ? 'text-red-600' : 'text-gray-900'"
        >
          {{ data.totals.net < 0 ? '−' : '' }}{{ formatCurrency(Math.abs(data.totals.net)) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ percent(data.totals.savingsRate) }} de los ingresos
        </p>
      </div>
    </div>

    <!-- Gráfico -->
    <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 lg:p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-800">Ingresos vs gastos por mes</h3>
        <ul class="flex items-center gap-4 text-xs text-gray-600">
          <li class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: INCOME_COLOR }" />
            Ingresos
          </li>
          <li class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: EXPENSE_COLOR }" />
            Gastos
          </li>
        </ul>
      </div>
      <UiBaseChart v-if="hasData" :config="chartConfig" :height="280" />
      <p v-else class="py-12 text-center text-sm text-gray-400">
        No hay movimientos en este período.
      </p>
    </div>

    <!-- Tabla (vista alternativa del gráfico) -->
    <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:px-5">
        <h3 class="text-sm font-semibold text-gray-800">Detalle por mes</h3>
        <button
          type="button"
          @click="exportCsv"
          class="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th class="px-4 py-2 text-left font-medium lg:px-5">Mes</th>
              <th class="px-3 py-2 text-right font-medium">Ingresos</th>
              <th class="px-3 py-2 text-right font-medium">Fijos</th>
              <th class="px-3 py-2 text-right font-medium">Variables</th>
              <th class="px-3 py-2 text-right font-medium">Deuda</th>
              <th class="px-3 py-2 text-right font-medium">Neto</th>
              <th class="px-4 py-2 text-right font-medium lg:px-5">Ahorro</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-gray-700">
            <tr v-for="m in data.months" :key="m.month">
              <td class="px-4 py-2.5 font-medium capitalize text-gray-800 lg:px-5">
                {{ dayjs(`${m.month}-01`).format('MMMM YYYY') }}
                <span v-if="m.isPartial" class="ml-1 text-xs font-normal normal-case text-gray-400"
                  >(en curso)</span
                >
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">{{ formatCurrency(m.income) }}</td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ formatCurrency(m.fixedExpenses) }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ formatCurrency(m.variableExpenses) }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums">
                {{ formatCurrency(m.debtPayments) }}
              </td>
              <td
                class="px-3 py-2.5 text-right font-semibold tabular-nums"
                :class="m.net < 0 ? 'text-red-600' : ''"
              >
                {{ m.net < 0 ? '−' : '' }}{{ formatCurrency(Math.abs(m.net)) }}
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums lg:px-5">
                {{ percent(m.savingsRate) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-xs text-gray-400">
      * Mes en curso: solo cuenta hasta hoy. Los gastos fijos son los recurrentes, repetidos cada
      mes desde su fecha de inicio (sin los meses omitidos).
    </p>
  </div>
</template>
