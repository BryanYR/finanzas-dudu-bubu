<script setup lang="ts">
import type { Expense } from '#types/gasto'

const props = defineProps<{
  show: boolean
  expense: Expense | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const toast = useToast()
const $authFetch = useAuthFetch()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

const saving = ref(false)
const months = ref<string[]>([])
const selectedMonth = ref('')

const monthLabel = (ym: string) => dayjs(`${ym}-01`).format('MMM YYYY')

const defaultMonth = () => dayjs().add(1, 'month').format('YYYY-MM')

watch(
  () => props.show,
  (isShowing) => {
    if (isShowing) {
      months.value = [...(props.expense?.skippedMonths ?? [])].sort()
      selectedMonth.value = defaultMonth()
    }
  },
  { immediate: true }
)

const canAdd = computed(
  () => /^\d{4}-\d{2}$/.test(selectedMonth.value) && !months.value.includes(selectedMonth.value)
)

const addMonth = () => {
  if (!canAdd.value) return
  months.value = [...months.value, selectedMonth.value].sort()
}

const removeMonth = (ym: string) => {
  months.value = months.value.filter((m) => m !== ym)
}

const handleSave = async () => {
  if (!props.expense) return
  saving.value = true
  try {
    await $authFetch(`/api/expenses/${props.expense.id}/skipped-months`, {
      method: 'PUT',
      body: { skippedMonths: months.value },
    })
    toast.success('Meses omitidos actualizados')
    emit('save')
    emit('update:show', false)
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al guardar los meses omitidos'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', $event)"
    title="Omitir mes"
    size="md"
  >
    <div class="space-y-4">
      <div class="rounded-lg bg-orange-50 p-4">
        <p class="text-sm font-medium text-orange-800">{{ expense?.description }}</p>
        <p class="mt-1 text-xs text-orange-600">
          Los meses omitidos no se cobran ni se acumulan en la proyección.
        </p>
      </div>

      <div>
        <label for="skip-month" class="block text-sm font-medium text-gray-700">Mes a omitir</label>
        <div class="mt-1 flex gap-2">
          <input
            id="skip-month"
            v-model="selectedMonth"
            type="month"
            class="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            @keydown.enter.prevent="addMonth"
          />
          <UiButton variant="outline" :disabled="!canAdd" @click="addMonth">Agregar</UiButton>
        </div>
      </div>

      <div>
        <p class="text-sm font-medium text-gray-700">Meses omitidos</p>
        <p v-if="months.length === 0" class="mt-1 text-sm text-gray-400">Ningún mes omitido.</p>
        <ul v-else class="mt-2 flex flex-wrap gap-2">
          <li
            v-for="m in months"
            :key="m"
            class="flex items-center gap-1 rounded-full bg-orange-100 py-1 pl-3 pr-1.5 text-sm font-medium text-orange-700"
          >
            <span class="capitalize">{{ monthLabel(m) }}</span>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full hover:bg-orange-200"
              :aria-label="`Quitar ${monthLabel(m)}`"
              @click="removeMonth(m)"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton variant="outline" @click="emit('update:show', false)">Cancelar</UiButton>
        <UiButton variant="primary" :loading="saving" @click="handleSave">Guardar</UiButton>
      </div>
    </template>
  </UiModal>
</template>
