<script setup lang="ts">
import type { Debt } from '#types/deuda'

definePageMeta({ layout: 'default' })

const toast = useToast()
const { confirm } = useConfirm()
const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()

const debts = ref<Debt[]>([])
const loading = ref(false)
const showDebtModal = ref(false)
const showPaymentModal = ref(false)
const showHistoryModal = ref(false)
const showInstallmentsModal = ref(false)
const editingDebt = ref<Debt | null>(null)
const selectedDebt = ref<Debt | null>(null)
const filterType = ref<'all' | 'active' | 'paid'>('all')

const fetchDebts = async () => {
  loading.value = true
  try {
    debts.value = await $authFetch<Debt[]>('/api/debts')
  } catch {
    toast.error('Error al cargar las deudas')
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchDebts())

// Stats
const activeDebts = computed(() => debts.value.filter((d) => !d.isPaid))
const paidDebts = computed(() => debts.value.filter((d) => d.isPaid))

const totalPending = computed(() => activeDebts.value.reduce((s, d) => s + d.remainingAmount, 0))
const totalOriginal = computed(() => debts.value.reduce((s, d) => s + d.totalAmount, 0))
const totalPaid = computed(() =>
  debts.value.reduce((s, d) => s + (d.totalAmount - d.remainingAmount), 0)
)
const monthlyTotal = computed(() => activeDebts.value.reduce((s, d) => s + d.monthlyPayment, 0))
const overallProgress = computed(() => {
  if (totalOriginal.value === 0) return 0
  return Math.round((totalPaid.value / totalOriginal.value) * 100)
})

const filteredDebts = computed(() => {
  if (filterType.value === 'active') return activeDebts.value
  if (filterType.value === 'paid') return paidDebts.value
  return debts.value
})

// Per-debt helpers
const getProgress = (d: Debt) => {
  if (d.isPaid) return 100
  if (d.totalAmount === 0) return 0
  return Math.min(100, Math.round(((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100))
}

const getPaidInstallments = (d: Debt) => d._count?.payments ?? 0

const progressBarClass = (d: Debt) => {
  const p = getProgress(d)
  if (d.isPaid) return 'bg-emerald-500'
  if (p >= 75) return 'bg-emerald-500'
  if (p >= 40) return 'bg-blue-500'
  return 'bg-purple-500'
}

// Actions
const handleCreate = () => {
  editingDebt.value = null
  showDebtModal.value = true
}
const handleEdit = (d: Debt) => {
  editingDebt.value = d
  showDebtModal.value = true
}

const handleDelete = async (d: Debt) => {
  const ok = await confirm({
    title: 'Eliminar deuda',
    message: `¿Seguro que deseas eliminar "${d.name}"? Se eliminarán todos los pagos asociados.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  try {
    await $authFetch(`/api/debts/${d.id}`, { method: 'DELETE' })
    await fetchDebts()
    toast.success('Deuda eliminada')
  } catch {
    toast.error('Error al eliminar la deuda')
  }
}

const handlePay = (d: Debt) => {
  selectedDebt.value = { ...d, totalPayments: d._count?.payments ?? 0 }
  showPaymentModal.value = true
}

const handleHistory = (d: Debt) => {
  selectedDebt.value = d
  showHistoryModal.value = true
}

const handleInstallments = (d: Debt) => {
  selectedDebt.value = d
  showInstallmentsModal.value = true
}

const handleSave = () => fetchDebts()

const filters = [
  { val: 'all' as const, label: 'Todas' },
  { val: 'active' as const, label: 'Activas' },
  { val: 'paid' as const, label: 'Pagadas' },
]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Deudas</h1>
        <p class="text-sm text-gray-500">
          {{ activeDebts.length }} activa{{ activeDebts.length !== 1 ? 's' : '' }} ·
          {{ paidDebts.length }} pagada{{ paidDebts.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <button
        @click="handleCreate"
        class="flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nueva Deuda
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div
        class="h-8 w-8 animate-spin rounded-full border-[3px] border-purple-600 border-t-transparent"
      ></div>
    </div>

    <template v-else>
      <!-- Resumen principal -->
      <div
        v-if="debts.length > 0"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-5 text-white shadow-lg"
      >
        <div class="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div class="absolute -bottom-10 left-4 h-28 w-28 rounded-full bg-white/10" />

        <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-medium text-white/70">Total pendiente</p>
            <p class="mt-0.5 text-3xl font-bold lg:text-4xl">{{ formatCurrency(totalPending) }}</p>
            <div class="mt-3">
              <div class="mb-1 flex justify-between text-xs text-white/60">
                <span>Progreso general</span>
                <span>{{ overallProgress }}% pagado</span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  class="h-full rounded-full bg-white transition-all duration-700"
                  :style="{ width: overallProgress + '%' }"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-4 sm:gap-6">
            <div class="text-center">
              <p class="text-2xl font-bold">{{ formatCurrency(monthlyTotal) }}</p>
              <p class="text-xs text-white/60">cuotas/mes</p>
            </div>
            <div class="w-px bg-white/20" />
            <div class="text-center">
              <p class="text-2xl font-bold">{{ formatCurrency(totalPaid) }}</p>
              <p class="text-xs text-white/60">ya pagado</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats 3 en fila -->
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Deuda total</p>
          <p class="mt-1.5 text-lg font-bold text-red-500 lg:text-xl">
            {{ formatCurrency(totalPending) }}
          </p>
          <p class="mt-0.5 text-xs text-gray-400">
            {{ activeDebts.length }} préstamo{{ activeDebts.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Cuota mensual</p>
          <p class="mt-1.5 text-lg font-bold text-orange-500 lg:text-xl">
            {{ formatCurrency(monthlyTotal) }}
          </p>
          <p class="mt-0.5 text-xs text-gray-400">compromiso mes</p>
        </div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Pagado</p>
          <p class="mt-1.5 text-lg font-bold text-emerald-600 lg:text-xl">
            {{ formatCurrency(totalPaid) }}
          </p>
          <p class="mt-0.5 text-xs text-gray-400">{{ overallProgress }}% del total</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            filterType === f.val
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ f.label }}
          <span
            class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            :class="filterType === f.val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
          >
            {{
              f.val === 'all'
                ? debts.length
                : f.val === 'active'
                  ? activeDebts.length
                  : paidDebts.length
            }}
          </span>
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="filteredDebts.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50">
          <svg
            class="h-8 w-8 text-purple-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 class="mt-4 text-sm font-semibold text-gray-700">
          {{ filterType === 'paid' ? 'No hay deudas pagadas' : 'No hay deudas activas' }}
        </h3>
        <p class="mt-1 text-sm text-gray-400">
          {{ filterType === 'all' ? 'Registra tu primer préstamo o deuda.' : '' }}
        </p>
        <button
          v-if="filterType !== 'paid'"
          @click="handleCreate"
          class="mt-4 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Nueva Deuda
        </button>
      </div>

      <!-- Cards de deudas -->
      <div class="space-y-3">
        <div
          v-for="debt in filteredDebts"
          :key="debt.id"
          class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-shadow hover:shadow-md"
          :class="debt.isPaid ? 'ring-emerald-100' : 'ring-gray-100'"
        >
          <!-- Barra de color superior -->
          <div class="h-1 w-full" :class="debt.isPaid ? 'bg-emerald-400' : 'bg-purple-500'" />

          <div class="p-4 lg:p-5">
            <!-- Fila 1: Nombre + estado + cuota mensual -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-bold text-gray-900">{{ debt.name }}</h3>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    :class="
                      debt.isPaid
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-purple-100 text-purple-700'
                    "
                  >
                    {{ debt.isPaid ? 'Pagada' : 'Activa' }}
                  </span>
                </div>
                <p class="mt-0.5 text-sm text-gray-500">
                  {{ debt.creditor }}
                  <span class="mx-1 text-gray-300">·</span>
                  {{ debt.interestRate }}% anual
                  <span class="mx-1 text-gray-300">·</span>
                  Pago día {{ debt.paymentDayOfMonth }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-lg font-bold text-gray-900">
                  {{ formatCurrency(debt.monthlyPayment) }}
                </p>
                <p class="text-xs text-gray-400">por mes</p>
              </div>
            </div>

            <!-- Fila 2: Montos -->
            <div class="mt-3 flex flex-wrap gap-4">
              <div>
                <p class="text-xs text-gray-400">Pendiente</p>
                <p
                  class="text-sm font-bold"
                  :class="debt.isPaid ? 'text-emerald-600' : 'text-red-500'"
                >
                  {{ formatCurrency(debt.remainingAmount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Original</p>
                <p class="text-sm font-semibold text-gray-700">
                  {{ formatCurrency(debt.totalAmount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Pagado</p>
                <p class="text-sm font-semibold text-emerald-600">
                  {{ formatCurrency(debt.totalAmount - debt.remainingAmount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Cuotas</p>
                <p class="text-sm font-semibold text-gray-700">
                  {{ getPaidInstallments(debt) }} / {{ debt.totalInstallments ?? '—' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Inicio</p>
                <p class="text-sm text-gray-600">{{ formatDate(debt.startDate) }}</p>
              </div>
            </div>

            <!-- Fila 3: Barra de progreso -->
            <div class="mt-4">
              <div class="mb-1.5 flex items-center justify-between text-xs text-gray-500">
                <span>Progreso del pago</span>
                <span
                  class="font-semibold"
                  :class="debt.isPaid ? 'text-emerald-600' : 'text-gray-700'"
                >
                  {{ getProgress(debt) }}%
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :class="progressBarClass(debt)"
                  :style="{ width: getProgress(debt) + '%' }"
                />
              </div>
            </div>

            <!-- Fila 4: Acciones -->
            <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
              <!-- Cuotas programadas -->
              <button
                @click="handleInstallments(debt)"
                class="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Cuotas
              </button>

              <!-- Historial -->
              <button
                @click="handleHistory(debt)"
                class="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Historial
              </button>

              <!-- Pagar (solo activas) -->
              <button
                v-if="!debt.isPaid"
                @click="handlePay(debt)"
                class="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Registrar Pago
              </button>

              <!-- Spacer -->
              <div class="flex-1" />

              <!-- Editar -->
              <button
                @click="handleEdit(debt)"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
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

              <!-- Eliminar -->
              <button
                @click="handleDelete(debt)"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500"
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
    </template>

    <!-- Modales -->
    <DeudasDebtFormModal v-model:show="showDebtModal" :debt="editingDebt" @save="handleSave" />

    <DeudasDebtPaymentModal
      v-model:show="showPaymentModal"
      :debt="selectedDebt"
      @save="handleSave"
    />

    <DeudasDebtHistoryModal
      v-model:show="showHistoryModal"
      :debt="selectedDebt"
      @deleted="handleSave"
    />

    <DeudasDebtInstallmentsModal
      :show="showInstallmentsModal"
      :debtId="selectedDebt?.id ?? 0"
      :debtName="selectedDebt?.name ?? ''"
      @close="showInstallmentsModal = false"
    />
  </div>
</template>
