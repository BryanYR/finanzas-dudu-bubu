<script setup lang="ts">
import type { ExpensesByCategory } from '#types/reporte'

const props = defineProps<{ data: ExpensesByCategory }>()

const { formatCurrency, formatDate } = useDateFormatter()

const FALLBACK_COLOR = '#9ca3af'
const maxTotal = computed(() => Math.max(...props.data.categories.map((c) => c.total), 1))

const changeLabel = (change: number | null) => {
  if (change == null) return 'nuevo'
  if (change === 0) return '0 %'
  return `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)} %`
}

const exportCsv = () =>
  downloadCsv(
    `gastos-por-categoria_${props.data.from}_${props.data.to}.csv`,
    ['Categoría', 'Total', '% del total', 'Cantidad', 'Período anterior', 'Variación %'],
    props.data.categories.map((c) => [
      c.name,
      c.total,
      c.percentage,
      c.count,
      c.previousTotal,
      c.change,
    ])
  )
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Total gastado</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ formatCurrency(data.total) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ data.categories.length }} categorías</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Período anterior</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ formatCurrency(data.previous.total) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ formatDate(data.previous.from, 'DD/MM/YY') }} –
          {{ formatDate(data.previous.to, 'DD/MM/YY') }}
        </p>
      </div>
      <div class="col-span-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 lg:col-span-1">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Variación</p>
        <p class="mt-1.5 text-lg font-bold text-gray-900 lg:text-xl">
          {{ changeLabel(data.change) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">vs. período anterior de igual duración</p>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:px-5">
        <h3 class="text-sm font-semibold text-gray-800">Ranking de categorías</h3>
        <button
          type="button"
          @click="exportCsv"
          class="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>

      <p v-if="!data.categories.length" class="py-12 text-center text-sm text-gray-400">
        No hay gastos en este período.
      </p>

      <ul v-else class="divide-y divide-gray-50">
        <li v-for="c in data.categories" :key="c.categoryId" class="px-4 py-3 lg:px-5">
          <div class="flex items-center justify-between gap-3 text-sm">
            <p class="min-w-0 truncate font-medium text-gray-800">
              <span class="mr-1">{{ c.icon }}</span
              >{{ c.name }}
              <span class="ml-1 text-xs font-normal text-gray-400">{{ c.count }}x</span>
            </p>
            <p class="shrink-0 tabular-nums">
              <span class="font-semibold text-gray-900">{{ formatCurrency(c.total) }}</span>
              <span class="ml-2 text-xs text-gray-500">{{ c.percentage.toFixed(1) }} %</span>
            </p>
          </div>
          <div class="mt-1.5 flex items-center gap-3">
            <div
              class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
              role="img"
              :aria-label="`${c.name}: ${c.percentage.toFixed(1)} % del total`"
            >
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${(c.total / maxTotal) * 100}%`,
                  backgroundColor: c.color ?? FALLBACK_COLOR,
                }"
              />
            </div>
            <span
              class="w-16 shrink-0 text-right text-xs tabular-nums text-gray-500"
              :title="`Período anterior: ${formatCurrency(c.previousTotal)}`"
            >
              {{ changeLabel(c.change) }}
            </span>
          </div>
        </li>
      </ul>
    </div>
    <p class="text-xs text-gray-400">
      La variación compara contra el período anterior de igual duración; "nuevo" = la categoría no
      tuvo gastos en ese período.
    </p>
  </div>
</template>
