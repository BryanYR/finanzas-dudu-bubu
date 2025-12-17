<script setup lang="ts">
interface Debt {
  id: number
  name: string
  creditor: string
  remainingAmount: number
  monthlyPayment: number
  interestRate: number
  totalPayments?: number
}

const props = defineProps<{
  debt: Debt | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const saving = ref(false)

const form = reactive({
  amount: 0,
  principal: 0,
  interest: 0,
  insurance: 0,
  date: new Date().toISOString().split('T')[0],
  paymentNumber: 1,
  notes: '',
})

const resetForm = () => {
  manualEdit.value = false
  form.amount = props.debt?.monthlyPayment || 0
  form.principal = 0
  form.interest = 0
  form.insurance = 0
  form.date = new Date().toISOString().split('T')[0]
  form.paymentNumber = (props.debt?.totalPayments || 0) + 1
  form.notes = ''
  calculateSplit()
}

// Watch debt prop to populate form
watch(
  () => props.debt,
  (newDebt) => {
    if (newDebt) {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch show prop
watch(
  () => props.show,
  (isShowing) => {
    if (isShowing && props.debt) {
      resetForm()
    }
  }
)

// Auto-calculate interest and principal split using French amortization system
const calculateSplit = () => {
  if (!props.debt) return

  // Calculate monthly interest rate from annual rate
  // Using effective rate formula: (1 + annual)^(1/12) - 1
  const annualRate = props.debt.interestRate / 100
  const monthlyInterestRate = Math.pow(1 + annualRate, 1 / 12) - 1

  // Calculate interest for this period
  const calculatedInterest = props.debt.remainingAmount * monthlyInterestRate

  form.interest = Number(calculatedInterest.toFixed(2))
  // Principal is what remains after deducting interest and insurance
  form.principal = Number((form.amount - form.interest - form.insurance).toFixed(2))
}

// Auto-recalculate only when amount or insurance changes
// But allow manual editing of interest and principal
const manualEdit = ref(false)

watch([() => form.amount, () => form.insurance], () => {
  if (!manualEdit.value) {
    calculateSplit()
  }
})

// Recalculate principal when interest is manually edited
watch(
  () => form.interest,
  () => {
    form.principal = Number((form.amount - form.interest - form.insurance).toFixed(2))
    manualEdit.value = true
  }
)

// Recalculate principal when insurance changes (if in manual mode or always)
watch(
  () => form.insurance,
  () => {
    form.principal = Number((form.amount - form.interest - form.insurance).toFixed(2))
  }
)

const handleSave = async () => {
  if (!props.debt) return

  if (form.amount <= 0) {
    alert('El monto del pago debe ser mayor a 0')
    return
  }

  if (form.principal < 0) {
    alert('El monto del pago no cubre los intereses generados')
    return
  }

  saving.value = true

  const dataToSend = {
    amount: Number(form.amount),
    principal: Number(form.principal),
    interest: Number(form.interest),
    insurance: Number(form.insurance),
    date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    paymentNumber: form.paymentNumber,
    notes: form.notes || undefined,
  }

  try {
    await $fetch(`/api/debts/${props.debt.id}/pay`, {
      method: 'POST',
      body: dataToSend,
    })
    emit('save')
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al registrar pago:', err)
    alert('Error al registrar el pago')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    title="Registrar Pago de Deuda"
    size="xl"
  >
    <form v-if="debt" @submit.prevent="handleSave" class="space-y-4">
      <!-- Info de la deuda - Full width -->
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 class="font-semibold text-gray-900">{{ debt.name }}</h3>
        <p class="text-sm text-gray-600">{{ debt.creditor }}</p>
        <div class="mt-2 flex items-center justify-between text-sm">
          <span class="text-gray-600">Saldo pendiente:</span>
          <span class="font-semibold text-red-600">
            {{
              new Intl.NumberFormat('es-EC', {
                style: 'currency',
                currency: 'USD',
              }).format(debt.remainingAmount)
            }}
          </span>
        </div>
      </div>

      <!-- Grid de 2 columnas -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Columna izquierda: Datos del pago -->
        <div class="space-y-4">
          <!-- Monto del pago -->
          <div>
            <label for="amount" class="block text-sm font-medium text-gray-700">
              Monto del pago <span class="text-red-500">*</span>
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
            <p class="mt-1 text-xs text-gray-500">
              Cuota sugerida:
              {{
                new Intl.NumberFormat('es-EC', {
                  style: 'currency',
                  currency: 'USD',
                }).format(debt.monthlyPayment)
              }}
            </p>
          </div>

          <!-- Seguro de desgravamen -->
          <div>
            <label for="insurance" class="block text-sm font-medium text-gray-700">
              Seguro de desgravamen
            </label>
            <input
              id="insurance"
              v-model="form.insurance"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
            <p class="mt-1 text-xs text-gray-500">
              Seguro que cubre la deuda en caso de fallecimiento
            </p>
          </div>

          <!-- Fecha del pago -->
          <div>
            <label for="date" class="block text-sm font-medium text-gray-700">
              Fecha del pago <span class="text-red-500">*</span>
            </label>
            <input
              id="date"
              v-model="form.date"
              type="date"
              required
              class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Número de cuota -->
          <div>
            <label for="paymentNumber" class="block text-sm font-medium text-gray-700">
              Número de cuota <span class="text-red-500">*</span>
            </label>
            <input
              id="paymentNumber"
              v-model="form.paymentNumber"
              type="number"
              required
              min="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <!-- Columna derecha: División del pago -->
        <div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-blue-900">División del pago</h4>
              <button
                type="button"
                @click="((manualEdit = false), calculateSplit())"
                class="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Recalcular
              </button>
            </div>
            <div class="space-y-3">
              <!-- Intereses editable -->
              <div>
                <label for="interest" class="block text-xs font-medium text-blue-800">
                  Intereses <span class="text-red-500">*</span>
                </label>
                <input
                  id="interest"
                  v-model="form.interest"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  class="mt-1 w-full rounded border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <!-- Capital (calculado pero mostrado) -->
              <div>
                <label class="block text-xs font-medium text-blue-800">Capital (Principal)</label>
                <div
                  class="mt-1 w-full rounded border border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900"
                >
                  {{
                    new Intl.NumberFormat('es-EC', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(form.principal)
                  }}
                </div>
                <p class="mt-1 text-xs text-blue-600">Calculado: Monto - Interés - Seguro</p>
              </div>
              <!-- Resumen -->
              <div class="border-t border-blue-300 pt-3">
                <div class="space-y-1 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-blue-800">Capital:</span>
                    <span class="font-semibold text-green-700">
                      {{
                        new Intl.NumberFormat('es-EC', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(form.principal)
                      }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-blue-800">Interés:</span>
                    <span class="font-semibold text-orange-700">
                      {{
                        new Intl.NumberFormat('es-EC', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(form.interest)
                      }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-blue-800">Seguro:</span>
                    <span class="font-semibold text-purple-700">
                      {{
                        new Intl.NumberFormat('es-EC', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(form.insurance)
                      }}
                    </span>
                  </div>
                  <div class="border-t border-blue-300 pt-2">
                    <div class="flex items-center justify-between">
                      <span class="font-medium text-blue-900">Total:</span>
                      <span class="text-lg font-bold text-blue-900">
                        {{
                          new Intl.NumberFormat('es-EC', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(form.amount)
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p class="mt-3 text-xs text-blue-700">
              💡 Puedes editar el interés manualmente según tu estado de cuenta (BCP usa tasa
              compensatoria)
            </p>
          </div>
        </div>
      </div>

      <!-- Notas - Full width -->
      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700"> Notas </label>
        <textarea
          id="notes"
          v-model="form.notes"
          rows="2"
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Notas adicionales (opcional)"
        ></textarea>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="emit('update:show', false)" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSave" :loading="saving" variant="success">
          Registrar Pago
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
