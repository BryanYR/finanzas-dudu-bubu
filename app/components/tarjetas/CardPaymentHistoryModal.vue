<script setup lang="ts">
import type { CardPayment } from '#types/tarjeta'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'
import CardIcon from '@components/icons/tarjetas/CardIcon.vue'

const props = defineProps<{
  show: boolean
  cardId: number | null
  cardName: string
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()

const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

// Data
const payments = ref<CardPayment[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Load payment history when modal opens
watch(
  () => props.show,
  async (newValue) => {
    if (newValue && props.cardId) {
      await loadPaymentHistory()
    }
  }
)

const loadPaymentHistory = async () => {
  if (!props.cardId) return

  loading.value = true
  error.value = null

  try {
    const data = await $authFetch(`/api/credit-cards/${props.cardId}/payment-history`)
    payments.value = data.payments
  } catch (err: any) {
    console.error('Error al cargar historial de pagos:', err)
    error.value = err.message || 'Error al cargar el historial'
  } finally {
    loading.value = false
  }
}

const closeModal = () => {
  emit('update:show', false)
}

const totalPaid = computed(() => {
  return payments.value.reduce((sum, payment) => sum + payment.amount, 0)
})
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="closeModal"
    :title="`Historial de Pagos - ${cardName}`"
    size="lg"
  >
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
      ></div>
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-800">
      {{ error }}
    </div>

    <div v-else>
      <!-- Summary -->
      <div class="mb-6 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm opacity-90">Total Pagado</p>
            <p class="text-3xl font-bold">{{ formatCurrency(totalPaid) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm opacity-90">Número de Pagos</p>
            <p class="text-3xl font-bold">{{ payments.length }}</p>
          </div>
        </div>
      </div>

      <!-- Payments List -->
      <div v-if="payments.length > 0" class="space-y-3">
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div class="flex items-center gap-4">
            <div class="rounded-full bg-green-100 p-1">
              <CheckCircleIcon custom-class="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p class="font-semibold text-gray-900">{{ formatCurrency(payment.amount) }}</p>
              <p class="text-sm text-gray-500">{{ formatDate(payment.date) }}</p>
              <p v-if="payment.description" class="text-xs text-gray-400">
                {{ payment.description }}
              </p>
            </div>
          </div>
          <div v-if="payment.category" class="text-right">
            <span
              class="inline-block rounded-full px-3 py-1 text-xs font-medium"
              :style="{
                backgroundColor: (payment.category.color || '#6b7280') + '20',
                color: payment.category.color || '#6b7280',
              }"
            >
              {{ payment.category.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
        <CardIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">Sin historial de pagos</h3>
        <p class="mt-1 text-sm text-gray-500">No se han registrado pagos para esta tarjeta aún.</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UiButton @click="closeModal" variant="outline"> Cerrar </UiButton>
      </div>
    </template>
  </UiModal>
</template>
