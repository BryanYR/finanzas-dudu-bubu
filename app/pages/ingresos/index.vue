<script setup lang="ts">
import type { Income } from '#types/ingreso'
import type { Category } from '#types/categoria'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import RefreshIcon from '@components/icons/common/RefreshIcon.vue'
import DocumentTextIcon from '@components/icons/common/DocumentTextIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import EmptyStateIcon from '@components/icons/common/EmptyStateIcon.vue'
import TrendingUpIcon from '@components/icons/ingresos/TrendingUpIcon.vue'

definePageMeta({
  layout: 'default',
})

// Data fetching
const { data: incomes, pending, error, refresh } = await useFetchAuth<Income[]>('/api/incomes')
const { data: categories } = await useFetchAuth<Category[]>('/api/categories')
const $authFetch = useAuthFetch()

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const generatingRecurring = ref(false)
const generationResult = ref<{ generated: any[]; skipped: any[] } | null>(null)
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

const generateRecurringIncomes = async () => {
  generatingRecurring.value = true
  generationResult.value = null

  try {
    const result = await $authFetch('/api/incomes/generate-recurring', {
      method: 'POST',
    })
    generationResult.value = result
    await refresh()

    // Mostrar notificación
    if (result.generated.length > 0) {
      alert(`✅ Se generaron ${result.generated.length} ingresos recurrentes`)
    } else if (result.skipped.length > 0) {
      alert(`ℹ️ No hay ingresos pendientes por generar este mes`)
    }
  } catch (err: any) {
    console.error('Error al generar ingresos recurrentes:', err)
    alert('Error al generar ingresos recurrentes')
  } finally {
    generatingRecurring.value = false
  }
}

const deleteIncome = async () => {
  if (!incomeToDelete.value) return

  deleting.value = true
  try {
    await $authFetch(`/api/incomes/${incomeToDelete.value.id}`, {
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
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

const { formatDate } = useDateFormatter()

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
      <div class="flex gap-3">
        <UiButton
          @click="generateRecurringIncomes"
          :loading="generatingRecurring"
          :icon="RefreshIcon"
          variant="outline"
        >
          Generar Recurrentes
        </UiButton>
        <UiButton @click="openCreateModal" :icon="PlusIcon" variant="primary">
          Nuevo Ingreso
        </UiButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Ingresos</p>
            <p class="mt-2 text-3xl font-bold text-green-600">{{ formatCurrency(totalIncomes) }}</p>
          </div>
          <div class="rounded-full bg-green-100 p-1">
            <TrendingUpIcon custom-class="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Ingresos Mensuales Fijos</p>
            <p class="mt-2 text-3xl font-bold text-blue-600">
              {{ formatCurrency(recurringMonthlyTotal) }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-1">
            <RefreshIcon custom-class="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Registros</p>
            <p class="mt-2 text-3xl font-bold text-primary-600">{{ filteredIncomes.length }}</p>
          </div>
          <div class="rounded-full bg-primary-100 p-1">
            <DocumentTextIcon custom-class="h-8 w-8 text-primary-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-3">
        <UiButton
          @click="filterType = 'all'"
          :variant="filterType === 'all' ? 'primary' : 'outline'"
          size="sm"
        >
          Todos
        </UiButton>
        <UiButton
          @click="filterType = 'recurring'"
          :variant="filterType === 'recurring' ? 'primary' : 'outline'"
          size="sm"
        >
          Recurrentes
        </UiButton>
        <UiButton
          @click="filterType = 'one-time'"
          :variant="filterType === 'one-time' ? 'primary' : 'outline'"
          size="sm"
        >
          Únicos
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
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
            class="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50"
            title="Editar"
          >
            <EditIcon />
          </button>
          <button
            @click="openDeleteModal(item)"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Eliminar"
          >
            <DeleteIcon />
          </button>
        </div>
      </template>

      <template #empty>
        <div class="text-center">
          <EmptyStateIcon custom-class="mx-auto text-gray-400 h-10 w-10" />
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
