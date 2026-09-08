<script setup lang="ts">
import type { SavingsGoal } from '#types/ahorro'

const props = defineProps<{
  show: boolean
  goal?: SavingsGoal | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const saving = ref(false)
const { today, toISOString } = useDateFormatter()

const form = reactive({
  amount: 0,
  date: today(),
  notes: '',
})

const resetForm = () => {
  form.amount = 0
  form.date = today()
  form.notes = ''
}

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      resetForm()
    }
  }
)

const remaining = computed(() => {
  if (!props.goal) return 0
  return Math.max(0, props.goal.targetAmount - props.goal.currentAmount)
})

const handleSubmit = async () => {
  if (!props.goal || form.amount <= 0) {
    useToast().warning('Por favor ingresa un monto válido')
    return
  }

  saving.value = true

  const $authFetch = useAuthFetch()

  try {
    await $authFetch(`/api/savings/${props.goal.id}/contribute`, {
      method: 'POST',
      body: {
        amount: Number(form.amount),
        date: toISOString(form.date),
        notes: form.notes || undefined,
      },
    })

    emit('update:show', false)
    emit('save')
    resetForm()
  } catch (err) {
    console.error('Error al guardar:', err)
    useToast().error('Error al registrar la contribución')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', $event)"
    title="Agregar Contribución"
    size="md"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="rounded-lg bg-blue-50 p-4">
        <p class="text-sm font-medium text-blue-800">{{ goal?.name }}</p>
        <p class="mt-1 text-xs text-blue-600">
          Faltan
          <span class="font-semibold"
            >S/ {{ remaining.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span
          >
          para alcanzar tu meta
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Monto a aportar *</label>
        <input
          v-model="form.amount"
          type="number"
          step="0.01"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="0.00"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Fecha *</label>
        <input
          v-model="form.date"
          type="date"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Notas (opcional)</label>
        <textarea
          v-model="form.notes"
          rows="3"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="Descripción de la contribución"
        ></textarea>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSubmit" :loading="saving" variant="primary">
          Agregar Contribución
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
