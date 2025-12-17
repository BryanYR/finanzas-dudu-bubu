<script setup lang="ts">
interface Debt {
  id?: number
  name: string
  creditor: string
  totalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  endDate?: string
  isPaid: boolean
}

const props = defineProps<{
  debt?: Debt | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const saving = ref(false)

const form = reactive({
  name: '',
  creditor: '',
  totalAmount: 0,
  remainingAmount: 0,
  interestRate: 0,
  monthlyPayment: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
})

const resetForm = () => {
  form.name = ''
  form.creditor = ''
  form.totalAmount = 0
  form.remainingAmount = 0
  form.interestRate = 0
  form.monthlyPayment = 0
  form.startDate = new Date().toISOString().split('T')[0]
  form.endDate = ''
}

// Watch debt prop to populate form
watch(
  () => props.debt,
  (newDebt) => {
    if (newDebt) {
      form.name = newDebt.name
      form.creditor = newDebt.creditor
      form.totalAmount = newDebt.totalAmount
      form.remainingAmount = newDebt.remainingAmount
      form.interestRate = newDebt.interestRate
      form.monthlyPayment = newDebt.monthlyPayment
      form.startDate = newDebt.startDate.split('T')[0]
      form.endDate = (newDebt.endDate && newDebt.endDate.split('T')[0]) || ''
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
    if (isShowing && !props.debt) {
      resetForm()
    } else if (isShowing && props.debt) {
      form.name = props.debt.name
      form.creditor = props.debt.creditor
      form.totalAmount = props.debt.totalAmount
      form.remainingAmount = props.debt.remainingAmount
      form.interestRate = props.debt.interestRate
      form.monthlyPayment = props.debt.monthlyPayment
      form.startDate = props.debt.startDate.split('T')[0]
      form.endDate = (props.debt.endDate && props.debt.endDate.split('T')[0]) || ''
    }
  }
)

// Auto-calculate remaining amount for new debts
watch(
  () => form.totalAmount,
  (newTotal) => {
    if (!props.debt) {
      form.remainingAmount = newTotal
    }
  }
)

const handleSave = async () => {
  saving.value = true

  const dataToSend = {
    name: form.name,
    creditor: form.creditor,
    totalAmount: Number(form.totalAmount),
    remainingAmount: Number(form.remainingAmount),
    interestRate: Number(form.interestRate),
    monthlyPayment: Number(form.monthlyPayment),
    startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
    endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
  }

  try {
    if (props.debt?.id) {
      await $fetch(`/api/debts/${props.debt.id}`, {
        method: 'PUT',
        body: dataToSend,
      })
    } else {
      await $fetch('/api/debts', {
        method: 'POST',
        body: dataToSend,
      })
    }
    emit('save')
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al guardar deuda:', err)
    alert('Error al guardar la deuda')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    :title="debt ? 'Editar Deuda' : 'Nueva Deuda'"
    size="lg"
  >
    <form @submit.prevent="handleSave" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Nombre de la deuda -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">
            Nombre de la deuda <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Préstamo Personal, Crédito Auto"
          />
        </div>

        <!-- Acreedor -->
        <div>
          <label for="creditor" class="block text-sm font-medium text-gray-700">
            Acreedor <span class="text-red-500">*</span>
          </label>
          <input
            id="creditor"
            v-model="form.creditor"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Banco Pichincha, Cooperativa"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Monto total -->
        <div>
          <label for="totalAmount" class="block text-sm font-medium text-gray-700">
            Monto total original <span class="text-red-500">*</span>
          </label>
          <input
            id="totalAmount"
            v-model="form.totalAmount"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <!-- Monto pendiente -->
        <div>
          <label for="remainingAmount" class="block text-sm font-medium text-gray-700">
            Monto pendiente <span class="text-red-500">*</span>
          </label>
          <input
            id="remainingAmount"
            v-model="form.remainingAmount"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Tasa de interés -->
        <div>
          <label for="interestRate" class="block text-sm font-medium text-gray-700">
            Tasa de interés anual (%) <span class="text-red-500">*</span>
          </label>
          <input
            id="interestRate"
            v-model="form.interestRate"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="12.50"
          />
        </div>

        <!-- Cuota mensual -->
        <div>
          <label for="monthlyPayment" class="block text-sm font-medium text-gray-700">
            Cuota mensual <span class="text-red-500">*</span>
          </label>
          <input
            id="monthlyPayment"
            v-model="form.monthlyPayment"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Fecha de inicio -->
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700">
            Fecha de inicio <span class="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            v-model="form.startDate"
            type="date"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Fecha estimada de finalización -->
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700">
            Fecha estimada de finalización
          </label>
          <input
            id="endDate"
            v-model="form.endDate"
            type="date"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Info panel -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div class="flex items-start">
          <svg
            class="mr-3 h-5 w-5 flex-shrink-0 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="text-sm text-blue-800">
            <p class="font-medium">Información importante</p>
            <p class="mt-1">
              El monto pendiente se actualizará automáticamente al registrar pagos. La tasa de
              interés es anual y se usa para el seguimiento de intereses pagados.
            </p>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSave" :loading="saving" variant="primary">
          {{ debt ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
