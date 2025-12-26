<script setup lang="ts">
import type { DebtInstallment } from '#types/deuda'

const props = defineProps<{
  show: boolean
  debtId: number
  debtName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { formatDate, formatCurrency } = useDateFormatter()

const installments = ref<(DebtInstallment & { debtPayment?: any })[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const paidCount = computed(
  () => installments.value.filter((i) => i.status === 'paid' || i.status === 'advanced').length
)

const pendingCount = computed(() => installments.value.filter((i) => i.status === 'pending').length)

const overdueCount = computed(() => installments.value.filter((i) => i.status === 'overdue').length)

const loadInstallments = async () => {
  if (!props.debtId) return

  loading.value = true
  error.value = null

  try {
    const data = await $fetch(`/api/debts/${props.debtId}/installments`)
    installments.value = data as any
  } catch (e: any) {
    error.value = e.message || 'Error al cargar las cuotas'
    console.error('Error loading installments:', e)
  } finally {
    loading.value = false
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida',
    advanced: 'Adelantada',
  }
  return labels[status] || status
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    advanced: 'bg-emerald-100 text-emerald-800',
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getRowClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'bg-white',
    paid: 'bg-green-50',
    overdue: 'bg-red-50',
    advanced: 'bg-emerald-50',
  }
  return classes[status] || 'bg-white'
}

const isAdvancedPayment = (installment: DebtInstallment & { debtPayment?: any }) => {
  return installment.status === 'advanced' && installment.debtPayment
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      loadInstallments()
    }
  }
)
</script>
<template>
  <UiModal
    :modelValue="show"
    @update:modelValue="$emit('close')"
    :title="`Cuotas Programadas - ${debtName}`"
    size="xl"
  >
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="error" class="py-8 text-center">
      <p class="text-red-500">{{ error }}</p>
      <UiButton @click="loadInstallments" class="mt-4">Reintentar</UiButton>
    </div>

    <div v-else class="space-y-4">
      <!-- Resumen -->
      <div class="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
        <div class="text-center">
          <p class="text-sm text-gray-600">Total Cuotas</p>
          <p class="text-2xl font-bold">{{ installments.length }}</p>
        </div>
        <div class="text-center">
          <p class="text-sm text-gray-600">Pagadas</p>
          <p class="text-2xl font-bold text-green-600">{{ paidCount }}</p>
        </div>
        <div class="text-center">
          <p class="text-sm text-gray-600">Pendientes</p>
          <p class="text-2xl font-bold text-blue-600">{{ pendingCount }}</p>
        </div>
        <div class="text-center">
          <p class="text-sm text-gray-600">Vencidas</p>
          <p class="text-2xl font-bold text-red-600">{{ overdueCount }}</p>
        </div>
      </div>

      <!-- Tabla de cuotas -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                #
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Fecha Vencimiento
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Monto
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Capital
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Interés
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Estado
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Fecha Pago
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="installment in installments"
              :key="installment.id"
              :class="getRowClass(installment.status)"
            >
              <td class="px-4 py-3 text-sm font-medium">
                {{ installment.installmentNumber }}
              </td>
              <td class="px-4 py-3 text-sm">
                {{ formatDate(installment.dueDate) }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium">
                {{ formatCurrency(installment.amount) }}
              </td>
              <td class="px-4 py-3 text-right text-sm">
                {{ formatCurrency(installment.principal) }}
              </td>
              <td class="px-4 py-3 text-right text-sm">
                {{ formatCurrency(installment.interest) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  :class="getStatusBadgeClass(installment.status)"
                  class="rounded-full px-2 py-1 text-xs"
                >
                  {{ getStatusLabel(installment.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">
                <span v-if="installment.debtPayment">
                  {{ formatDate(installment.debtPayment.date) }}
                  <span v-if="isAdvancedPayment(installment)" class="ml-1 text-green-600">
                    ⚡ Adelantado
                  </span>
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Leyenda -->
      <div class="flex flex-wrap gap-4 border-t pt-4 text-xs text-gray-600">
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded bg-green-100"></span>
          <span>Pagada</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded bg-emerald-100"></span>
          <span>Adelantada ⚡</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded border bg-white"></span>
          <span>Pendiente</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 rounded bg-red-100"></span>
          <span>Vencida</span>
        </div>
      </div>
    </div>
  </UiModal>
</template>
