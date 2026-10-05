<script setup lang="ts">
import type { Category } from '#types/categoria'
import type { ExpensesByCategory, MonthlySummary, ReportBasis } from '#types/reporte'

definePageMeta({ layout: 'default' })

const toast = useToast()
const $authFetch = useAuthFetch()

type ReportTab = 'resumen' | 'categorias'
const tabs: { id: ReportTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen mensual' },
  { id: 'categorias', label: 'Gastos por categoría' },
]
const activeTab = ref<ReportTab>('resumen')

// ── Filtros comunes ────────────────────────────────────────────────────────────
const dateRange = useDateRangeFilter()
dateRange.applyPreset('last-6-months')

const basis = ref<ReportBasis>('consumo')
const basisOptions: { val: ReportBasis; label: string; hint: string }[] = [
  {
    val: 'consumo',
    label: 'Consumo',
    hint: 'Cuenta lo que gastaste (incluye compras con tarjeta de crédito, sin contar el pago de la tarjeta).',
  },
  {
    val: 'caja',
    label: 'Caja',
    hint: 'Cuenta lo que salió de tu cuenta (excluye compras con crédito, incluye el pago de la tarjeta).',
  },
]

const categoryIds = ref<(number | string)[]>([])
const categories = ref<Category[]>([])
const categoryOptions = computed(() =>
  categories.value
    .filter((c) => c.type === 'expense')
    .map((c) => ({ value: c.id, label: c.name, icon: c.icon }))
)

// ── Datos ──────────────────────────────────────────────────────────────────────
const summary = ref<MonthlySummary | null>(null)
const byCategory = ref<ExpensesByCategory | null>(null)
const loading = ref(false)
// Evita que una respuesta lenta pise a una más reciente al cambiar filtros rápido
let requestId = 0

const load = async () => {
  const id = ++requestId
  loading.value = true
  const query: Record<string, string> = { basis: basis.value }
  if (dateRange.from.value) query.from = dateRange.from.value
  if (dateRange.to.value) query.to = dateRange.to.value

  try {
    if (activeTab.value === 'resumen') {
      const res = await $authFetch<MonthlySummary>('/api/reports/monthly-summary', { query })
      if (id === requestId) summary.value = res
    } else {
      if (categoryIds.value.length) query.categoryIds = categoryIds.value.join(',')
      const res = await $authFetch<ExpensesByCategory>('/api/reports/expenses-by-category', {
        query,
      })
      if (id === requestId) byCategory.value = res
    }
  } catch (err) {
    if (id === requestId) toast.error(getErrorMessage(err, 'Error al cargar el reporte'))
  } finally {
    if (id === requestId) loading.value = false
  }
}

onMounted(async () => {
  // Los reportes se piden solo en el cliente (el SSR no lleva la cookie en $authFetch)
  load()
  try {
    categories.value = await $authFetch<Category[]>('/api/categories')
  } catch {
    // el filtro de categorías simplemente queda vacío
  }
})

watch([activeTab, basis, () => dateRange.from.value, () => dateRange.to.value, categoryIds], load)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <div>
      <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Reportes</h1>
      <p class="text-sm text-gray-500">Analiza tus ingresos y gastos por período</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === t.id"
        @click="activeTab = t.id"
        class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === t.id
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Filtros -->
    <div class="space-y-3">
      <UiDateRangeFilter
        v-model:preset="dateRange.preset.value"
        v-model:from="dateRange.from.value"
        v-model:to="dateRange.to.value"
        :presets="reportPresets"
        @select-preset="dateRange.applyPreset"
        @edit-dates="dateRange.setCustom"
      />
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500">Base:</span>
          <div class="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              v-for="b in basisOptions"
              :key="b.val"
              type="button"
              :title="b.hint"
              @click="basis = b.val"
              class="rounded-lg px-3 py-1 text-xs font-medium transition-colors sm:text-sm"
              :class="
                basis === b.val
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              "
            >
              {{ b.label }}
            </button>
          </div>
        </div>
        <UiMultiSelect
          v-if="activeTab === 'categorias'"
          v-model="categoryIds"
          :options="categoryOptions"
          placeholder="Todas las categorías"
          class="w-full sm:w-56"
        />
      </div>
      <p class="text-xs text-gray-400">
        {{ basisOptions.find((b) => b.val === basis)?.hint }}
      </p>
    </div>

    <!-- Contenido -->
    <div
      v-if="loading && !(activeTab === 'resumen' ? summary : byCategory)"
      class="flex items-center justify-center py-16"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent"
      ></div>
    </div>
    <div v-else class="transition-opacity" :class="loading ? 'opacity-60' : ''">
      <ReportesMonthlySummaryReport v-if="activeTab === 'resumen' && summary" :data="summary" />
      <ReportesExpensesByCategoryReport
        v-else-if="activeTab === 'categorias' && byCategory"
        :data="byCategory"
      />
    </div>
  </div>
</template>
