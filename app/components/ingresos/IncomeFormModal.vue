<script setup lang="ts">
interface Category {
  id: number
  name: string
  type: string
}

interface Income {
  id?: number
  amount: number
  description: string
  date: string
  isRecurring: boolean
  frequency?: string
  categoryId: number
  notes?: string
}

const props = defineProps<{
  income?: Income | null
  show: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [income: Income]
}>()

const saving = ref(false)

const form = reactive({
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
  isRecurring: false,
  frequency: '',
  categoryId: 0,
  notes: '',
})

const resetForm = () => {
  form.amount = 0
  form.description = ''
  form.date = new Date().toISOString().split('T')[0]
  form.isRecurring = false
  form.frequency = ''
  form.categoryId = 0
  form.notes = ''
}

// Watch income prop to populate form
watch(
  () => props.income,
  (newIncome) => {
    if (newIncome) {
      form.amount = newIncome.amount
      form.description = newIncome.description
      form.date = newIncome.date.split('T')[0]
      form.isRecurring = newIncome.isRecurring
      form.frequency = newIncome.frequency || ''
      form.categoryId = newIncome.categoryId
      form.notes = newIncome.notes || ''
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
    if (isShowing && !props.income) {
      resetForm()
    } else if (isShowing && props.income) {
      form.amount = props.income.amount
      form.description = props.income.description
      form.date = props.income.date.split('T')[0]
      form.isRecurring = props.income.isRecurring
      form.frequency = props.income.frequency || ''
      form.categoryId = props.income.categoryId
      form.notes = props.income.notes || ''
    }
  }
)

const handleSave = async () => {
  saving.value = true

  const dataToSend = {
    amount: Number(form.amount),
    description: form.description,
    date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    isRecurring: form.isRecurring,
    frequency: form.isRecurring && form.frequency ? form.frequency : undefined,
    categoryId: Number(form.categoryId),
    notes: form.notes || undefined,
  }

  try {
    if (props.income?.id) {
      await $fetch(`/api/incomes/${props.income.id}`, {
        method: 'PUT',
        body: dataToSend,
      })
    } else {
      await $fetch('/api/incomes', {
        method: 'POST',
        body: dataToSend,
      })
    }
    emit('save', dataToSend)
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al guardar ingreso:', err)
    alert('Error al guardar el ingreso')
  } finally {
    saving.value = false
  }
}

// Computed para categorías de ingresos
const incomeCategories = computed(() => {
  return props.categories.filter((cat) => cat.type === 'income')
})
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    :title="income ? 'Editar Ingreso' : 'Nuevo Ingreso'"
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
          placeholder="Ej: Sueldo de Diciembre"
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
          <option v-for="cat in incomeCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Ingreso recurrente -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div class="flex items-center">
          <input
            id="isRecurring"
            v-model="form.isRecurring"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
          />
          <label for="isRecurring" class="ml-2 block text-sm font-medium text-gray-700">
            Ingreso recurrente (fijo)
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
            Los ingresos recurrentes se usarán para proyecciones y reportes automáticos
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
          {{ income ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
