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
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  deadline: '' as string | undefined,
})

const resetForm = () => {
  form.name = ''
  form.targetAmount = 0
  form.currentAmount = 0
  form.deadline = ''
}

// Watch goal prop to populate form
watch(
  () => props.goal,
  (newGoal) => {
    if (newGoal) {
      form.name = newGoal.name
      form.targetAmount = newGoal.targetAmount
      form.currentAmount = newGoal.currentAmount
      form.deadline = newGoal.deadline ? newGoal.deadline.split('T')[0] : ''
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  if (!form.name || form.targetAmount <= 0) {
    alert('Por favor completa todos los campos requeridos')
    return
  }

  saving.value = true

  const $authFetch = useAuthFetch()

  const dataToSend = {
    name: form.name,
    targetAmount: Number(form.targetAmount),
    currentAmount: Number(form.currentAmount),
    deadline: form.deadline ? toISOString(form.deadline) : null,
  }

  try {
    if (props.goal?.id) {
      await $authFetch(`/api/savings/${props.goal.id}`, {
        method: 'PUT',
        body: { ...dataToSend, isCompleted: props.goal.isCompleted },
      })
    } else {
      await $authFetch('/api/savings', {
        method: 'POST',
        body: dataToSend,
      })
    }

    emit('update:show', false)
    emit('save')
    resetForm()
  } catch (err) {
    console.error('Error al guardar:', err)
    alert('Error al guardar la meta de ahorro')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', $event)"
    :title="goal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'"
    size="md"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Nombre de la meta *</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          placeholder="Ej: Viaje a Europa"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Monto objetivo *</label>
          <input
            v-model="form.targetAmount"
            type="number"
            step="0.01"
            required
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Monto inicial</label>
          <input
            v-model="form.currentAmount"
            type="number"
            step="0.01"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Fecha límite (opcional)</label>
        <input
          v-model="form.deadline"
          type="date"
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSubmit" :loading="saving" variant="primary">
          {{ goal ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
