<script setup lang="ts">
import type { BudgetProjection } from '#types/proyecciones'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import CalendarIcon from '@components/icons/dashboard/CalendarIcon.vue'

interface Props {
  projection: BudgetProjection
  completing?: boolean
  deleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  completing: false,
  deleting: false,
})

const emit = defineEmits<{
  complete: [id: number]
  delete: [id: number]
}>()

const { formatDate, formatCurrency } = useDateFormatter()

// El badge de estado se deriva client-side de las columnas guardadas
// (creditUsage/debitUsage/savingsImpact): el backend no persiste
// status/warnings para proyecciones ya guardadas, solo en el preview de
// /api/budgets/calculate.
const derivedStatus = computed<'sin_deuda' | 'ajustado' | 'riesgo_deuda'>(() => {
  if (props.projection.creditUsage === 0) return 'sin_deuda'
  if (props.projection.savingsImpact > 0) return 'riesgo_deuda'
  return 'ajustado'
})

const statusLabel = computed(() => {
  switch (derivedStatus.value) {
    case 'sin_deuda':
      return 'Sin deuda'
    case 'riesgo_deuda':
      return 'Riesgo'
    default:
      return 'Ajustado'
  }
})

const statusColor = computed(() => {
  switch (derivedStatus.value) {
    case 'sin_deuda':
      return 'bg-green-100 text-green-700'
    case 'riesgo_deuda':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
  >
    <div
      v-if="projection.isCompleted"
      class="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white"
    >
      <CheckCircleIcon custom-class="h-3.5 w-3.5" />
      Completada
    </div>

    <div class="p-6">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-xl font-bold text-gray-900">{{ projection.name }}</h3>
        <span
          v-if="!projection.isCompleted"
          :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor]"
        >
          {{ statusLabel }}
        </span>
      </div>

      <p v-if="projection.description" class="mt-1 text-sm text-gray-600">
        {{ projection.description }}
      </p>

      <div class="mt-3 flex items-center gap-1 text-xs text-gray-500">
        <CalendarIcon custom-class="h-4 w-4" />
        <span>{{ formatDate(projection.startDate) }} — {{ formatDate(projection.endDate) }}</span>
      </div>

      <div class="mt-4 rounded-lg bg-gray-50 p-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">Presupuesto total</span>
          <span class="font-bold text-gray-900">{{ formatCurrency(projection.totalBudget) }}</span>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-gray-500">Sugerido en débito</p>
          <p class="font-semibold text-teal-600">{{ formatCurrency(projection.debitUsage) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Sugerido en crédito</p>
          <p class="font-semibold text-red-600">{{ formatCurrency(projection.creditUsage) }}</p>
        </div>
      </div>

      <div class="mt-6 flex gap-2">
        <UiButton
          v-if="!projection.isCompleted"
          @click="emit('complete', projection.id)"
          variant="success"
          size="sm"
          :loading="completing"
          full-width
        >
          Marcar completada
        </UiButton>
        <UiButton
          @click="emit('delete', projection.id)"
          variant="danger"
          size="sm"
          :icon="DeleteIcon"
          :loading="deleting"
          title="Eliminar"
        />
      </div>
    </div>
  </div>
</template>
