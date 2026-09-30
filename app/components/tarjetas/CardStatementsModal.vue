<script setup lang="ts">
import type { CardBill, CreditCard } from '#types/tarjeta'

const props = defineProps<{
  show: boolean
  card: CreditCard | null
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  change: []
}>()

const { formatDate, formatCurrency } = useDateFormatter()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const $authFetch = useAuthFetch()
const toast = useToast()
const confirm = useConfirm()

const bills = ref<CardBill[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)

const form = reactive({ dueDate: '', amount: '' as number | '', notes: '' })

const localShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const pendingBills = computed(() => bills.value.filter((b) => !b.isPaid))
const paidBills = computed(() => [...bills.value.filter((b) => b.isPaid)].reverse())
const nextBillId = computed(() => pendingBills.value[0]?.id ?? null)

// Siguiente vencimiento sugerido: un mes después del último recibo cargado, o el
// próximo día de pago de la tarjeta si aún no hay recibos
const suggestedDueDate = () => {
  if (!props.card) return ''
  const last = bills.value[bills.value.length - 1]
  if (last) return dayjs(last.dueDate).add(1, 'month').format('YYYY-MM-DD')
  let next = dayjs().date(props.card.paymentDay)
  if (next.isBefore(dayjs(), 'day')) next = next.add(1, 'month')
  return next.format('YYYY-MM-DD')
}

const resetForm = () => {
  editingId.value = null
  form.dueDate = suggestedDueDate()
  form.amount = ''
  form.notes = ''
  error.value = ''
}

const loadBills = async () => {
  if (!props.card) return
  loading.value = true
  try {
    bills.value = await $authFetch<CardBill[]>(`/api/credit-cards/${props.card.id}/statements`)
  } catch {
    error.value = 'Error al cargar los recibos'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (open) => {
    if (!open) return
    bills.value = []
    await loadBills()
    resetForm()
  }
)

// Fecha local del día elegido a mediodía, para que el vencimiento no se corra de día por zona horaria
const toIsoNoon = (date: string) => dayjs(`${date}T12:00:00`).toISOString()

const startEdit = (bill: CardBill) => {
  editingId.value = bill.id
  form.dueDate = dayjs(bill.dueDate).format('YYYY-MM-DD')
  form.amount = bill.amount
  form.notes = bill.notes ?? ''
  error.value = ''
}

const submit = async () => {
  if (!props.card) return
  if (!form.dueDate) return (error.value = 'Indica la fecha de vencimiento')
  if (!form.amount || Number(form.amount) <= 0) return (error.value = 'El monto debe ser mayor a 0')

  saving.value = true
  error.value = ''
  const body = {
    dueDate: toIsoNoon(form.dueDate),
    amount: Number(form.amount),
    notes: form.notes || null,
  }
  try {
    const base = `/api/credit-cards/${props.card.id}/statements`
    if (editingId.value) {
      await $authFetch(`${base}/${editingId.value}`, { method: 'PUT', body })
    } else {
      await $authFetch(base, { method: 'POST', body })
    }
    await loadBills()
    resetForm()
    emit('change')
  } catch (err: any) {
    error.value = err.data?.message || 'Error al guardar el recibo'
  } finally {
    saving.value = false
  }
}

const togglePaid = async (bill: CardBill) => {
  if (!props.card) return
  try {
    await $authFetch(`/api/credit-cards/${props.card.id}/statements/${bill.id}`, {
      method: 'PUT',
      body: { isPaid: !bill.isPaid },
    })
    await loadBills()
    emit('change')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al actualizar el recibo'))
  }
}

const removeBill = async (bill: CardBill) => {
  if (!props.card) return
  const ok = await confirm.confirm({
    title: 'Eliminar recibo',
    message: `¿Eliminar el recibo de ${formatCurrency(bill.amount)} que vence el ${formatDate(bill.dueDate)}?`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  try {
    await $authFetch(`/api/credit-cards/${props.card.id}/statements/${bill.id}`, {
      method: 'DELETE',
    })
    if (editingId.value === bill.id) resetForm()
    await loadBills()
    emit('change')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al eliminar el recibo'))
  }
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
</script>

<template>
  <UiModal v-model="localShow" :title="`Recibos - ${card?.name ?? ''}`" size="lg">
    <div class="space-y-5">
      <p class="text-xs text-gray-500">
        Carga el monto a pagar de cada recibo (del estado de cuenta o tu cálculo). La tarjeta
        muestra el recibo pendiente más próximo; al registrar el pago pasa al siguiente. Sin recibos
        cargados, el monto se calcula con los gastos registrados.
      </p>

      <!-- Formulario -->
      <form
        @submit.prevent="submit"
        class="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 sm:grid-cols-3"
      >
        <div>
          <label class="block text-xs font-medium text-gray-700">Vence *</label>
          <input v-model="form.dueDate" type="date" required :class="inputClass" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Monto a pagar *</label>
          <input
            v-model.number="form.amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            :class="inputClass"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700">Nota</label>
          <input v-model="form.notes" type="text" maxlength="500" :class="inputClass" />
        </div>
        <div v-if="error" class="rounded-lg bg-red-50 p-2 text-xs text-red-700 sm:col-span-3">
          {{ error }}
        </div>
        <div class="flex justify-end gap-2 sm:col-span-3">
          <UiButton v-if="editingId" type="button" variant="outline" @click="resetForm">
            Cancelar
          </UiButton>
          <UiButton type="submit" variant="primary" :loading="saving">
            {{ editingId ? 'Guardar cambios' : 'Agregar recibo' }}
          </UiButton>
        </div>
      </form>

      <div v-if="loading" class="flex justify-center py-6">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        ></div>
      </div>

      <template v-else>
        <!-- Pendientes -->
        <div>
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Pendientes
          </h4>
          <p v-if="!pendingBills.length" class="text-sm text-gray-400">
            No hay recibos pendientes.
          </p>
          <div class="space-y-2">
            <div
              v-for="bill in pendingBills"
              :key="bill.id"
              class="flex items-center justify-between gap-3 rounded-lg border bg-white p-3"
              :class="
                bill.id === nextBillId
                  ? 'border-indigo-300 ring-1 ring-indigo-100'
                  : 'border-gray-200'
              "
            >
              <div class="min-w-0">
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(bill.amount) }}
                  <span
                    v-if="bill.id === nextBillId"
                    class="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700"
                  >
                    Se muestra
                  </span>
                </p>
                <p
                  class="text-xs"
                  :class="
                    dayjs(bill.dueDate).isBefore(dayjs(), 'day')
                      ? 'font-semibold text-red-600'
                      : 'text-gray-500'
                  "
                >
                  Vence {{ formatDate(bill.dueDate) }}
                  <span v-if="dayjs(bill.dueDate).isBefore(dayjs(), 'day')">· vencido</span>
                </p>
                <p v-if="bill.notes" class="truncate text-xs text-gray-400">{{ bill.notes }}</p>
              </div>
              <div class="flex shrink-0 gap-1 text-xs">
                <button
                  @click="togglePaid(bill)"
                  class="rounded-lg px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Marcar pagado
                </button>
                <button
                  @click="startEdit(bill)"
                  class="rounded-lg px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  Editar
                </button>
                <button
                  @click="removeBill(bill)"
                  class="rounded-lg px-2 py-1 font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagados -->
        <div v-if="paidBills.length">
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pagados</h4>
          <div class="space-y-2">
            <div
              v-for="bill in paidBills"
              :key="bill.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div class="min-w-0">
                <p class="font-medium text-gray-600">
                  {{ formatCurrency(bill.amount) }}
                  <span
                    v-if="bill.paidAmount != null && bill.paidAmount !== bill.amount"
                    class="text-xs text-gray-400"
                  >
                    (pagado {{ formatCurrency(bill.paidAmount) }})
                  </span>
                </p>
                <p class="text-xs text-gray-400">
                  Vencía {{ formatDate(bill.dueDate) }}
                  <span v-if="bill.paidAt">· pagado {{ formatDate(bill.paidAt) }}</span>
                </p>
              </div>
              <div class="flex shrink-0 gap-1 text-xs">
                <button
                  @click="togglePaid(bill)"
                  class="rounded-lg px-2 py-1 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Marcar pendiente
                </button>
                <button
                  @click="removeBill(bill)"
                  class="rounded-lg px-2 py-1 font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
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
