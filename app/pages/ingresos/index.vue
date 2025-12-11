<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

interface Category {
  id: number
  name: string
  type: string
  icon?: string
  color?: string
}

interface Income {
  id: number
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  categoryId: number
  category: Category
  notes?: string
  userId: number
  createdAt: string
  updatedAt: string
}

// Data fetching
const { data: incomes, pending, error, refresh } = await useFetch<Income[]>('/api/incomes')
const { data: categories } = await useFetch<Category[]>('/api/categories')

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)
const editingIncome = ref<Income | null>(null)
const incomeToDelete = ref<Income | null>(null)
const filterType = ref<'all' | 'recurring' | 'one-time'>('all')

// Table columns
const columns = [
  { key: 'date', label: 'Fecha', sortable: true },
  { key: 'description', label: 'Descripción', sortable: true },
  { key: 'category', label: 'Categoría', sortable: true },
  { key: 'amount', label: 'Monto', sortable: true },
  { key: 'isRecurring', label: 'Tipo', sortable: true },
  { key: 'frequency', label: 'Frecuencia', sortable: false },
  { key: 'actions', label: 'Acciones', sortable: false },
]

// Computed
const filteredIncomes = computed(() => {
  if (!incomes.value) return []
  if (filterType.value === 'all') return incomes.value
  if (filterType.value === 'recurring') {
    return incomes.value.filter((income) => income.isRecurring)
  }
  return incomes.value.filter((income) => !income.isRecurring)
})

const totalIncomes = computed(() => {
  return filteredIncomes.value.reduce((sum, income) => sum + income.amount, 0)
})

const recurringMonthlyTotal = computed(() => {
  return (
    incomes.value
      ?.filter((i) => i.isRecurring)
      .reduce((sum, income) => {
        if (income.frequency === 'monthly') return sum + income.amount
        if (income.frequency === 'biweekly') return sum + income.amount * 2
        if (income.frequency === 'weekly') return sum + income.amount * 4
        if (income.frequency === 'annual') return sum + income.amount / 12
        return sum
      }, 0) || 0
  )
})

// Methods
const openCreateModal = () => {
  editingIncome.value = null
  showFormModal.value = true
}

const openEditModal = (income: Income) => {
  editingIncome.value = income
  showFormModal.value = true
}

const openDeleteModal = (income: Income) => {
  incomeToDelete.value = income
  showDeleteModal.value = true
}

const handleSave = async () => {
  await refresh()
}

const deleteIncome = async () => {
  if (!incomeToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/incomes/${incomeToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    await refresh()
  } catch (err) {
    console.error('Error al eliminar ingreso:', err)
    alert('Error al eliminar el ingreso')
  } finally {
    deleting.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getFrequencyLabel = (frequency?: string) => {
  const labels: Record<string, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    annual: 'Anual',
  }
  return frequency ? labels[frequency] || frequency : '-'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Ingresos</h1>
        <p class="mt-1 text-sm text-gray-600">Registra y gestiona tus ingresos</p>
      </div>
      <UiButton @click="openCreateModal" variant="primary">
        <template #default>
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuevo Ingreso
        </template>
      </UiButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Ingresos</p>
            <p class="mt-2 text-3xl font-bold text-green-600">{{ formatCurrency(totalIncomes) }}</p>
          </div>
          <div class="rounded-full bg-green-100 p-3">
            <svg
              class="h-8 w-8 text-green-600"
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
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Ingresos Mensuales Fijos</p>
            <p class="mt-2 text-3xl font-bold text-blue-600">
              {{ formatCurrency(recurringMonthlyTotal) }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-3">
            <svg
              class="h-8 w-8 text-blue-600"
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
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Registros</p>
            <p class="mt-2 text-3xl font-bold text-indigo-600">{{ filteredIncomes.length }}</p>
          </div>
          <div class="rounded-full bg-indigo-100 p-3">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-lg bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-4">
        <button
          @click="filterType = 'all'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Todos
        </button>
        <button
          @click="filterType = 'recurring'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'recurring'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Recurrentes
        </button>
        <button
          @click="filterType = 'one-time'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'one-time'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Únicos
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-800">
      Error al cargar los ingresos: {{ error.message }}
    </div>

    <!-- Data Table -->
    <UiDataTable v-else :data="filteredIncomes" :columns="columns" :items-per-page="10">
      <template #cell-date="{ value }">
        <span class="text-sm text-gray-600">{{ formatDate(value) }}</span>
      </template>

      <template #cell-category="{ item }">
        <div class="flex items-center gap-2">
          <span v-if="item.category.icon" class="text-lg">{{ item.category.icon }}</span>
          <span class="text-sm font-medium text-gray-900">{{ item.category.name }}</span>
        </div>
      </template>

      <template #cell-amount="{ value }">
        <span class="font-semibold text-green-600">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-isRecurring="{ value }">
        <span
          :class="[
            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
            value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800',
          ]"
        >
          {{ value ? 'Recurrente' : 'Único' }}
        </span>
      </template>

      <template #cell-frequency="{ value }">
        <span class="text-sm text-gray-600">{{ getFrequencyLabel(value) }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <button
            @click="openEditModal(item)"
            class="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
            title="Editar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            @click="openDeleteModal(item)"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Eliminar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </template>

      <template #empty>
        <div class="text-center">
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No hay ingresos</h3>
          <p class="mt-1 text-sm text-gray-500">Comienza registrando tu primer ingreso.</p>
        </div>
      </template>
    </UiDataTable>

    <!-- Form Modal -->
    <IngresosIncomeFormModal
      v-model:show="showFormModal"
      :income="editingIncome"
      :categories="categories || []"
      @save="handleSave"
    />

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Eliminar Ingreso" size="sm">
      <p class="text-gray-600">
        ¿Estás seguro de que deseas eliminar el ingreso
        <strong>{{ incomeToDelete?.description }}</strong>
        por {{ formatCurrency(incomeToDelete?.amount || 0) }}? Esta acción no se puede deshacer.
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton @click="showDeleteModal = false" variant="outline"> Cancelar </UiButton>
          <UiButton @click="deleteIncome" :loading="deleting" variant="danger"> Eliminar </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
