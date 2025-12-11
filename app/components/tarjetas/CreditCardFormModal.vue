<script setup lang="ts">
interface CreditCard {
  id?: number
  name: string
  bank: string
  lastDigits: string
  creditLimit: number
  billingDay: number
  paymentDay: number
  interestRate?: number
  isActive: boolean
}

const props = defineProps<{
  card?: CreditCard | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [card: CreditCard]
}>()

const saving = ref(false)

const form = reactive({
  name: '',
  bank: '',
  lastDigits: '',
  creditLimit: 0,
  billingDay: 1,
  paymentDay: 1,
  interestRate: 0,
  isActive: true,
})

const resetForm = () => {
  form.name = ''
  form.bank = ''
  form.lastDigits = ''
  form.creditLimit = 0
  form.billingDay = 1
  form.paymentDay = 1
  form.interestRate = 0
  form.isActive = true
}

// Watch card prop to populate form
watch(
  () => props.card,
  (newCard) => {
    if (newCard) {
      form.name = newCard.name
      form.bank = newCard.bank
      form.lastDigits = newCard.lastDigits
      form.creditLimit = newCard.creditLimit
      form.billingDay = newCard.billingDay
      form.paymentDay = newCard.paymentDay
      form.interestRate = newCard.interestRate || 0
      form.isActive = newCard.isActive
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch show prop
watch(
  () => props.show,
  (isShowing) => {
    if (isShowing && !props.card) {
      resetForm()
    } else if (isShowing && props.card) {
      form.name = props.card.name
      form.bank = props.card.bank
      form.lastDigits = props.card.lastDigits
      form.creditLimit = props.card.creditLimit
      form.billingDay = props.card.billingDay
      form.paymentDay = props.card.paymentDay
      form.interestRate = props.card.interestRate || 0
      form.isActive = props.card.isActive
    }
  }
)

const handleSave = async () => {
  saving.value = true

  const dataToSend = {
    name: form.name,
    bank: form.bank,
    lastDigits: form.lastDigits,
    creditLimit: Number(form.creditLimit),
    billingDay: Number(form.billingDay),
    paymentDay: Number(form.paymentDay),
    interestRate: form.interestRate ? Number(form.interestRate) : undefined,
    isActive: form.isActive,
  }

  try {
    if (props.card?.id) {
      await $fetch(`/api/credit-cards/${props.card.id}`, {
        method: 'PUT',
        body: dataToSend,
      })
    } else {
      await $fetch('/api/credit-cards', {
        method: 'POST',
        body: dataToSend,
      })
    }
    emit('save', dataToSend)
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al guardar tarjeta:', err)
    alert('Error al guardar la tarjeta')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    :title="card ? 'Editar Tarjeta' : 'Nueva Tarjeta'"
    size="lg"
  >
    <form @submit.prevent="handleSave" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Nombre -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">
            Nombre <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Visa Gold"
          />
        </div>

        <!-- Banco -->
        <div>
          <label for="bank" class="block text-sm font-medium text-gray-700">
            Banco <span class="text-red-500">*</span>
          </label>
          <input
            id="bank"
            v-model="form.bank"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Banco Pichincha"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Últimos 4 dígitos -->
        <div>
          <label for="lastDigits" class="block text-sm font-medium text-gray-700">
            Últimos 4 dígitos <span class="text-red-500">*</span>
          </label>
          <input
            id="lastDigits"
            v-model="form.lastDigits"
            type="text"
            required
            maxlength="4"
            pattern="[0-9]{4}"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="1234"
          />
        </div>

        <!-- Límite de crédito -->
        <div>
          <label for="creditLimit" class="block text-sm font-medium text-gray-700">
            Límite de crédito <span class="text-red-500">*</span>
          </label>
          <input
            id="creditLimit"
            v-model="form.creditLimit"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <!-- Día de corte -->
        <div>
          <label for="billingDay" class="block text-sm font-medium text-gray-700">
            Día de corte <span class="text-red-500">*</span>
          </label>
          <input
            id="billingDay"
            v-model="form.billingDay"
            type="number"
            required
            min="1"
            max="31"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Día de pago -->
        <div>
          <label for="paymentDay" class="block text-sm font-medium text-gray-700">
            Día de pago <span class="text-red-500">*</span>
          </label>
          <input
            id="paymentDay"
            v-model="form.paymentDay"
            type="number"
            required
            min="1"
            max="31"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Tasa de interés -->
        <div>
          <label for="interestRate" class="block text-sm font-medium text-gray-700">
            Tasa de interés (%)
          </label>
          <input
            id="interestRate"
            v-model="form.interestRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <!-- Estado activo -->
      <div class="flex items-center">
        <input
          id="isActive"
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
        />
        <label for="isActive" class="ml-2 block text-sm text-gray-700"> Tarjeta activa </label>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSave" :loading="saving" variant="primary">
          {{ card ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
