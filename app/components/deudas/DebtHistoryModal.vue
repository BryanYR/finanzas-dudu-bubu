<script setup lang="ts">
import type { Debt, DebtPayment } from '#types/deuda'
import DocumentTextIcon from '@components/icons/common/DocumentTextIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'

const props = defineProps<{
  debt: Debt | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  deleted: []
}>()

const payments = ref<DebtPayment[]>([])
const loading = ref(false)
const deleting = ref<number | null>(null)
const $authFetch = useAuthFetch()
const confirm = useConfirm()
const showEditModal = ref(false)
const editingPayment = ref<DebtPayment | null>(null)

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
    const data = await $authFetch<DebtPayment[]>(`/api/debts/${props.debt.id}/payments`)
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

const { formatDate, formatCurrency } = useDateFormatter()

const handleEditPayment = (payment: DebtPayment) => {
  editingPayment.value = payment
  showEditModal.value = true
}

const onPaymentSaved = async () => {
  await fetchPayments()
  emit('deleted') // reuse to trigger parent refresh (debt list)
}

const handleDeletePayment = async (payment: DebtPayment) => {
  if (!props.debt) return

  const ok = await confirm.confirm({
    title: 'Eliminar pago',
    message: `¿Eliminar el pago de cuota #${payment.paymentNumber} por ${formatCurrency(payment.amount)}? Esta acción revertirá el saldo de la deuda.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return

  deleting.value = payment.id
  try {
    await $authFetch(`/api/debts/${props.debt.id}/payments/${payment.id}`, { method: 'DELETE' })
    useToast().success('Pago eliminado correctamente')
    await fetchPayments()
    emit('deleted')
  } catch (err) {
    console.error('Error al eliminar pago:', err)
    useToast().error('Error al eliminar el pago')
  } finally {
    deleting.value = null
  }
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
            <div class="flex items-start justify-between gap-3">
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
              <button
                type="button"
                @click="handleEditPayment(payment)"
                class="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Editar pago"
              >
                <EditIcon custom-class="h-4 w-4" />
              </button>
              <button
                type="button"
                :disabled="deleting === payment.id"
                @click="handleDeletePayment(payment)"
                class="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Eliminar pago"
              >
                <DeleteIcon v-if="deleting !== payment.id" custom-class="h-4 w-4" />
                <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
        <DocumentTextIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
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

  <DeudasDebtPaymentModal
    v-model:show="showEditModal"
    :debt="debt"
    :payment="editingPayment"
    @save="onPaymentSaved"
  />
</template>
