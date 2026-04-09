<script setup lang="ts">
import type { Expense } from '#types/gasto'
import type { Category } from '#types/categoria'
import type { CreditCard } from '#types/tarjeta'

definePageMeta({ layout: 'default' })

const toast = useToast()
const { confirm } = useConfirm()
const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()

const expenses = ref<Expense[]>([])
const categories = ref<Category[]>([])
const creditCards = ref<CreditCard[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingExpense = ref<Expense | null>(null)
const filterType = ref('all')
const searchQuery = ref('')

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
  } catch {
    toast.error('Error al cargar los datos')
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchAll())

const byMethod = computed(() =>
  expenses.value.reduce((acc, e) => {
    acc[e.paymentMethod] = (acc[e.paymentMethod] || 0) + e.amount
    return acc
  }, {} as Record<string, number>),
)

const recurringTotal = computed(() =>
  expenses.value
    .filter((e) => e.isRecurring)
    .reduce((s, e) => {
      if (e.frequency === 'weekly') return s + e.amount * 4
      if (e.frequency === 'biweekly') return s + e.amount * 2
      if (e.frequency === 'monthly') return s + e.amount
      if (e.frequency === 'annual') return s + e.amount / 12
      return s
    }, 0),
)

const filteredExpenses = computed(() => {
  let list = expenses.value
  if (filterType.value === 'recurring') list = list.filter((e) => e.isRecurring)
  else if (filterType.value === 'one-time') list = list.filter((e) => !e.isRecurring)
  else if (['cash', 'debit', 'credit'].includes(filterType.value))
    list = list.filter((e) => e.paymentMethod === filterType.value)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category?.name.toLowerCase().includes(q),
    )
  }
  return list
})

const totalFiltered = computed(() =>
  filteredExpenses.value.reduce((s, e) => s + e.amount, 0),
)

const handleCreate = () => { editingExpense.value = null; showModal.value = true }
const handleEdit = (e: Expense) => { editingExpense.value = e; showModal.value = true }
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
  } catch {
    toast.error('Error al eliminar el gasto')
  }
}

const methodConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  cash:   { label: 'Efectivo', color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  debit:  { label: 'Débito',   color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  credit: { label: 'Crédito',  color: 'text-purple-700',  bg: 'bg-purple-50',   dot: 'bg-purple-500' },
}

const frequencyLabel: Record<string, string> = {
  weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', annual: 'Anual',
}

const mainFilters = [
  { val: 'all',       label: 'Todos' },
  { val: 'recurring', label: 'Fijos' },
  { val: 'one-time',  label: 'Variables' },
]

const methodFilters = [
  { val: 'cash',   label: '💵 Efectivo' },
  { val: 'debit',  label: '💳 Débito' },
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
      <button
        @click="handleCreate"
        class="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
        <p class="mt-1.5 text-lg font-bold text-red-500 lg:text-xl">{{ formatCurrency(totalFiltered) }}</p>
        <p class="mt-0.5 text-xs text-gray-400">{{ filteredExpenses.length }} registros</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Fijos/mes</p>
        <p class="mt-1.5 text-lg font-bold text-orange-500 lg:text-xl">{{ formatCurrency(recurringTotal) }}</p>
        <p class="mt-0.5 text-xs text-gray-400">{{ expenses.filter((e) => e.isRecurring).length }} recurrentes</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Efectivo</p>
        <p class="mt-1.5 text-lg font-bold text-emerald-600 lg:text-xl">{{ formatCurrency(byMethod.cash ?? 0) }}</p>
        <p class="mt-0.5 text-xs text-gray-400">débito {{ formatCurrency(byMethod.debit ?? 0) }}</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Crédito</p>
        <p class="mt-1.5 text-lg font-bold text-purple-600 lg:text-xl">{{ formatCurrency(byMethod.credit ?? 0) }}</p>
        <p class="mt-0.5 text-xs text-gray-400">{{ expenses.filter((e) => e.paymentMethod === 'credit').length }} cargos</p>
      </div>
    </div>

    <!-- Filtros + Búsqueda -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="f in mainFilters" :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="filterType === f.val
            ? 'bg-red-500 text-white shadow-sm'
            : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'"
        >{{ f.label }}</button>
        <div class="w-px self-stretch bg-gray-200" />
        <button
          v-for="f in methodFilters" :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="filterType === f.val
            ? 'bg-gray-700 text-white shadow-sm'
            : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'"
        >{{ f.label }}</button>
      </div>
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar gasto o categoría..."
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-red-500 border-t-transparent"></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredExpenses.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <svg class="h-8 w-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-700">
        {{ searchQuery ? 'Sin resultados' : 'No hay gastos aún' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ searchQuery ? 'Prueba con otro término.' : 'Registra tu primer gasto.' }}
      </p>
      <button
        v-if="!searchQuery"
        @click="handleCreate"
        class="mt-4 rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
      >Nuevo Gasto</button>
    </div>

    <!-- Lista de gastos -->
    <div v-else class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div class="divide-y divide-gray-50">
        <div
          v-for="expense in filteredExpenses"
          :key="expense.id"
          class="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 lg:px-5"
        >
          <!-- Ícono de categoría -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm ring-1 ring-gray-100"
            :style="expense.category?.color
              ? `background-color: ${expense.category.color}20; color: ${expense.category.color}`
              : ''"
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
              <!-- Badge cuotas -->
              <span
                v-if="expense.installments && expense.installments > 1"
                class="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600"
              >
                {{ expense.installments }} cuotas
              </span>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
              <span>{{ expense.category?.name ?? '—' }}</span>
              <span v-if="expense.creditCard">· {{ expense.creditCard.name }} ••••{{ expense.creditCard.lastDigits }}</span>
              <span>· {{ formatDate(expense.date) }}</span>
            </div>
          </div>

          <!-- Monto -->
          <div class="shrink-0 text-right">
            <p class="text-base font-bold text-red-500">- {{ formatCurrency(expense.amount) }}</p>
            <p
              v-if="expense.installments && expense.installments > 1"
              class="text-xs text-gray-400"
            >
              {{ formatCurrency(expense.amount / expense.installments) }}/cuota
            </p>
          </div>

          <!-- Acciones -->
          <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              @click="handleEdit(expense)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
              title="Editar"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="handleDelete(expense)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Eliminar"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  </div>
</template>
