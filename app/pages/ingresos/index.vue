<script setup lang="ts">
import type { Income } from '#types/ingreso'
import type { Category } from '#types/categoria'

definePageMeta({ layout: 'default' })

const toast = useToast()
const confirm = useConfirm()
const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()

const { data: incomes, pending, error, refresh } = await useFetchAuth<Income[]>('/api/incomes')
const { data: categories } = await useFetchAuth<Category[]>('/api/categories')

const showFormModal = ref(false)
const generatingRecurring = ref(false)
const deleting = ref(false)
const editingIncome = ref<Income | null>(null)
const filterType = ref<'all' | 'recurring' | 'one-time'>('all')
const searchQuery = ref('')

const filteredIncomes = computed(() => {
  let list = incomes.value ?? []
  if (filterType.value === 'recurring') list = list.filter((i) => i.isRecurring)
  if (filterType.value === 'one-time') list = list.filter((i) => !i.isRecurring)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (i) => i.description.toLowerCase().includes(q) || i.category?.name.toLowerCase().includes(q)
    )
  }
  return list
})

const totalIncomes = computed(() => filteredIncomes.value.reduce((s, i) => s + i.amount, 0))

const recurringMonthlyTotal = computed(() =>
  (incomes.value ?? [])
    .filter((i) => i.isRecurring)
    .reduce((s, i) => {
      if (i.frequency === 'monthly') return s + i.amount
      if (i.frequency === 'biweekly') return s + i.amount * 2
      if (i.frequency === 'weekly') return s + i.amount * 4
      if (i.frequency === 'annual') return s + i.amount / 12
      return s
    }, 0)
)

const recurringCount = computed(() => (incomes.value ?? []).filter((i) => i.isRecurring).length)

const openCreateModal = () => {
  editingIncome.value = null
  showFormModal.value = true
}
const openEditModal = (income: Income) => {
  editingIncome.value = income
  showFormModal.value = true
}
const handleSave = async () => refresh()

const deleteIncome = async (income: Income) => {
  const ok = await confirm.confirm({
    title: 'Eliminar ingreso',
    message: `¿Seguro que deseas eliminar "${income.description}" por ${formatCurrency(income.amount)}?`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await $authFetch(`/api/incomes/${income.id}`, { method: 'DELETE' })
    await refresh()
  } catch {
    toast.error('Error al eliminar el ingreso')
  } finally {
    deleting.value = false
  }
}

const generateRecurring = async () => {
  generatingRecurring.value = true
  try {
    const result = await $authFetch<{ generated: any[]; skipped: any[] }>(
      '/api/incomes/generate-recurring',
      { method: 'POST' }
    )
    await refresh()
    if (result.generated.length > 0)
      toast.success(`Se generaron ${result.generated.length} ingresos recurrentes`)
    else toast.info('No hay ingresos pendientes por generar este mes')
  } catch {
    toast.error('Error al generar ingresos recurrentes')
  } finally {
    generatingRecurring.value = false
  }
}

const frequencyLabel: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  annual: 'Anual',
}

const filters = [
  { val: 'all', label: 'Todos' },
  { val: 'recurring', label: 'Recurrentes' },
  { val: 'one-time', label: 'Únicos' },
] as const
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Ingresos</h1>
        <p class="text-sm text-gray-500">{{ (incomes ?? []).length }} registros en total</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          @click="generateRecurring"
          :disabled="generatingRecurring"
          class="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          title="Generar recurrentes del mes"
        >
          <svg
            class="h-4 w-4"
            :class="generatingRecurring ? 'animate-spin' : ''"
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
          <span class="hidden sm:inline">Recurrentes</span>
        </button>
        <button
          @click="openCreateModal"
          class="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
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
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
        <p class="mt-1.5 text-lg font-bold text-emerald-600 lg:text-xl">
          {{ formatCurrency(totalIncomes) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ filteredIncomes.length }} registros</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Fijos/mes</p>
        <p class="mt-1.5 text-lg font-bold text-blue-600 lg:text-xl">
          {{ formatCurrency(recurringMonthlyTotal) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">{{ recurringCount }} recurrentes</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Únicos</p>
        <p class="mt-1.5 text-lg font-bold text-indigo-600 lg:text-xl">
          {{ formatCurrency(totalIncomes - recurringMonthlyTotal) }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">
          {{ (incomes ?? []).filter((i) => !i.isRecurring).length }} registros
        </p>
      </div>
    </div>

    <!-- Filters + Search -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <!-- Filter pills -->
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            filterType === f.val
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ f.label }}
        </button>
      </div>
      <!-- Search -->
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
          placeholder="Buscar ingreso o categoría..."
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-16">
      <div
        class="border-3 h-8 w-8 animate-spin rounded-full border-emerald-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      Error al cargar los ingresos: {{ error.message }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredIncomes.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
        <svg class="h-8 w-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-700">
        {{ searchQuery ? 'Sin resultados' : 'No hay ingresos aún' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ searchQuery ? 'Prueba con otro término de búsqueda.' : 'Registra tu primer ingreso.' }}
      </p>
      <button
        v-if="!searchQuery"
        @click="openCreateModal"
        class="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Nuevo Ingreso
      </button>
    </div>

    <!-- Lista de ingresos -->
    <div v-else class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div class="divide-y divide-gray-50">
        <div
          v-for="income in filteredIncomes"
          :key="income.id"
          class="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 lg:px-5"
        >
          <!-- Ícono de categoría -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm ring-1 ring-gray-100"
            :style="
              income.category?.color
                ? `background-color: ${income.category.color}20; color: ${income.category.color}`
                : ''
            "
            :class="!income.category?.color ? 'bg-emerald-50 text-emerald-600' : ''"
          >
            {{ income.category?.icon || '💰' }}
          </div>

          <!-- Info principal -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-semibold text-gray-800">{{ income.description }}</p>
              <span
                v-if="income.isRecurring"
                class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600"
              >
                {{ frequencyLabel[income.frequency ?? ''] ?? 'Fijo' }}
              </span>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
              <span>{{ income.category?.name ?? '—' }}</span>
              <span>·</span>
              <span>{{ formatDate(income.date) }}</span>
            </div>
          </div>

          <!-- Monto -->
          <div class="shrink-0 text-right">
            <p class="text-base font-bold text-emerald-600">
              + {{ formatCurrency(income.amount) }}
            </p>
          </div>

          <!-- Acciones (visible al hover en desktop, siempre en mobile) -->
          <div
            class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 lg:opacity-0"
          >
            <button
              @click="openEditModal(income)"
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
              @click="deleteIncome(income)"
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

    <!-- Modal formulario -->
    <IngresosIncomeFormModal
      v-model:show="showFormModal"
      :income="editingIncome"
      :categories="categories || []"
      @save="handleSave"
    />
  </div>
</template>
