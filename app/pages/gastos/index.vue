<script setup lang="ts">
import type { Expense } from '#types/gasto'
import type { Category } from '#types/categoria'
import type { CreditCard } from '#types/tarjeta'

definePageMeta({ layout: 'default' })

const toast = useToast()
const { confirm } = useConfirm()
const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

const expenses = ref<Expense[]>([])
const categories = ref<Category[]>([])
const creditCards = ref<CreditCard[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingExpense = ref<Expense | null>(null)
const showSkipModal = ref(false)
const skipExpense = ref<Expense | null>(null)
const filterType = ref('all')
const searchQuery = ref('')

// Filtros avanzados (se combinan con los pills de tipo/método y la búsqueda)
const dateRange = useDateRangeFilter()
const showAdvanced = ref(false)
const categoryIds = ref<(number | string)[]>([])
const cardFilter = ref<'all' | 'none' | number>('all')
const installmentsFilter = ref<'all' | 'installments' | 'single'>('all')
const paidFilter = ref<'all' | 'pending' | 'paid'>('all')
const frequencyFilter = ref('all')
// v-model.number deja '' al vaciar el input; solo cuentan los valores numéricos
const minAmount = ref<number | '' | null>(null)
const maxAmount = ref<number | '' | null>(null)
const isNum = (v: number | '' | null): v is number => typeof v === 'number' && !Number.isNaN(v)
const sortBy = ref<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category'>(
  'date-desc'
)

const fetchAll = async () => {
  loading.value = true
  try {
    const [exp, cats, cards] = await Promise.all([
      $authFetch<Expense[]>('/api/expenses'),
      $authFetch<Category[]>('/api/categories'),
      $authFetch<CreditCard[]>('/api/credit-cards'),
    ])
    expenses.value = exp
    categories.value = cats
    creditCards.value = cards
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al cargar los datos'))
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchAll())

// Todo menos los pills de tipo/método: alimenta las tarjetas de resumen para que
// "Efectivo" y "Crédito" respondan al rango de fechas, categoría, etc.
const scopedExpenses = computed(() => {
  let list = expenses.value.filter((e) => dateRange.matches(e.date))

  if (categoryIds.value.length) list = list.filter((e) => categoryIds.value.includes(e.categoryId))
  if (cardFilter.value === 'none') list = list.filter((e) => !e.creditCardId)
  else if (cardFilter.value !== 'all')
    list = list.filter((e) => e.creditCardId === cardFilter.value)
  if (installmentsFilter.value === 'installments')
    list = list.filter((e) => (e.installments ?? 0) > 1)
  else if (installmentsFilter.value === 'single')
    list = list.filter((e) => !e.installments || e.installments <= 1)
  if (paidFilter.value !== 'all')
    list = list.filter(
      (e) => e.paymentMethod === 'credit' && !!e.isPaidOff === (paidFilter.value === 'paid')
    )
  if (frequencyFilter.value !== 'all')
    list = list.filter((e) => e.frequency === frequencyFilter.value)
  const min = minAmount.value
  const max = maxAmount.value
  if (isNum(min)) list = list.filter((e) => e.amount >= min)
  if (isNum(max)) list = list.filter((e) => e.amount <= max)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (e) => e.description.toLowerCase().includes(q) || e.category?.name.toLowerCase().includes(q)
    )
  }
  return list
})

const activeFilterCount = computed(
  () =>
    (dateRange.isActive.value ? 1 : 0) +
    (categoryIds.value.length ? 1 : 0) +
    (cardFilter.value !== 'all' ? 1 : 0) +
    (installmentsFilter.value !== 'all' ? 1 : 0) +
    (paidFilter.value !== 'all' ? 1 : 0) +
    (frequencyFilter.value !== 'all' ? 1 : 0) +
    (isNum(minAmount.value) || isNum(maxAmount.value) ? 1 : 0)
)

const clearFilters = () => {
  dateRange.applyPreset('all')
  categoryIds.value = []
  cardFilter.value = 'all'
  installmentsFilter.value = 'all'
  paidFilter.value = 'all'
  frequencyFilter.value = 'all'
  minAmount.value = null
  maxAmount.value = null
  filterType.value = 'all'
  searchQuery.value = ''
}

const hasAnyFilter = computed(
  () => activeFilterCount.value > 0 || filterType.value !== 'all' || !!searchQuery.value.trim()
)

const categoryOptions = computed(() =>
  categories.value
    .filter((c) => c.type === 'expense')
    .map((c) => ({ value: c.id, label: c.name, icon: c.icon }))
)

const byMethod = computed(() =>
  scopedExpenses.value.reduce(
    (acc, e) => {
      acc[e.paymentMethod] = (acc[e.paymentMethod] || 0) + e.amount
      return acc
    },
    {} as Record<string, number>
  )
)

const currentMonth = dayjs().format('YYYY-MM')

const monthLabel = (ym: string) => dayjs(`${ym}-01`).format('MMM YYYY')

// Meses omitidos actuales o futuros (los pasados no se muestran)
const upcomingSkipped = (e: Expense) => (e.skippedMonths ?? []).filter((m) => m >= currentMonth)

const handleSkipMonths = (e: Expense) => {
  skipExpense.value = e
  showSkipModal.value = true
}

const recurringTotal = computed(() =>
  expenses.value
    .filter((e) => e.isRecurring && !e.skippedMonths?.includes(currentMonth))
    .reduce((s, e) => {
      if (e.frequency === 'weekly') return s + e.amount * 4
      if (e.frequency === 'biweekly') return s + e.amount * 2
      if (e.frequency === 'monthly') return s + e.amount
      if (e.frequency === 'annual') return s + e.amount / 12
      return s
    }, 0)
)

const filteredExpenses = computed(() => {
  let list = scopedExpenses.value
  if (filterType.value === 'recurring') list = list.filter((e) => e.isRecurring)
  else if (filterType.value === 'one-time') list = list.filter((e) => !e.isRecurring)
  else if (['cash', 'debit', 'credit'].includes(filterType.value))
    list = list.filter((e) => e.paymentMethod === filterType.value)

  // La API ya devuelve fecha desc; solo se reordena cuando se pide otro criterio
  if (sortBy.value === 'date-desc') return list
  const sorted = [...list]
  if (sortBy.value === 'date-asc') sorted.sort((a, b) => a.date.localeCompare(b.date))
  else if (sortBy.value === 'amount-desc') sorted.sort((a, b) => b.amount - a.amount)
  else if (sortBy.value === 'amount-asc') sorted.sort((a, b) => a.amount - b.amount)
  else sorted.sort((a, b) => (a.category?.name ?? '').localeCompare(b.category?.name ?? '', 'es'))
  return sorted
})

const totalFiltered = computed(() => filteredExpenses.value.reduce((s, e) => s + e.amount, 0))

const handleCreate = () => {
  editingExpense.value = null
  showModal.value = true
}
const handleEdit = (e: Expense) => {
  editingExpense.value = e
  showModal.value = true
}
const handleSave = async () => fetchAll()

const handleDelete = async (expense: Expense) => {
  const ok = await confirm({
    title: 'Eliminar gasto',
    message: `¿Seguro que deseas eliminar "${expense.description}" por ${formatCurrency(expense.amount)}?`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  try {
    await $authFetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
    await fetchAll()
    toast.success('Gasto eliminado')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al eliminar el gasto'))
  }
}

const methodConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  cash: {
    label: 'Efectivo',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  debit: { label: 'Débito', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  credit: { label: 'Crédito', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
}

const frequencyLabel: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  annual: 'Anual',
}

const mainFilters = [
  { val: 'all', label: 'Todos' },
  { val: 'recurring', label: 'Fijos' },
  { val: 'one-time', label: 'Variables' },
]

const methodFilters = [
  { val: 'cash', label: '💵 Efectivo' },
  { val: 'debit', label: '💳 Débito' },
  { val: 'credit', label: '💎 Crédito' },
]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Gastos</h1>
        <p class="text-sm text-gray-500">{{ expenses.length }} registros en total</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/gastos/rapido"
          class="flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-red-500 shadow-sm ring-1 ring-red-100 transition hover:bg-red-50 active:scale-95"
        >
          Rápido
        </NuxtLink>
        <button
          @click="handleCreate"
          class="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuevo
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
        <p class="mt-1.5 text-lg font-bold text-red-500 lg:text-xl">
          {{ formatCurrency(totalFiltered) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ filteredExpenses.length }} registros</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Fijos/mes</p>
        <p class="mt-1.5 text-lg font-bold text-orange-500 lg:text-xl">
          {{ formatCurrency(recurringTotal) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ expenses.filter((e) => e.isRecurring).length }} recurrentes
        </p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Efectivo</p>
        <p class="mt-1.5 text-lg font-bold text-emerald-600 lg:text-xl">
          {{ formatCurrency(byMethod.cash ?? 0) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">débito {{ formatCurrency(byMethod.debit ?? 0) }}</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Crédito</p>
        <p class="mt-1.5 text-lg font-bold text-purple-600 lg:text-xl">
          {{ formatCurrency(byMethod.credit ?? 0) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ expenses.filter((e) => e.paymentMethod === 'credit').length }} cargos
        </p>
      </div>
    </div>

    <!-- Filtros + Búsqueda -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="f in mainFilters"
          :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            filterType === f.val
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ f.label }}
        </button>
        <div class="w-px self-stretch bg-gray-200" />
        <button
          v-for="f in methodFilters"
          :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            filterType === f.val
              ? 'bg-gray-700 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ f.label }}
        </button>
      </div>
      <div class="relative flex-1">
        <svg
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar gasto o categoría..."
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
      </div>
    </div>

    <!-- Fechas + filtros avanzados -->
    <div class="space-y-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <UiDateRangeFilter
          v-model:preset="dateRange.preset.value"
          v-model:from="dateRange.from.value"
          v-model:to="dateRange.to.value"
          @select-preset="dateRange.applyPreset"
          @edit-dates="dateRange.setCustom"
        />
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 sm:text-sm"
          >
            Más filtros
            <span
              v-if="activeFilterCount"
              class="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white"
              >{{ activeFilterCount }}</span
            >
          </button>
          <button
            v-if="hasAnyFilter"
            type="button"
            @click="clearFilters"
            class="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline sm:text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div
        v-if="showAdvanced"
        class="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label class="block text-xs font-medium text-gray-500">
          Categoría
          <UiMultiSelect
            v-model="categoryIds"
            :options="categoryOptions"
            placeholder="Todas"
            class="mt-1"
          />
        </label>
        <label class="block text-xs font-medium text-gray-500">
          Tarjeta
          <select
            v-model="cardFilter"
            class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
          >
            <option value="all">Todas</option>
            <option value="none">Sin tarjeta</option>
            <option v-for="c in creditCards" :key="c.id" :value="c.id">
              {{ c.name }} ••••{{ c.lastDigits }}
            </option>
          </select>
        </label>
        <label class="block text-xs font-medium text-gray-500">
          Estado de pago (tarjeta)
          <select
            v-model="paidFilter"
            class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes de pago</option>
            <option value="paid">Ya pagados</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-gray-500">
          Cuotas
          <select
            v-model="installmentsFilter"
            class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
          >
            <option value="all">Todos</option>
            <option value="installments">En cuotas</option>
            <option value="single">Pago único</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-gray-500">
          Frecuencia
          <select
            v-model="frequencyFilter"
            class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
          >
            <option value="all">Todas</option>
            <option v-for="(label, val) in frequencyLabel" :key="val" :value="val">
              {{ label }}
            </option>
          </select>
        </label>
        <div class="block text-xs font-medium text-gray-500">
          Monto (S/)
          <div class="mt-1 flex items-center gap-2">
            <input
              v-model.number="minAmount"
              type="number"
              min="0"
              step="any"
              placeholder="Mín"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
            />
            <span class="text-gray-400">–</span>
            <input
              v-model.number="maxAmount"
              type="number"
              min="0"
              step="any"
              placeholder="Máx"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
            />
          </div>
        </div>
        <label class="block text-xs font-medium text-gray-500">
          Ordenar por
          <select
            v-model="sortBy"
            class="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-red-400"
          >
            <option value="date-desc">Fecha (recientes primero)</option>
            <option value="date-asc">Fecha (antiguos primero)</option>
            <option value="amount-desc">Monto (mayor a menor)</option>
            <option value="amount-asc">Monto (menor a mayor)</option>
            <option value="category">Categoría (A-Z)</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div
        class="h-8 w-8 animate-spin rounded-full border-[3px] border-red-500 border-t-transparent"
      ></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredExpenses.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <svg class="h-8 w-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-700">
        {{ hasAnyFilter ? 'Sin resultados' : 'No hay gastos aún' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ hasAnyFilter ? 'Prueba con otros filtros.' : 'Registra tu primer gasto.' }}
      </p>
      <button
        v-if="!hasAnyFilter"
        @click="handleCreate"
        class="mt-4 rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
      >
        Nuevo Gasto
      </button>
    </div>

    <!-- Lista de gastos -->
    <div v-else class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div class="divide-y divide-gray-50">
        <div
          v-for="expense in filteredExpenses"
          :key="expense.id"
          class="group flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-gray-50 sm:flex-nowrap sm:gap-4 lg:px-5"
        >
          <!-- Ícono de categoría -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm ring-1 ring-gray-100"
            :style="
              expense.category?.color
                ? `background-color: ${expense.category.color}20; color: ${expense.category.color}`
                : ''
            "
            :class="!expense.category?.color ? 'bg-red-50 text-red-500' : ''"
          >
            {{ expense.category?.icon || '💸' }}
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <p class="truncate text-sm font-semibold text-gray-800">{{ expense.description }}</p>
              <!-- Badge método de pago -->
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                :class="[
                  methodConfig[expense.paymentMethod]?.bg ?? 'bg-gray-100',
                  methodConfig[expense.paymentMethod]?.color ?? 'text-gray-600',
                ]"
              >
                {{ methodConfig[expense.paymentMethod]?.label ?? expense.paymentMethod }}
              </span>
              <!-- Badge recurrente -->
              <span
                v-if="expense.isRecurring"
                class="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600"
              >
                {{ frequencyLabel[expense.frequency ?? ''] ?? 'Fijo' }}
              </span>
              <!-- Badge mes omitido -->
              <span
                v-if="expense.isRecurring && upcomingSkipped(expense).length"
                class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700"
              >
                Omitido: {{ monthLabel(upcomingSkipped(expense)[0]!) }}
                <template v-if="upcomingSkipped(expense).length > 1"
                  >+{{ upcomingSkipped(expense).length - 1 }}</template
                >
              </span>
              <!-- Badge cuotas -->
              <span
                v-if="expense.installments && expense.installments > 1"
                class="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600"
              >
                {{ expense.installments }} cuotas
              </span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
              <span>{{ expense.category?.name ?? '—' }}</span>
              <span v-if="expense.creditCard"
                >· {{ expense.creditCard.name }} ••••{{ expense.creditCard.lastDigits }}</span
              >
              <span>· {{ formatDate(expense.date) }}</span>
            </div>
          </div>

          <!-- Monto -->
          <div class="shrink-0 text-right">
            <p class="whitespace-nowrap text-sm font-bold text-red-500 sm:text-base">
              - {{ formatCurrency(expense.amount) }}
            </p>
            <p
              v-if="expense.installments && expense.installments > 1"
              class="text-xs text-gray-400"
            >
              {{ formatCurrency(expense.amount / expense.installments) }}/cuota
            </p>
          </div>

          <!-- Acciones -->
          <div
            class="flex w-full shrink-0 justify-end gap-1 border-t border-gray-50 pt-2 transition-opacity sm:w-auto sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <button
              v-if="expense.isRecurring"
              @click="handleSkipMonths(expense)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600"
              title="Omitir mes"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 15h6"
                />
              </svg>
            </button>
            <button
              @click="handleEdit(expense)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
              title="Editar"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="handleDelete(expense)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Eliminar"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <GastosExpenseFormModal
      v-model:show="showModal"
      :expense="editingExpense"
      :categories="categories"
      :credit-cards="creditCards"
      @save="handleSave"
    />
    <GastosSkipMonthsModal v-model:show="showSkipModal" :expense="skipExpense" @save="fetchAll" />
  </div>
</template>
