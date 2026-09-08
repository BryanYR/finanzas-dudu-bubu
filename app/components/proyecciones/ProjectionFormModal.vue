<script setup lang="ts">
import type { ProjectionCalculation } from '#types/proyecciones'
import WarningIcon from '@components/icons/common/WarningIcon.vue'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'

interface Props {
  show: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const { toISOString, formatCurrency } = useDateFormatter()

const step = ref<1 | 2>(1)
const calculating = ref(false)
const saving = ref(false)
const calculation = ref<ProjectionCalculation | null>(null)

const form = reactive({
  name: '',
  totalBudget: 0,
  startDate: '',
  endDate: '',
  description: '',
})

const resetForm = () => {
  form.name = ''
  form.totalBudget = 0
  form.startDate = ''
  form.endDate = ''
  form.description = ''
  step.value = 1
  calculation.value = null
}

const close = () => {
  emit('update:show', false)
  resetForm()
}

const handleCalculate = async () => {
  if (!form.name || form.totalBudget <= 0 || !form.startDate || !form.endDate) {
    alert('Por favor completa todos los campos requeridos')
    return
  }

  if (new Date(form.endDate) <= new Date(form.startDate)) {
    alert('La fecha de fin debe ser posterior a la fecha de inicio')
    return
  }

  calculating.value = true
  const $authFetch = useAuthFetch()

  try {
    calculation.value = await $authFetch<ProjectionCalculation>('/api/budgets/calculate', {
      method: 'POST',
      body: {
        name: form.name,
        totalBudget: Number(form.totalBudget),
        startDate: toISOString(form.startDate),
        endDate: toISOString(form.endDate),
        description: form.description || null,
      },
    })
    step.value = 2
  } catch (err) {
    console.error('Error al calcular la proyección:', err)
    alert('Error al calcular la proyección')
  } finally {
    calculating.value = false
  }
}

const handleSave = async () => {
  if (!calculation.value) return

  saving.value = true
  const $authFetch = useAuthFetch()

  try {
    await $authFetch('/api/budgets', {
      method: 'POST',
      body: {
        name: calculation.value.input.name,
        totalBudget: calculation.value.input.totalBudget,
        startDate: calculation.value.input.startDate,
        endDate: calculation.value.input.endDate,
        description: calculation.value.input.description,
        expectedIncome: calculation.value.expectedIncome,
        fixedExpenses: calculation.value.fixedExpenses,
        debtPayments: calculation.value.debtPayments,
        availableAmount: calculation.value.availableAmount,
        debitUsage: calculation.value.debitUsage,
        creditUsage: calculation.value.creditUsage,
        savingsImpact: calculation.value.savingsImpact,
      },
    })

    emit('save')
    close()
  } catch (err) {
    console.error('Error al guardar la proyección:', err)
    alert('Error al guardar la proyección')
  } finally {
    saving.value = false
  }
}

const statusBanner = computed(() => {
  switch (calculation.value?.status) {
    case 'sin_deuda':
      return {
        classes: 'border-green-200 bg-green-50 text-green-800',
        icon: CheckCircleIcon,
        iconClass: 'text-green-500 w-10 h-10',
        title: 'Sin deuda',
        message: 'Puedes cubrir este presupuesto completo con tu saldo disponible.',
      }
    case 'ajustado':
      return {
        classes: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        icon: WarningIcon,
        iconClass: 'text-yellow-500 w-10 h-10',
        title: 'Ajustado',
        message: 'Necesitarás usar crédito, pero tienes espacio suficiente en tus tarjetas.',
      }
    case 'riesgo_deuda':
      return {
        classes: 'border-red-200 bg-red-50 text-red-800',
        icon: WarningIcon,
        iconClass: 'text-red-500 w-10 h-10',
        title: 'Riesgo de sobreendeudamiento',
        message:
          'Tus tarjetas están cerca del límite o no alcanzan para cubrir el crédito sugerido.',
      }
    default:
      return null
  }
})
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="
      (value) => {
        emit('update:show', value)
        if (!value) resetForm()
      }
    "
    :title="step === 1 ? 'Nueva Proyección' : 'Vista Previa de la Proyección'"
    size="lg"
  >
    <!-- Paso 1: formulario -->
    <form v-if="step === 1" @submit.prevent="handleCalculate" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Nombre de la proyección *</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="Ej: Viaje a Lima"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha de inicio *</label>
          <input
            v-model="form.startDate"
            type="date"
            required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha de fin *</label>
          <input
            v-model="form.endDate"
            type="date"
            required
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Presupuesto total *</label>
        <input
          v-model="form.totalBudget"
          type="number"
          step="0.01"
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="0.00"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
        <textarea
          v-model="form.description"
          rows="2"
          class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="Detalles adicionales de la proyección"
        />
      </div>
    </form>

    <!-- Paso 2: previsualización -->
    <div v-else-if="calculation" class="space-y-6">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Saldo actual</p>
          <p class="mt-1 text-lg font-bold text-blue-600">
            {{ formatCurrency(calculation.currentBalance) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Ingresos esperados</p>
          <p class="mt-1 text-lg font-bold text-green-600">
            {{ formatCurrency(calculation.expectedIncome) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Gastos fijos + cuotas</p>
          <p class="mt-1 text-lg font-bold text-orange-600">
            {{ formatCurrency(calculation.fixedExpenses + calculation.debtPayments) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Disponible</p>
          <p class="mt-1 text-lg font-bold text-purple-600">
            {{ formatCurrency(calculation.availableAmount) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Sugerido en débito</p>
          <p class="mt-1 text-lg font-bold text-teal-600">
            {{ formatCurrency(calculation.debitUsage) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p class="text-xs font-medium text-gray-600">Sugerido en crédito</p>
          <p class="mt-1 text-lg font-bold text-red-600">
            {{ formatCurrency(calculation.creditUsage) }}
          </p>
        </div>
      </div>

      <!-- Advertencias -->
      <div
        v-if="calculation.warnings.length > 0"
        class="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <WarningIcon custom-class="text-yellow-400" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Advertencias</h3>
            <ul class="mt-2 space-y-1 text-sm text-yellow-700">
              <li
                v-for="(warning, idx) in calculation.warnings"
                :key="idx"
                class="flex items-start"
              >
                <span class="mr-2 mt-0.5">•</span>
                <span>{{ warning }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Veredicto -->
      <div v-if="statusBanner" :class="['rounded-lg border p-4', statusBanner.classes]">
        <div class="flex items-start">
          <component :is="statusBanner.icon" :custom-class="statusBanner.iconClass" />
          <div class="ml-3">
            <h3 class="text-sm font-bold">{{ statusBanner.title }}</h3>
            <p class="mt-1 text-sm">{{ statusBanner.message }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <template v-if="step === 1">
          <UiButton @click="close" variant="outline">Cancelar</UiButton>
          <UiButton @click="handleCalculate" :loading="calculating" variant="primary">
            Calcular
          </UiButton>
        </template>
        <template v-else>
          <UiButton @click="step = 1" variant="outline">Volver</UiButton>
          <UiButton @click="handleSave" :loading="saving" variant="primary">
            Guardar proyección
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>
