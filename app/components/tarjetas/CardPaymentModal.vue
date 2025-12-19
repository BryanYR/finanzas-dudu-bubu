<script setup lang="ts">
import type { CreditCard } from '#types/tarjeta'

const props = defineProps<{
  show: boolean
  card: CreditCard | null
  suggestedAmount?: number
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save'): void
}>()

const localShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

// Form state
const form = reactive({
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  categoryId: null as number | null,
})

const loading = ref(false)
const error = ref('')

// Cargar categorías
const { data: categories } = await useFetchAuth<any[]>('/api/categories')
const paymentCategories = computed(() => {
  return (
    categories.value?.filter(
      (c) =>
        c.name.toLowerCase().includes('pago') ||
        c.name.toLowerCase().includes('tarjeta') ||
        c.type === 'expense'
    ) || []
  )
})

// Resetear form cuando se abre el modal
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      form.amount = props.suggestedAmount || 0
      form.date = new Date().toISOString().split('T')[0]
      form.categoryId =
        paymentCategories.value.find((c) => c.name.toLowerCase().includes('tarjeta'))?.id ||
        paymentCategories.value[0]?.id ||
        null
      error.value = ''
    }
  }
)

const handleSubmit = async () => {
  if (!props.card) return

  if (form.amount <= 0) {
    error.value = 'El monto debe ser mayor a 0'
    return
  }

  if (!form.categoryId) {
    error.value = 'Selecciona una categoría'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/credit-cards/${props.card.id}/pay`, {
      method: 'POST',
      body: {
        amount: form.amount,
        date: form.date,
        categoryId: form.categoryId,
      },
    })

    emit('save')
    localShow.value = false
  } catch (err: any) {
    error.value = err.data?.message || 'Error al registrar el pago'
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
</script>

<template>
  <UiModal v-model="localShow" title="Registrar Pago de Tarjeta" size="md">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Info de la tarjeta -->
      <div v-if="card" class="rounded-lg bg-indigo-50 p-4">
        <p class="text-sm font-medium text-indigo-900">{{ card.name }} - {{ card.bank }}</p>
        <p class="text-xs text-indigo-700">•••• •••• •••• {{ card.lastDigits }}</p>
        <p v-if="suggestedAmount" class="mt-2 text-sm text-indigo-800">
          Monto sugerido: <span class="font-bold">{{ formatCurrency(suggestedAmount) }}</span>
        </p>
      </div>

      <!-- Error -->
      <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-800">
        {{ error }}
      </div>

      <!-- Monto -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Monto del Pago *</label>
        <div class="relative mt-1">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
          <input
            v-model.number="form.amount"
            type="number"
            step="0.01"
            min="0"
            required
            class="block w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">Este monto se restará de tu saldo disponible</p>
      </div>

      <!-- Fecha -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Fecha de Pago *</label>
        <input
          v-model="form.date"
          type="date"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <!-- Categoría -->
      <div>
        <label class="block text-sm font-medium text-gray-700">Categoría *</label>
        <select
          v-model.number="form.categoryId"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option :value="null" disabled>Selecciona una categoría</option>
          <option v-for="cat in paymentCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Si no tienes una categoría para pagos de tarjetas, créala primero
        </p>
      </div>

      <!-- Info adicional -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p class="text-xs text-blue-800">
          💡 <strong>Nota:</strong> Este pago se registrará como un gasto en efectivo/débito que
          sale de tu cuenta bancaria. Los gastos realizados CON la tarjeta ya están registrados por
          separado.
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="localShow = false" variant="outline" :disabled="loading">
          Cancelar
        </UiButton>
        <UiButton @click="handleSubmit" :loading="loading" variant="primary">
          Registrar Pago
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
