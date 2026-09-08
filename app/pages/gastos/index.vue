<script setup lang="ts">
import type { Expense } from '#types/gasto'
import type { Category } from '#types/categoria'
import type { CreditCard } from '#types/tarjeta'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import EmptyStateIcon from '@components/icons/common/EmptyStateIcon.vue'
import RefreshIcon from '@components/icons/common/RefreshIcon.vue'
import ExpenseIcon from '@components/icons/gastos/ExpenseIcon.vue'
import DollarIcon from '@components/icons/gastos/DollarIcon.vue'
import CardIcon from '@components/icons/tarjetas/CardIcon.vue'

definePageMeta({
  layout: 'default',
})

// State
const expenses = ref<Expense[]>([])
const categories = ref<Category[]>([])
const creditCards = ref<CreditCard[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingExpense = ref<Expense | null>(null)
const filterType = ref('all') // all, recurring, one-time, cash, debit, credit

// Fetch data
const $authFetch = useAuthFetch()

const fetchExpenses = async () => {
  loading.value = true
  try {
    const data = await $authFetch<Expense[]>('/api/expenses')
    expenses.value = data
  } catch (err) {
    console.error('Error al cargar gastos:', err)
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const data = await $authFetch<Category[]>('/api/categories')
    categories.value = data
  } catch (err) {
    console.error('Error al cargar categorías:', err)
  }
}

const fetchCreditCards = async () => {
  try {
    const data = await $authFetch<CreditCard[]>('/api/credit-cards')
    creditCards.value = data
  } catch (err) {
    console.error('Error al cargar tarjetas:', err)
  }
}

onMounted(() => {
  fetchExpenses()
  fetchCategories()
  fetchCreditCards()
})

// Stats
const totalExpenses = computed(() => {
  const filtered = filteredExpenses.value
  return filtered.reduce((sum, expense) => sum + expense.amount, 0)
})

const recurringMonthlyTotal = computed(() => {
  const recurring = expenses.value.filter((expense) => expense.isRecurring)
  return recurring.reduce((sum, expense) => {
    if (!expense.frequency) return sum
    switch (expense.frequency) {
      case 'weekly':
        return sum + expense.amount * 4
      case 'biweekly':
        return sum + expense.amount * 2
      case 'monthly':
        return sum + expense.amount
      case 'annual':
        return sum + expense.amount / 12
      default:
        return sum
    }
  }, 0)
})

const expensesByPaymentMethod = computed(() => {
  const grouped = expenses.value.reduce(
    (acc, expense) => {
      acc[expense.paymentMethod] = (acc[expense.paymentMethod] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  return grouped
})

// Filters
const filteredExpenses = computed(() => {
  let filtered = expenses.value

  if (filterType.value === 'recurring') {
    filtered = filtered.filter((e) => e.isRecurring)
  } else if (filterType.value === 'one-time') {
    filtered = filtered.filter((e) => !e.isRecurring)
  } else if (['cash', 'debit', 'credit'].includes(filterType.value)) {
    filtered = filtered.filter((e) => e.paymentMethod === filterType.value)
  }

  return filtered
})

// Actions
const handleCreate = () => {
  editingExpense.value = null
  showModal.value = true
}

const handleEdit = (expense: Expense) => {
  editingExpense.value = expense
  showModal.value = true
}

const handleDelete = async (expense: Expense) => {
  if (!confirm('¿Estás seguro de eliminar este gasto?')) return

  try {
    await $authFetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
    await fetchExpenses()
  } catch (err) {
    console.error('Error al eliminar:', err)
    alert('Error al eliminar el gasto')
  }
}

const handleSave = async () => {
  await fetchExpenses()
}

// Formatters
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

const { formatDate } = useDateFormatter()

const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    cash: 'Efectivo',
    debit: 'Débito',
    credit: 'Crédito',
  }
  return methods[method] || method
}

const formatFrequency = (freq: string | undefined) => {
  if (!freq) return '-'
  const frequencies: Record<string, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    annual: 'Anual',
  }
  return frequencies[freq] || freq
}

const getPaymentMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    cash: 'bg-green-100 text-green-800',
    debit: 'bg-blue-100 text-blue-800',
    credit: 'bg-purple-100 text-purple-800',
  }
  return colors[method] || 'bg-gray-100 text-gray-800'
}

// DataTable columns
const columns = [
  { key: 'date', label: 'Fecha' },
  { key: 'description', label: 'Descripción' },
  { key: 'category', label: 'Categoría' },
  { key: 'amount', label: 'Monto' },
  { key: 'paymentMethod', label: 'Pago' },
  { key: 'type', label: 'Tipo' },
  { key: 'actions', label: 'Acciones' },
]
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Gastos</h1>
        <p class="mt-1 text-sm text-gray-600">Gestiona todos tus gastos y egresos</p>
      </div>
      <UiButton @click="handleCreate" :icon="PlusIcon" variant="primary"> Nuevo Gasto </UiButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Total Gastos -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Gastos</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(totalExpenses) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">{{ filteredExpenses.length }} registro(s)</p>
          </div>
          <div class="rounded-full bg-red-100 p-1">
            <ExpenseIcon custom-class="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <!-- Gastos Recurrentes Mensuales -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Gastos Fijos (Mes)</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(recurringMonthlyTotal) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              {{ expenses.filter((e) => e.isRecurring).length }} recurrente(s)
            </p>
          </div>
          <div class="rounded-full bg-orange-100 p-1">
            <RefreshIcon custom-class="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <!-- Por Método de Pago -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Por Método</p>
            <div class="mt-3 space-y-1">
              <div class="flex items-center gap-2 text-sm">
                <DollarIcon custom-class="h-4 w-4 text-gray-500" />
                <span class="flex-1 text-gray-600">Efectivo:</span>
                <span class="font-semibold">{{ expensesByPaymentMethod.cash || 0 }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <CardIcon custom-class="h-4 w-4 text-gray-500" />
                <span class="flex-1 text-gray-600">Débito:</span>
                <span class="font-semibold">{{ expensesByPaymentMethod.debit || 0 }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <CardIcon custom-class="h-4 w-4 text-gray-500" />
                <span class="flex-1 text-gray-600">Crédito:</span>
                <span class="font-semibold">{{ expensesByPaymentMethod.credit || 0 }}</span>
              </div>
            </div>
          </div>
          <div class="rounded-full bg-primary-100 p-1">
            <svg
              class="h-8 w-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <UiButton
        @click="filterType = 'all'"
        :variant="filterType === 'all' ? 'primary' : 'outline'"
        size="sm"
      >
        Todos ({{ expenses.length }})
      </UiButton>
      <UiButton
        @click="filterType = 'recurring'"
        :variant="filterType === 'recurring' ? 'primary' : 'outline'"
        size="sm"
      >
        Fijos ({{ expenses.filter((e) => e.isRecurring).length }})
      </UiButton>
      <UiButton
        @click="filterType = 'one-time'"
        :variant="filterType === 'one-time' ? 'primary' : 'outline'"
        size="sm"
      >
        Variables ({{ expenses.filter((e) => !e.isRecurring).length }})
      </UiButton>
      <div class="mx-2 border-l border-gray-300"></div>
      <UiButton
        @click="filterType = 'cash'"
        :variant="filterType === 'cash' ? 'success' : 'outline'"
        :icon="DollarIcon"
        size="sm"
      >
        Efectivo ({{ expensesByPaymentMethod.cash || 0 }})
      </UiButton>
      <UiButton
        @click="filterType = 'debit'"
        :variant="filterType === 'debit' ? 'primary' : 'outline'"
        :icon="CardIcon"
        size="sm"
      >
        Débito ({{ expensesByPaymentMethod.debit || 0 }})
      </UiButton>
      <UiButton
        @click="filterType = 'credit'"
        :variant="filterType === 'credit' ? 'primary' : 'outline'"
        :icon="CardIcon"
        size="sm"
      >
        Crédito ({{ expensesByPaymentMethod.credit || 0 }})
      </UiButton>
    </div>

    <!-- Data Table -->
    <div class="">
      <UiDataTable :data="filteredExpenses" :columns="columns" :loading="loading">
        <template #cell-date="{ item }">
          <span class="text-sm text-gray-900">{{ formatDate(item.date) }}</span>
        </template>

        <template #cell-description="{ item }">
          <div>
            <p class="font-medium text-gray-900">{{ item.description }}</p>
            <p v-if="item.notes" class="text-xs text-gray-500">{{ item.notes }}</p>
          </div>
        </template>

        <template #cell-category="{ item }">
          <span class="text-sm text-gray-700">{{ item.category.name }}</span>
        </template>

        <template #cell-amount="{ item }">
          <span class="font-semibold text-red-600">
            {{ formatCurrency(item.amount) }}
          </span>
        </template>

        <template #cell-paymentMethod="{ item }">
          <div class="space-y-1">
            <span
              :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                getPaymentMethodColor(item.paymentMethod),
              ]"
            >
              {{ formatPaymentMethod(item.paymentMethod) }}
            </span>
            <p v-if="item.creditCard" class="text-xs text-gray-500">
              {{ item.creditCard.name }} (••••{{ item.creditCard.lastDigits }})
            </p>
          </div>
        </template>

        <template #cell-type="{ item }">
          <div>
            <span
              v-if="item.isRecurring"
              class="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800"
            >
              <svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ formatFrequency(item.frequency) }}
            </span>
            <span
              v-else
              class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
            >
              Variable
            </span>
          </div>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex gap-2">
            <button
              @click="handleEdit(item)"
              class="text-primary-600 hover:text-primary-900"
              title="Editar"
            >
              <EditIcon />
            </button>
            <button
              @click="handleDelete(item)"
              class="text-red-600 hover:text-red-900"
              title="Eliminar"
            >
              <DeleteIcon />
            </button>
          </div>
        </template>

        <template #empty>
          <div class="py-12 text-center">
            <EmptyStateIcon custom-class="mx-auto text-gray-400 h-10 w-10" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No hay gastos</h3>
            <p class="mt-1 text-sm text-gray-500">Comienza creando tu primer gasto.</p>
            <div class="mt-6">
              <UiButton @click="handleCreate" :icon="PlusIcon" variant="primary">
                Nuevo Gasto
              </UiButton>
            </div>
          </div>
        </template>
      </UiDataTable>
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
