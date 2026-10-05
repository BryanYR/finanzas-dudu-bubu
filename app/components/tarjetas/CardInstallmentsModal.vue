<script setup lang="ts">
import type {
  CardInstallmentPlan,
  CardInstallmentPlanInput,
  CardInstallmentProjectionMonth,
  CardInstallmentsResponse,
  CreditCard,
} from '#types/tarjeta'

const props = defineProps<{
  show: boolean
  card: CreditCard | null
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { formatDate, formatCurrency } = useDateFormatter()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const $authFetch = useAuthFetch()
const toast = useToast()
const confirm = useConfirm()

const plans = ref<CardInstallmentPlan[]>([])
const projection = ref<CardInstallmentProjectionMonth[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)
const expandedMonths = ref<string[]>([])

const form = reactive({
  description: '',
  totalInstallments: '' as number | '',
  installmentAmount: '' as number | '',
  firstDueDate: '',
  principal: '' as number | '',
  interestRate: '' as number | '',
  notes: '',
  isActive: true,
})

const localShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const totalMonthly = computed(() => projection.value[0]?.total ?? 0)
const totalRemaining = computed(() => plans.value.reduce((sum, p) => sum + p.remainingAmount, 0))

const baseUrl = computed(() => `/api/credit-cards/${props.card?.id}/installment-plans`)

// Primer vencimiento sugerido: el próximo día de pago de la tarjeta
const suggestedFirstDueDate = () => {
  if (!props.card) return ''
  let next = dayjs().date(props.card.paymentDay)
  if (next.isBefore(dayjs(), 'day')) next = next.add(1, 'month')
  return next.format('YYYY-MM-DD')
}

const resetForm = () => {
  editingId.value = null
  form.description = ''
  form.totalInstallments = ''
  form.installmentAmount = ''
  form.firstDueDate = suggestedFirstDueDate()
  form.principal = ''
  form.interestRate = ''
  form.notes = ''
  form.isActive = true
  error.value = ''
}

const loadPlans = async () => {
  if (!props.card) return
  loading.value = true
  try {
    const data = await $authFetch<CardInstallmentsResponse>(baseUrl.value)
    plans.value = data.plans
    projection.value = data.projection
  } catch {
    error.value = 'Error al cargar los planes de cuotas'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (open) => {
    if (!open) return
    plans.value = []
    projection.value = []
    expandedMonths.value = []
    resetForm()
    await loadPlans()
  }
)

// Fecha local del día elegido a mediodía, para que el vencimiento no se corra de día por zona horaria
const toIsoNoon = (date: string) => dayjs(`${date}T12:00:00`).toISOString()

const startEdit = (plan: CardInstallmentPlan) => {
  editingId.value = plan.id
  form.description = plan.description
  form.totalInstallments = plan.totalInstallments
  form.installmentAmount = plan.installmentAmount
  form.firstDueDate = dayjs(plan.firstDueDate).format('YYYY-MM-DD')
  form.principal = plan.principal ?? ''
  form.interestRate = plan.interestRate ?? ''
  form.notes = plan.notes ?? ''
  form.isActive = plan.isActive
  error.value = ''
}

const submit = async () => {
  if (!props.card) return
  if (!form.description.trim()) return (error.value = 'Indica la descripción')
  const total = Number(form.totalInstallments)
  if (!Number.isInteger(total) || total < 1) {
    return (error.value = 'El número de cuotas debe ser un entero mayor a 0')
  }
  if (!form.installmentAmount || Number(form.installmentAmount) <= 0) {
    return (error.value = 'La cuota mensual debe ser mayor a 0')
  }
  if (!form.firstDueDate) return (error.value = 'Indica el vencimiento de la cuota 1')

  saving.value = true
  error.value = ''
  const body: CardInstallmentPlanInput = {
    description: form.description.trim(),
    totalInstallments: total,
    installmentAmount: Number(form.installmentAmount),
    firstDueDate: toIsoNoon(form.firstDueDate),
    principal: form.principal === '' ? null : Number(form.principal),
    interestRate: form.interestRate === '' ? null : Number(form.interestRate),
    notes: form.notes.trim() || null,
    isActive: form.isActive,
  }
  try {
    if (editingId.value) {
      await $authFetch(`${baseUrl.value}/${editingId.value}`, { method: 'PUT', body })
    } else {
      await $authFetch(baseUrl.value, { method: 'POST', body })
    }
    resetForm()
    await loadPlans()
  } catch (err) {
    error.value = getErrorMessage(err, 'Error al guardar el plan de cuotas')
  } finally {
    saving.value = false
  }
}

const removePlan = async (plan: CardInstallmentPlan) => {
  const ok = await confirm.confirm({
    title: 'Eliminar plan de cuotas',
    message: `¿Eliminar "${plan.description}"? Dejará de aparecer en la proyección.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  try {
    await $authFetch(`${baseUrl.value}/${plan.id}`, { method: 'DELETE' })
    if (editingId.value === plan.id) resetForm()
    await loadPlans()
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al eliminar el plan de cuotas'))
  }
}

const toggleMonth = (month: string) => {
  expandedMonths.value = expandedMonths.value.includes(month)
    ? expandedMonths.value.filter((m) => m !== month)
    : [...expandedMonths.value, month]
}

const monthLabel = (month: string) => dayjs(`${month}-01`).format('MMMM YYYY')

// Lo que el recibo cargado trae además de las cuotas: consumos al contado, seguros u otros
const otherAmount = (m: CardInstallmentProjectionMonth) =>
  m.statementAmount == null ? 0 : m.statementAmount - m.total

const inputClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
</script>

<template>
  <UiModal v-model="localShow" :title="`Cuotas - ${card?.name ?? ''}`" size="xl">
    <div class="space-y-5">
      <p class="text-xs text-gray-500">
        Registra las compras en cuotas, traslados de saldo y conversiones que ya tiene la tarjeta.
        La cuota actual y la proyección se calculan solas a partir del vencimiento de la cuota 1; la
        cuota N vence N-1 meses después. Esto no modifica los recibos: son solo una referencia de
        cuánto de cada recibo ya está comprometido.
      </p>

      <!-- Formulario -->
      <form
        @submit.prevent="submit"
        class="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 sm:grid-cols-2"
      >
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-700">Descripción *</label>
          <input
            v-model="form.description"
            type="text"
            required
            maxlength="200"
            placeholder="Ej: Falabella.com 14/06"
            :class="inputClass"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Número de cuotas *</label>
          <input
            v-model.number="form.totalInstallments"
            type="number"
            step="1"
            min="1"
            required
            placeholder="12"
            :class="inputClass"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Cuota mensual *</label>
          <input
            v-model.number="form.installmentAmount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            :class="inputClass"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-700">Vencimiento de la cuota 1 *</label>
          <input v-model="form.firstDueDate" type="date" required :class="inputClass" />
          <p class="mt-1 text-[11px] text-gray-400">
            Fecha de pago del recibo que trae la primera cuota.
          </p>
        </div>

        <details class="sm:col-span-2">
          <summary class="cursor-pointer text-xs font-medium text-gray-500">
            Datos opcionales
          </summary>
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700">Monto financiado</label>
              <input
                v-model.number="form.principal"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                :class="inputClass"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">TEA (%)</label>
              <input
                v-model.number="form.interestRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                :class="inputClass"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-700">Nota</label>
              <input v-model="form.notes" type="text" maxlength="500" :class="inputClass" />
            </div>
            <label class="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Plan activo
            </label>
          </div>
        </details>

        <div v-if="error" class="rounded-lg bg-red-50 p-2 text-xs text-red-700 sm:col-span-2">
          {{ error }}
        </div>
        <div class="flex justify-end gap-2 sm:col-span-2">
          <UiButton v-if="editingId" type="button" variant="outline" @click="resetForm">
            Cancelar
          </UiButton>
          <UiButton type="submit" variant="primary" :loading="saving">
            {{ editingId ? 'Guardar cambios' : 'Agregar plan' }}
          </UiButton>
        </div>
      </form>

      <div v-if="loading" class="flex justify-center py-6">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        ></div>
      </div>

      <template v-else>
        <!-- Planes en curso -->
        <div>
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Planes en curso
          </h4>
          <p v-if="!plans.length" class="text-sm text-gray-400">
            No hay planes de cuotas en curso.
          </p>
          <template v-else>
            <div class="mb-3 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-indigo-50 p-3">
                <p class="text-[11px] font-medium uppercase text-indigo-400">
                  Cuotas del próximo recibo
                </p>
                <p class="text-lg font-bold text-indigo-700">{{ formatCurrency(totalMonthly) }}</p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3">
                <p class="text-[11px] font-medium uppercase text-gray-400">Total restante</p>
                <p class="text-lg font-bold text-gray-700">{{ formatCurrency(totalRemaining) }}</p>
              </div>
            </div>

            <div class="overflow-x-auto rounded-lg border border-gray-200">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50 text-left text-xs uppercase text-gray-400">
                  <tr>
                    <th class="px-3 py-2 font-medium">Plan</th>
                    <th class="px-3 py-2 text-center font-medium">Cuota</th>
                    <th class="px-3 py-2 text-right font-medium">Monto</th>
                    <th class="px-3 py-2 font-medium">Termina</th>
                    <th class="px-3 py-2 text-right font-medium">Restante</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                  <tr
                    v-for="plan in plans"
                    :key="plan.id"
                    :class="{ 'bg-indigo-50/50': editingId === plan.id }"
                  >
                    <td class="px-3 py-2">
                      <p class="font-medium text-gray-900">
                        {{ plan.description }}
                        <span
                          v-if="!plan.isActive"
                          class="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500"
                        >
                          Inactivo
                        </span>
                      </p>
                      <p v-if="plan.notes" class="max-w-[220px] truncate text-xs text-gray-400">
                        {{ plan.notes }}
                      </p>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-center font-medium text-gray-700">
                      {{ plan.currentInstallment }}/{{ plan.totalInstallments }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                      {{ formatCurrency(plan.installmentAmount) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 capitalize text-gray-600">
                      {{ monthLabel(dayjs(plan.lastDueDate).format('YYYY-MM')) }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-right text-gray-600">
                      {{ formatCurrency(plan.remainingAmount) }}
                      <span class="block text-[11px] text-gray-400">
                        {{ plan.remainingInstallments }}
                        {{ plan.remainingInstallments === 1 ? 'cuota' : 'cuotas' }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-right text-xs">
                      <button
                        @click="startEdit(plan)"
                        class="rounded-lg px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        Editar
                      </button>
                      <button
                        @click="removePlan(plan)"
                        class="rounded-lg px-2 py-1 font-medium text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <!-- Proyección mes a mes -->
        <div v-if="projection.length">
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Proyección mensual
          </h4>
          <div class="space-y-2">
            <div
              v-for="m in projection"
              :key="m.month"
              class="rounded-lg border border-gray-200 bg-white"
            >
              <button
                type="button"
                @click="toggleMonth(m.month)"
                :aria-expanded="expandedMonths.includes(m.month)"
                class="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <div class="min-w-0">
                  <p class="font-semibold capitalize text-gray-900">{{ monthLabel(m.month) }}</p>
                  <p class="text-xs text-gray-400">
                    Vence {{ formatDate(m.dueDate) }} · {{ m.items.length }}
                    {{ m.items.length === 1 ? 'cuota' : 'cuotas' }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <div class="text-right">
                    <p class="font-semibold text-gray-900">{{ formatCurrency(m.total) }}</p>
                    <p class="text-[11px] text-gray-400">en cuotas</p>
                  </div>
                  <svg
                    class="h-4 w-4 text-gray-400 transition-transform"
                    :class="{ 'rotate-180': expandedMonths.includes(m.month) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              <div
                v-if="expandedMonths.includes(m.month)"
                class="space-y-1 border-t border-gray-100 px-3 py-2 text-sm"
              >
                <div
                  v-for="item in m.items"
                  :key="item.planId"
                  class="flex items-center justify-between gap-3"
                >
                  <span class="min-w-0 truncate text-gray-600">
                    {{ item.description }}
                    <span class="text-xs text-gray-400">
                      ({{ item.installmentNumber }}/{{ item.totalInstallments }})
                    </span>
                  </span>
                  <span class="shrink-0 text-gray-900">{{ formatCurrency(item.amount) }}</span>
                </div>
              </div>

              <div
                v-if="m.statementAmount != null"
                class="space-y-1 rounded-b-lg border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs"
              >
                <div class="flex justify-between">
                  <span class="font-medium text-gray-700">Recibo cargado</span>
                  <span class="font-semibold text-gray-900">
                    {{ formatCurrency(m.statementAmount) }}
                  </span>
                </div>
                <div class="flex justify-between text-gray-500">
                  <span>Consumos al contado y otros (estimado)</span>
                  <span>{{ formatCurrency(otherAmount(m)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UiButton @click="localShow = false" variant="outline">Cerrar</UiButton>
      </div>
    </template>
  </UiModal>
</template>
