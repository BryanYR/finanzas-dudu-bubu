<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

interface Debt {
  id: number
  name: string
  creditor: string
  totalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  endDate?: string
  isPaid: boolean
  _count?: {
    payments: number
  }
  totalPayments?: number
}

// State
const debts = ref<Debt[]>([])
const loading = ref(false)
const showDebtModal = ref(false)
const showPaymentModal = ref(false)
const showHistoryModal = ref(false)
const editingDebt = ref<Debt | null>(null)
const selectedDebt = ref<Debt | null>(null)
const filterType = ref('all') // all, active, paid

// Fetch data
const fetchDebts = async () => {
  loading.value = true
  try {
    const data = await $fetch<Debt[]>('/api/debts')
    debts.value = data
  } catch (err) {
    console.error('Error al cargar deudas:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDebts()
})

// Stats
const totalDebt = computed(() => {
  const active = debts.value.filter((d) => !d.isPaid)
  return active.reduce((sum, debt) => sum + debt.remainingAmount, 0)
})

const totalOriginal = computed(() => {
  return debts.value.reduce((sum, debt) => sum + debt.totalAmount, 0)
})

const totalPaid = computed(() => {
  return debts.value.reduce((sum, debt) => sum + (debt.totalAmount - debt.remainingAmount), 0)
})

const activeDebtsCount = computed(() => {
  return debts.value.filter((d) => !d.isPaid).length
})

const monthlyPaymentsTotal = computed(() => {
  const active = debts.value.filter((d) => !d.isPaid)
  return active.reduce((sum, debt) => sum + debt.monthlyPayment, 0)
})

// Filters
const filteredDebts = computed(() => {
  let filtered = debts.value

  if (filterType.value === 'active') {
    filtered = filtered.filter((d) => !d.isPaid)
  } else if (filterType.value === 'paid') {
    filtered = filtered.filter((d) => d.isPaid)
  }

  return filtered
})

// Actions
const handleCreate = () => {
  editingDebt.value = null
  showDebtModal.value = true
}

const handleEdit = (debt: Debt) => {
  editingDebt.value = debt
  showDebtModal.value = true
}

const handleDelete = async (debt: Debt) => {
  if (
    !confirm(
      '¿Estás seguro de eliminar esta deuda? Se eliminarán también todos los pagos registrados.'
    )
  )
    return

  try {
    await $fetch(`/api/debts/${debt.id}`, { method: 'DELETE' })
    await fetchDebts()
  } catch (err) {
    console.error('Error al eliminar:', err)
    alert('Error al eliminar la deuda')
  }
}

const handleRegisterPayment = (debt: Debt) => {
  selectedDebt.value = { ...debt, totalPayments: debt._count?.payments || 0 }
  showPaymentModal.value = true
}

const handleViewHistory = (debt: Debt) => {
  selectedDebt.value = debt
  showHistoryModal.value = true
}

const handleSave = async () => {
  await fetchDebts()
}

const handlePaymentSave = async () => {
  await fetchDebts()
}

// Formatters
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const getProgressPercentage = (debt: Debt) => {
  const paid = debt.totalAmount - debt.remainingAmount
  return Math.round((paid / debt.totalAmount) * 100)
}

// DataTable columns
const columns = [
  { key: 'name', label: 'Deuda' },
  { key: 'creditor', label: 'Acreedor' },
  { key: 'amounts', label: 'Montos' },
  { key: 'monthlyPayment', label: 'Cuota' },
  { key: 'interestRate', label: 'Tasa' },
  { key: 'progress', label: 'Progreso' },
  { key: 'actions', label: 'Acciones' },
]
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Deudas</h1>
        <p class="mt-1 text-sm text-gray-600">Gestiona tus préstamos y obligaciones financieras</p>
      </div>
      <UiButton @click="handleCreate" variant="primary">
        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nueva Deuda
      </UiButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total Pendiente -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Pendiente</p>
            <p class="mt-2 text-3xl font-bold text-red-600">
              {{ formatCurrency(totalDebt) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">{{ activeDebtsCount }} deuda(s) activa(s)</p>
          </div>
          <div class="rounded-full bg-red-100 p-3">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <!-- Total Original -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Original</p>
            <p class="mt-2 text-3xl font-bold text-gray-900">
              {{ formatCurrency(totalOriginal) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">Monto total prestado</p>
          </div>
          <div class="rounded-full bg-gray-100 p-3">
            <svg
              class="h-8 w-8 text-gray-600"
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

      <!-- Total Pagado -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Pagado</p>
            <p class="mt-2 text-3xl font-bold text-green-600">
              {{ formatCurrency(totalPaid) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              {{ totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0 }}% del total
            </p>
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Cuotas Mensuales -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Cuotas Mensuales</p>
            <p class="mt-2 text-3xl font-bold text-orange-600">
              {{ formatCurrency(monthlyPaymentsTotal) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">Total a pagar mensual</p>
          </div>
          <div class="rounded-full bg-orange-100 p-3">
            <svg
              class="h-8 w-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
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
        Todas ({{ debts.length }})
      </UiButton>
      <UiButton
        @click="filterType = 'active'"
        :variant="filterType === 'active' ? 'danger' : 'outline'"
        size="sm"
      >
        Activas ({{ debts.filter((d) => !d.isPaid).length }})
      </UiButton>
      <UiButton
        @click="filterType = 'paid'"
        :variant="filterType === 'paid' ? 'success' : 'outline'"
        size="sm"
      >
        Pagadas ({{ debts.filter((d) => d.isPaid).length }})
      </UiButton>
    </div>

    <!-- Data Table -->
    <div class="">
      <UiDataTable :data="filteredDebts" :columns="columns" :loading="loading">
        <template #cell-name="{ item }">
          <div>
            <p class="font-medium text-gray-900">{{ item.name }}</p>
            <p class="text-xs text-gray-500">Inicio: {{ formatDate(item.startDate) }}</p>
          </div>
        </template>

        <template #cell-creditor="{ item }">
          <span class="text-sm text-gray-700">{{ item.creditor }}</span>
        </template>

        <template #cell-amounts="{ item }">
          <div class="space-y-1">
            <div class="text-sm">
              <span class="text-gray-600">Original:</span>
              <span class="ml-1 font-medium">{{ formatCurrency(item.totalAmount) }}</span>
            </div>
            <div class="text-sm">
              <span class="text-gray-600">Pendiente:</span>
              <span class="ml-1 font-semibold text-red-600">{{
                formatCurrency(item.remainingAmount)
              }}</span>
            </div>
          </div>
        </template>

        <template #cell-monthlyPayment="{ item }">
          <span class="font-semibold text-orange-600">
            {{ formatCurrency(item.monthlyPayment) }}
          </span>
        </template>

        <template #cell-interestRate="{ item }">
          <span class="text-sm font-medium text-gray-900">{{ item.interestRate }}%</span>
        </template>

        <template #cell-progress="{ item }">
          <div class="w-full">
            <div class="mb-1 flex items-center justify-between text-xs">
              <span class="text-gray-600">{{ getProgressPercentage(item) }}%</span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  item.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
                ]"
              >
                {{ item.isPaid ? 'Pagada' : 'Activa' }}
              </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                :class="['h-full transition-all', item.isPaid ? 'bg-green-500' : 'bg-blue-500']"
                :style="{ width: `${getProgressPercentage(item)}%` }"
              ></div>
            </div>
          </div>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex gap-2">
            <button
              v-if="!item.isPaid"
              @click="handleRegisterPayment(item)"
              class="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
              title="Registrar pago"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button
              @click="handleViewHistory(item)"
              class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
              title="Ver historial de pagos"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
            <button
              @click="handleEdit(item)"
              class="text-indigo-600 hover:text-indigo-900"
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
              @click="handleDelete(item)"
              class="text-red-600 hover:text-red-900"
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
          <div class="py-12 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No hay deudas registradas</h3>
            <p class="mt-1 text-sm text-gray-500">
              Comienza registrando tu primera deuda o préstamo.
            </p>
            <div class="mt-6">
              <UiButton @click="handleCreate" variant="primary">
                <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nueva Deuda
              </UiButton>
            </div>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Modals -->
    <DeudasDebtFormModal v-model:show="showDebtModal" :debt="editingDebt" @save="handleSave" />

    <DeudasDebtPaymentModal
      v-model:show="showPaymentModal"
      :debt="selectedDebt"
      @save="handlePaymentSave"
    />

    <DeudasDebtHistoryModal v-model:show="showHistoryModal" :debt="selectedDebt" />
  </div>
</template>
