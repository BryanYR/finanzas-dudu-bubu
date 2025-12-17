<script setup lang="ts">
interface Payment {
  id: number
  amount: number
  principal: number
  interest: number
  insurance: number
  date: string
  paymentNumber: number
  notes?: string
}

interface Debt {
  id: number
  name: string
  creditor: string
  totalAmount: number
  remainingAmount: number
}

const props = defineProps<{
  debt: Debt | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const payments = ref<Payment[]>([])
const loading = ref(false)

// Fetch payments when modal opens
watch(
  () => props.show,
  async (isShowing) => {
    if (isShowing && props.debt) {
      await fetchPayments()
    }
  }
)

const fetchPayments = async () => {
  if (!props.debt) return

  loading.value = true
  try {
    const data = await $fetch<Payment[]>(`/api/debts/${props.debt.id}/payments`)
    payments.value = data
  } catch (err) {
    console.error('Error al cargar pagos:', err)
  } finally {
    loading.value = false
  }
}

// Calculations
const totalPaid = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.amount, 0)
})

const totalPrincipal = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.principal, 0)
})

const totalInterest = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.interest, 0)
})

const totalInsurance = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.insurance, 0)
})

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
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    title="Historial de Pagos"
    size="xl"
  >
    <div v-if="debt" class="space-y-4">
      <!-- Info de la deuda -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 class="font-semibold text-gray-900">{{ debt.name }}</h3>
        <p class="text-sm text-gray-600">{{ debt.creditor }}</p>
        <div class="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p class="text-gray-600">Total Original</p>
            <p class="font-semibold text-gray-900">{{ formatCurrency(debt.totalAmount) }}</p>
          </div>
          <div>
            <p class="text-gray-600">Saldo Pendiente</p>
            <p class="font-semibold text-red-600">{{ formatCurrency(debt.remainingAmount) }}</p>
          </div>
          <div>
            <p class="text-gray-600">Total Pagado</p>
            <p class="font-semibold text-green-600">
              {{ formatCurrency(debt.totalAmount - debt.remainingAmount) }}
            </p>
          </div>
          <div>
            <p class="text-gray-600">Cuotas Pagadas</p>
            <p class="font-semibold text-blue-600">{{ payments.length }}</p>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div class="rounded-lg border border-green-200 bg-green-50 p-4">
          <p class="text-xs text-green-700">Capital Pagado</p>
          <p class="mt-1 text-xl font-bold text-green-800">{{ formatCurrency(totalPrincipal) }}</p>
        </div>
        <div class="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p class="text-xs text-orange-700">Intereses Pagados</p>
          <p class="mt-1 text-xl font-bold text-orange-800">{{ formatCurrency(totalInterest) }}</p>
        </div>
        <div class="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p class="text-xs text-purple-700">Seguro Pagado</p>
          <p class="mt-1 text-xl font-bold text-purple-800">{{ formatCurrency(totalInsurance) }}</p>
        </div>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p class="text-xs text-blue-700">Total Pagado</p>
          <p class="mt-1 text-xl font-bold text-blue-800">{{ formatCurrency(totalPaid) }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
        ></div>
      </div>

      <!-- Payments List -->
      <div v-else-if="payments.length > 0" class="space-y-3">
        <h4 class="font-semibold text-gray-900">Pagos Registrados</h4>
        <div class="max-h-96 space-y-2 overflow-y-auto">
          <div
            v-for="payment in payments"
            :key="payment.id"
            class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800"
                  >
                    Cuota #{{ payment.paymentNumber }}
                  </span>
                  <span class="text-sm text-gray-500">{{ formatDate(payment.date) }}</span>
                </div>
                <div class="mt-2 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p class="text-gray-600">Capital</p>
                    <p class="font-semibold text-green-700">
                      {{ formatCurrency(payment.principal) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-600">Interés</p>
                    <p class="font-semibold text-orange-700">
                      {{ formatCurrency(payment.interest) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-600">Seguro</p>
                    <p class="font-semibold text-purple-700">
                      {{ formatCurrency(payment.insurance) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-600">Total</p>
                    <p class="font-semibold text-gray-900">{{ formatCurrency(payment.amount) }}</p>
                  </div>
                </div>
                <p v-if="payment.notes" class="mt-2 text-xs text-gray-500">
                  {{ payment.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
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
        <h3 class="mt-2 text-sm font-medium text-gray-900">Sin pagos registrados</h3>
        <p class="mt-1 text-sm text-gray-500">Esta deuda aún no tiene pagos registrados.</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cerrar </UiButton>
      </div>
    </template>
  </UiModal>
</template>
