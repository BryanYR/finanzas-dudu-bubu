<script setup lang="ts">
import type { Debt } from '#types/deuda'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import HistoryIcon from '@components/icons/common/HistoryIcon.vue'
import PaymentIcon from '@components/icons/common/PaymentIcon.vue'
import DocumentTextIcon from '@components/icons/common/DocumentTextIcon.vue'
import CheckIcon from '@components/icons/common/CheckIcon.vue'
import DebtIcon from '@components/icons/deudas/DebtIcon.vue'

definePageMeta({
  layout: 'default',
})

// State
const debts = ref<Debt[]>([])
const loading = ref(false)
const showDebtModal = ref(false)
const showPaymentModal = ref(false)
const showHistoryModal = ref(false)
const showInstallmentsModal = ref(false)
const editingDebt = ref<Debt | null>(null)
const selectedDebt = ref<Debt | null>(null)
const filterType = ref('all') // all, active, paid

// Fetch data
const $authFetch = useAuthFetch()

const fetchDebts = async () => {
  loading.value = true
  try {
    const data = await $authFetch<Debt[]>('/api/debts')
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
    await $authFetch(`/api/debts/${debt.id}`, { method: 'DELETE' })
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

const handleViewInstallments = (debt: Debt) => {
  selectedDebt.value = debt
  showInstallmentsModal.value = true
}

const handleSave = async () => {
  await fetchDebts()
}

const handlePaymentSave = async () => {
  await fetchDebts()
}

// Formatters
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

const { formatDate } = useDateFormatter()

const getProgressPercentage = (debt: Debt) => {
  const totalInstallments = debt.totalInstallments || 0
  if (totalInstallments === 0) return 0

  const paidInstallments = debt._count?.payments || 0
  return Math.round((paidInstallments / totalInstallments) * 100)
}

// DataTable columns
const columns = [
  { key: 'name', label: 'Deuda' },
  { key: 'creditor', label: 'Acreedor' },
  { key: 'amounts', label: 'Montos' },
  { key: 'monthlyPayment', label: 'Cuota' },
  { key: 'installment', label: 'Progreso Cuotas' },
  { key: 'interestRate', label: 'Tasa' },
  { key: 'progress', label: 'Progreso Pago' },
  { key: 'actions', label: 'Acciones' },
]

// Calcular el número total de cuotas (ahora desde la BD)
const calculateTotalInstallments = (debt: Debt) => {
  return debt.totalInstallments || 0
}

// Calcular cuota actual (número de pagos realizados + 1)
const getCurrentInstallment = (debt: Debt) => {
  const paymentsMade = debt._count?.payments || 0
  return paymentsMade
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Deudas</h1>
        <p class="mt-1 text-sm text-gray-600">Gestiona tus préstamos y obligaciones financieras</p>
      </div>
      <UiButton @click="handleCreate" variant="primary">
        <PlusIcon custom-class="mr-2 h-10 w-10" />
        Nueva Deuda
      </UiButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Total Pendiente -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Pendiente</p>
            <p class="mt-2 text-2xl font-bold text-red-600">
              {{ formatCurrency(totalDebt) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">{{ activeDebtsCount }} deuda(s) activa(s)</p>
          </div>
          <div class="rounded-full bg-red-100 p-1">
            <DebtIcon custom-class="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <!-- Total Original -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Original</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(totalOriginal) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">Monto total prestado</p>
          </div>
          <div class="rounded-full bg-gray-100 p-1">
            <DocumentTextIcon custom-class="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      <!-- Total Pagado -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
          <div class="rounded-full bg-green-100 p-1">
            <CheckIcon custom-class="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Cuotas Mensuales -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Cuotas Mensuales</p>
            <p class="mt-2 text-3xl font-bold text-amber-600">
              {{ formatCurrency(monthlyPaymentsTotal) }}
            </p>
            <p class="mt-1 text-xs text-gray-500">Total a pagar mensual</p>
          </div>
          <div class="rounded-full bg-amber-100 p-1">
            <svg
              class="h-8 w-8 text-amber-600"
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
    <div>
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
          <span class="font-semibold text-amber-600">
            {{ formatCurrency(item.monthlyPayment) }}
          </span>
        </template>

        <template #cell-installment="{ item }">
          <div class="space-y-1">
            <div class="text-sm font-medium text-gray-900">
              Cuota {{ getCurrentInstallment(item) }} de {{ calculateTotalInstallments(item) }}
            </div>
            <div class="text-xs text-gray-500">
              {{ item._count?.payments || 0 }} pago(s) realizados
            </div>
          </div>
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
                  item.isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800',
                ]"
              >
                {{ item.isPaid ? 'Pagada' : 'Activa' }}
              </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                :class="['h-full transition-all', item.isPaid ? 'bg-green-500' : 'bg-primary-500']"
                :style="{ width: `${getProgressPercentage(item)}%` }"
              ></div>
            </div>
          </div>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex gap-2">
            <button
              @click="handleViewInstallments(item)"
              class="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50"
              title="Ver cuotas programadas"
            >
              <DebtIcon custom-class="h-5 w-5" />
            </button>
            <button
              v-if="!item.isPaid"
              @click="handleRegisterPayment(item)"
              class="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
              title="Registrar pago"
            >
              <PaymentIcon custom-class="h-5 w-5" />
            </button>
            <button
              @click="handleViewHistory(item)"
              class="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
              title="Ver historial de pagos"
            >
              <HistoryIcon custom-class="h-5 w-5" />
            </button>
            <button
              @click="handleEdit(item)"
              class="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50"
              title="Editar"
            >
              <EditIcon custom-class="h-5 w-5" />
            </button>
            <button
              @click="handleDelete(item)"
              class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
              title="Eliminar"
            >
              <DeleteIcon custom-class="h-5 w-5" />
            </button>
          </div>
        </template>

        <template #empty>
          <div class="py-12 text-center">
            <DocumentTextIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No hay deudas registradas</h3>
            <p class="mt-1 text-sm text-gray-500">
              Comienza registrando tu primera deuda o préstamo.
            </p>
            <div class="mt-6">
              <UiButton @click="handleCreate" variant="primary">
                <PlusIcon custom-class="mr-2 h-10 w-10" />
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

    <DeudasDebtInstallmentsModal
      :show="showInstallmentsModal"
      :debtId="selectedDebt?.id || 0"
      :debtName="selectedDebt?.name || ''"
      @close="showInstallmentsModal = false"
    />
  </div>
</template>
