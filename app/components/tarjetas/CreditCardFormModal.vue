<script setup lang="ts">
import type { CreditCard } from '#types/tarjeta'

const props = defineProps<{
  card?: CreditCard | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: []
}>()

const saving = ref(false)
const showFeeTable = ref(false)

// Cuota counts offered in the fee table
const CUOTA_OPTIONS = [2, 3, 4, 5, 6, 9, 12, 18, 24]

const form = reactive({
  name: '',
  bank: '',
  lastDigits: '',
  creditLimit: 0,
  billingDay: 1,
  paymentDay: 1,
  interestRate: '' as string | number,
  isActive: true,
})

// Fee table: cuota count → total interest % over principal
const feeTable = reactive<Record<number, string>>(
  Object.fromEntries(CUOTA_OPTIONS.map((n) => [n, ''])),
)

const resetForm = () => {
  form.name = ''
  form.bank = ''
  form.lastDigits = ''
  form.creditLimit = 0
  form.billingDay = 1
  form.paymentDay = 1
  form.interestRate = ''
  form.isActive = true
  showFeeTable.value = false
  CUOTA_OPTIONS.forEach((n) => { feeTable[n] = '' })
}

const populateFromCard = (card: CreditCard) => {
  form.name = card.name
  form.bank = card.bank
  form.lastDigits = card.lastDigits
  form.creditLimit = card.creditLimit
  form.billingDay = card.billingDay
  form.paymentDay = card.paymentDay
  form.interestRate = card.interestRate ?? ''
  form.isActive = card.isActive
  // Populate fee table
  CUOTA_OPTIONS.forEach((n) => {
    const fee = card.installmentFees?.[String(n)]
    feeTable[n] = fee == null ? '' : String(fee)
  })
  showFeeTable.value = Object.values(card.installmentFees ?? {}).some((v) => v > 0)
}


watch(() => props.card, (c) => c ? populateFromCard(c) : resetForm(), { immediate: true })
watch(() => props.show, (open) => {
  if (open) props.card ? populateFromCard(props.card) : resetForm()
})

// Preview: for each cuota with a fee, show what S/. 1000 would cost
const feePreview = computed(() =>
  CUOTA_OPTIONS.map((n) => {
    const pct = Number.parseFloat(String(feeTable[n]))
    if (!pct || pct <= 0) return null
    const totalInterest = 1000 * pct / 100
    const monthly = (1000 + totalInterest) / n
    return { n, monthly, totalInterest }
  })
)

const handleSave = async () => {
  saving.value = true

  // Build installmentFees — only include rows with a valid positive value
  const installmentFees: Record<string, number> = {}
  CUOTA_OPTIONS.forEach((n) => {
    const v = Number.parseFloat(String(feeTable[n]))
    if (v > 0) installmentFees[String(n)] = v
  })

  const dataToSend = {
    name: form.name,
    bank: form.bank,
    lastDigits: form.lastDigits,
    creditLimit: Number(form.creditLimit),
    billingDay: Number(form.billingDay),
    paymentDay: Number(form.paymentDay),
    interestRate: form.interestRate === '' ? undefined : Number(form.interestRate),
    installmentFees: Object.keys(installmentFees).length > 0 ? installmentFees : null,
    isActive: form.isActive,
  }

  try {
    if (props.card?.id) {
      await $fetch(`/api/credit-cards/${props.card.id}`, { method: 'PUT', body: dataToSend })
    } else {
      await $fetch('/api/credit-cards', { method: 'POST', body: dataToSend })
    }
    emit('save')
    emit('update:show', false)
    setTimeout(() => resetForm(), 300)
  } catch {
    useToast().error('Error al guardar la tarjeta')
  } finally {
    saving.value = false
  }
}

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="emit('update:show', false)"
    :title="card ? 'Editar Tarjeta' : 'Nueva Tarjeta'"
    size="lg"
  >
    <form @submit.prevent="handleSave" class="space-y-4">

      <!-- Nombre + Banco -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label for="cc-name" class="block text-sm font-medium text-gray-700">Nombre <span class="text-red-500">*</span></label>
          <input id="cc-name" v-model="form.name" type="text" required :class="inputClass" placeholder="Ej: CMR Falabella" />
        </div>
        <div>
          <label for="cc-bank" class="block text-sm font-medium text-gray-700">Banco <span class="text-red-500">*</span></label>
          <input id="cc-bank" v-model="form.bank" type="text" required :class="inputClass" placeholder="Ej: Banco Falabella" />
        </div>
      </div>

      <!-- Últimos dígitos + Límite -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label for="cc-digits" class="block text-sm font-medium text-gray-700">Últimos 4 dígitos <span class="text-red-500">*</span></label>
          <input id="cc-digits" v-model="form.lastDigits" type="text" required maxlength="4" pattern="[0-9]{4}" :class="inputClass" placeholder="1234" />
        </div>
        <div>
          <label for="cc-limit" class="block text-sm font-medium text-gray-700">Límite de crédito <span class="text-red-500">*</span></label>
          <input id="cc-limit" v-model="form.creditLimit" type="number" required min="0" step="0.01" :class="inputClass" placeholder="0.00" />
        </div>
      </div>

      <!-- Días de corte / pago / TEA -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label for="cc-billing-day" class="block text-sm font-medium text-gray-700">Día de corte <span class="text-red-500">*</span></label>
          <input id="cc-billing-day" v-model="form.billingDay" type="number" required min="1" max="31" :class="inputClass" />
        </div>
        <div>
          <label for="cc-payment-day" class="block text-sm font-medium text-gray-700">Día de pago <span class="text-red-500">*</span></label>
          <input id="cc-payment-day" v-model="form.paymentDay" type="number" required min="1" max="31" :class="inputClass" />
        </div>
        <div>
          <label for="cc-tea" class="block text-sm font-medium text-gray-700">TEA (%)</label>
          <input id="cc-tea" v-model="form.interestRate" type="number" min="0" max="1000" step="0.01" :class="inputClass" placeholder="Ej: 120" />
          <p class="mt-1 text-[10px] text-gray-400">Tasa Efectiva Anual — solo si no usas tabla de cuotas</p>
        </div>
      </div>

      <!-- Tabla de costos por cuotas (opcional) -->
      <div class="rounded-xl border border-gray-200 bg-gray-50">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
          @click="showFeeTable = !showFeeTable"
        >
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Tabla de costos por cuotas</span>
            <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Recomendado</span>
          </div>
          <svg
            class="h-4 w-4 text-gray-400 transition-transform"
            :class="showFeeTable ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showFeeTable" class="border-t border-gray-200 px-4 pb-4 pt-3">
          <p class="mb-3 text-xs text-gray-500">
            Ingresa el <strong>% de interés total sobre el capital</strong> para cada número de cuotas.
            Cópialo directamente de la calculadora de tu banco.<br/>
            Ejemplo: si 6 cuotas sobre S/. 1,000 suman S/. 1,295.95 → ingresa <strong>29.595</strong>
          </p>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(preview, i) in feePreview"
              :key="CUOTA_OPTIONS[i]"
              class="rounded-xl border border-gray-200 bg-white p-3"
            >
              <div class="flex items-center gap-2">
                <span class="shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                  {{ CUOTA_OPTIONS[i] }} cuotas
                </span>
                <div class="relative flex-1">
                  <input
                    v-model="feeTable[CUOTA_OPTIONS[i]]"
                    type="number"
                    min="0"
                    max="500"
                    step="0.001"
                    placeholder="0.000"
                    class="w-full rounded-lg border border-gray-200 py-1.5 pl-3 pr-7 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>

              <!-- Preview para S/. 1000 -->
              <div v-if="preview" class="mt-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700">
                Por c/S./ 1,000:
                <span class="font-semibold">S/. {{ preview.monthly.toFixed(2) }}/mes</span>
                · interés
                <span class="font-semibold">S/. {{ preview.totalInterest.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado activo -->
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
        />
        Tarjeta activa
      </label>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('update:show', false)"
          class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="saving"
          class="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {{ card ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>
