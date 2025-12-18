<script setup lang="ts">
interface Category {
  id: number
  name: string
  type: string
}

interface CreditCard {
  id: number
  name: string
  bank: string
  lastDigits: string
  isActive?: boolean
}

interface Expense {
  id?: number
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  categoryId: number
  paymentMethod: string
  creditCardId?: number
  notes?: string
}

const props = defineProps<{
  expense?: Expense | null
  show: boolean
  categories: Category[]
  creditCards: CreditCard[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [expense: Expense]
}>()

const saving = ref(false)
const { toISOString, today } = useDateFormatter()

const form = reactive({
  amount: 0,
  description: '',
  date: today(),
  isRecurring: false,
  frequency: '',
  categoryId: 0,
  paymentMethod: 'cash',
  creditCardId: 0,
  notes: '',
})

const resetForm = () => {
  form.amount = 0
  form.description = ''
  form.date = today()
  form.isRecurring = false
  form.frequency = ''
  form.categoryId = 0
  form.paymentMethod = 'cash'
  form.creditCardId = 0
  form.notes = ''
}

// Watch expense prop to populate form
watch(
  () => props.expense,
  (newExpense) => {
    if (newExpense) {
      form.amount = newExpense.amount
      form.description = newExpense.description
      form.date = newExpense.date.split('T')[0]
      form.isRecurring = newExpense.isRecurring
      form.frequency = newExpense.frequency || ''
      form.categoryId = newExpense.categoryId
      form.paymentMethod = newExpense.paymentMethod
      form.creditCardId = newExpense.creditCardId || 0
      form.notes = newExpense.notes || ''
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
    if (isShowing && !props.expense) {
      resetForm()
    } else if (isShowing && props.expense) {
      form.amount = props.expense.amount
      form.description = props.expense.description
      form.date = props.expense.date.split('T')[0]
      form.isRecurring = props.expense.isRecurring
      form.frequency = props.expense.frequency || ''
      form.categoryId = props.expense.categoryId
      form.paymentMethod = props.expense.paymentMethod
      form.creditCardId = props.expense.creditCardId || 0
      form.notes = props.expense.notes || ''
    }
  }
)

// Watch payment method to reset credit card when not using credit
watch(
  () => form.paymentMethod,
  (newMethod) => {
    if (newMethod !== 'credit') {
      form.creditCardId = 0
    }
  }
)

const handleSave = async () => {
  saving.value = true

  const dataToSend = {
    amount: Number(form.amount),
    description: form.description,
    date: toISOString(form.date),
    isRecurring: form.isRecurring,
    frequency: form.isRecurring && form.frequency ? form.frequency : undefined,
    categoryId: Number(form.categoryId),
    paymentMethod: form.paymentMethod,
    creditCardId:
      form.paymentMethod === 'credit' && form.creditCardId ? Number(form.creditCardId) : undefined,
    notes: form.notes || undefined,
  }

  try {
    if (props.expense?.id) {
      await $fetch(`/api/expenses/${props.expense.id}`, {
        method: 'PUT',
        body: dataToSend,
      })
    } else {
      await $fetch('/api/expenses', {
        method: 'POST',
        body: dataToSend,
      })
    }
    emit('save', dataToSend)
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al guardar gasto:', err)
    alert('Error al guardar el gasto')
  } finally {
    saving.value = false
  }
}

// Computed para categorías de gastos
const expenseCategories = computed(() => {
  return props.categories.filter((cat) => cat.type === 'expense')
})

// Computed para tarjetas activas
const activeCreditCards = computed(() => {
  return props.creditCards.filter((card) => card.isActive !== false)
})
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    :title="expense ? 'Editar Gasto' : 'Nuevo Gasto'"
    size="lg"
  >
    <form @submit.prevent="handleSave" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Monto -->
        <div>
          <label for="amount" class="block text-sm font-medium text-gray-700">
            Monto <span class="text-red-500">*</span>
          </label>
          <input
            id="amount"
            v-model="form.amount"
            type="number"
            required
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <!-- Fecha -->
        <div>
          <label for="date" class="block text-sm font-medium text-gray-700">
            Fecha <span class="text-red-500">*</span>
          </label>
          <input
            id="date"
            v-model="form.date"
            type="date"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Descripción -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">
          Descripción <span class="text-red-500">*</span>
        </label>
        <input
          id="description"
          v-model="form.description"
          type="text"
          required
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Ej: Compra de supermercado"
        />
      </div>

      <!-- Categoría -->
      <div>
        <label for="categoryId" class="block text-sm font-medium text-gray-700">
          Categoría <span class="text-red-500">*</span>
        </label>
        <select
          id="categoryId"
          v-model="form.categoryId"
          required
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="0">Seleccionar...</option>
          <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Método de pago -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label class="mb-3 block text-sm font-medium text-gray-700">
          Método de pago <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-3 gap-3">
          <label
            :class="[
              'flex cursor-pointer flex-col items-center rounded-lg border-2 p-3 transition-all',
              form.paymentMethod === 'cash'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ]"
          >
            <input type="radio" v-model="form.paymentMethod" value="cash" class="sr-only" />
            <svg class="mb-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span class="text-xs font-medium">Efectivo</span>
          </label>

          <label
            :class="[
              'flex cursor-pointer flex-col items-center rounded-lg border-2 p-3 transition-all',
              form.paymentMethod === 'debit'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ]"
          >
            <input type="radio" v-model="form.paymentMethod" value="debit" class="sr-only" />
            <svg class="mb-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span class="text-xs font-medium">Débito</span>
          </label>

          <label
            :class="[
              'flex cursor-pointer flex-col items-center rounded-lg border-2 p-3 transition-all',
              form.paymentMethod === 'credit'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ]"
          >
            <input type="radio" v-model="form.paymentMethod" value="credit" class="sr-only" />
            <svg class="mb-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span class="text-xs font-medium">Crédito</span>
          </label>
        </div>

        <!-- Selector de tarjeta (solo si es crédito) -->
        <div v-if="form.paymentMethod === 'credit'" class="mt-3">
          <label for="creditCardId" class="mb-2 block text-sm font-medium text-gray-700">
            Tarjeta de crédito <span class="text-red-500">*</span>
          </label>
          <select
            id="creditCardId"
            v-model="form.creditCardId"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="0">Seleccionar tarjeta...</option>
            <option v-for="card in activeCreditCards" :key="card.id" :value="card.id">
              {{ card.name }} - {{ card.bank }} (••••{{ card.lastDigits }})
            </option>
          </select>
        </div>
      </div>

      <!-- Gasto recurrente -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div class="flex items-center">
          <input
            id="isRecurring"
            v-model="form.isRecurring"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
          />
          <label for="isRecurring" class="ml-2 block text-sm font-medium text-gray-700">
            Gasto recurrente (fijo)
          </label>
        </div>

        <!-- Frecuencia -->
        <div v-if="form.isRecurring" class="mt-3">
          <label for="frequency" class="block text-sm font-medium text-gray-700">
            Frecuencia <span class="text-red-500">*</span>
          </label>
          <select
            id="frequency"
            v-model="form.frequency"
            required
            class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar...</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
            <option value="annual">Anual</option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            Los gastos recurrentes se usarán para proyecciones y reportes automáticos
          </p>
        </div>
      </div>

      <!-- Notas -->
      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700"> Notas </label>
        <textarea
          id="notes"
          v-model="form.notes"
          rows="3"
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Información adicional..."
        ></textarea>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSave" :loading="saving" variant="primary">
          {{ expense ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
