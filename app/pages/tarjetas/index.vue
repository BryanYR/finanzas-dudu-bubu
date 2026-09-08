<script setup lang="ts">
import type { CreditCard, CardStatement } from '#types/tarjeta'

definePageMeta({ layout: 'default' })

interface BillingPeriod {
  startDate: string
  endDate: string
  paymentDueDate: string
}

interface StatementWithPeriod extends CardStatement {
  billingPeriod?: BillingPeriod
}

interface StatementResponse {
  statement: CardStatement
  billingPeriod: BillingPeriod
}

const toast = useToast()
const { formatCurrency, formatDateShort: formatDate } = useDateFormatter()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')
const $authFetch = useAuthFetch()

const {
  data: creditCards,
  pending,
  error,
  refresh,
} = await useFetchAuth<CreditCard[]>('/api/credit-cards')

const cardStatements = ref<Record<number, StatementWithPeriod>>({})
const loadingStatements = ref(false)

const loadStatements = async () => {
  if (!creditCards.value) return
  loadingStatements.value = true
  const activeCards = creditCards.value.filter((c) => c.isActive)
  try {
    await Promise.all(
      activeCards.map(async (card) => {
        try {
          const data = await $authFetch<StatementResponse>(`/api/credit-cards/${card.id}/statement`)
          cardStatements.value[card.id] = { ...data.statement, billingPeriod: data.billingPeriod }
        } catch {}
      })
    )
  } finally {
    loadingStatements.value = false
  }
}

onMounted(() => loadStatements())
watch(creditCards, () => loadStatements())

const showFormModal = ref(false)
const showPaymentModal = ref(false)
const showPaymentHistoryModal = ref(false)
const deleting = ref(false)
const editingCard = ref<CreditCard | null>(null)
const cardToPay = ref<{ card: CreditCard; suggestedAmount: number } | null>(null)
const cardForHistory = ref<{ id: number; name: string } | null>(null)
const filterActive = ref<'all' | 'active' | 'inactive'>('all')
const confirm = useConfirm()

const filterOptions = [
  { val: 'all' as const, label: 'Todas' },
  { val: 'active' as const, label: 'Activas' },
  { val: 'inactive' as const, label: 'Inactivas' },
]

const filteredCards = computed(() => {
  if (!creditCards.value) return []
  if (filterActive.value === 'all') return creditCards.value
  return creditCards.value.filter((c) =>
    filterActive.value === 'active' ? c.isActive : !c.isActive
  )
})

const activeCards = computed(() => creditCards.value?.filter((c) => c.isActive) ?? [])

const totalDebt = computed(() =>
  Object.values(cardStatements.value).reduce((s, st) => s + st.totalAmount, 0)
)

const mostUrgentDays = computed(() => {
  const days = Object.values(cardStatements.value)
    .map((s) => {
      const due = s.billingPeriod?.paymentDueDate ?? s.paymentDueDate
      return due ? dayjs(due).diff(dayjs(), 'day') : 999
    })
    .filter((d) => d >= 0)
  return days.length ? Math.min(...days) : null
})

// Gradients for each card slot
const cardGradients = [
  'from-indigo-600 via-indigo-700 to-purple-800',
  'from-blue-600 via-blue-700 to-cyan-700',
  'from-emerald-600 via-emerald-700 to-teal-800',
  'from-rose-600 via-rose-700 to-pink-800',
  'from-amber-600 via-orange-600 to-red-700',
  'from-slate-600 via-slate-700 to-gray-800',
]

const getGradient = (idx: number) =>
  cardGradients[idx % cardGradients.length] ?? 'from-indigo-600 via-indigo-700 to-purple-800'

// Safe accessor — only called after v-else-if="getStatement(card.id)" guard
const getStatement = (cardId: number) => cardStatements.value[cardId] as StatementWithPeriod

const openCreateModal = () => {
  editingCard.value = null
  showFormModal.value = true
}
const openEditModal = (card: CreditCard) => {
  editingCard.value = card
  showFormModal.value = true
}
const openPaymentModal = (card: CreditCard, amount: number) => {
  cardToPay.value = { card, suggestedAmount: amount }
  showPaymentModal.value = true
}
const openPaymentHistoryModal = (card: CreditCard) => {
  cardForHistory.value = { id: card.id, name: card.name }
  showPaymentHistoryModal.value = true
}

const handleSave = async () => {
  await refresh()
  await loadStatements()
}
const handlePaymentSave = async () => {
  await refresh()
  await loadStatements()
}

const deleteCard = async (card: CreditCard) => {
  const ok = await confirm.confirm({
    title: 'Eliminar tarjeta',
    message: `¿Seguro que deseas eliminar "${card.name} (••••${card.lastDigits})"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await $authFetch(`/api/credit-cards/${card.id}`, { method: 'DELETE' })
    await refresh()
    await loadStatements()
  } catch {
    toast.error('Error al eliminar la tarjeta')
  } finally {
    deleting.value = false
  }
}

const daysUntilDue = (statement: StatementWithPeriod) => {
  const due = statement.billingPeriod?.paymentDueDate ?? statement.paymentDueDate
  return due ? dayjs(due).diff(dayjs(), 'day') : null
}

const urgencyClass = (days: number | null) => {
  if (days === null) return 'text-gray-500'
  if (days <= 3) return 'text-red-600 font-bold'
  if (days <= 7) return 'text-orange-500 font-semibold'
  return 'text-emerald-600'
}

const usageBarClass = (pct: number) => {
  if (pct > 80) return 'bg-red-500'
  if (pct > 50) return 'bg-amber-400'
  return 'bg-emerald-500'
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Tarjetas de Crédito</h1>
        <p class="text-sm text-gray-500">
          {{ activeCards.length }} tarjeta{{ activeCards.length !== 1 ? 's' : '' }} activa{{
            activeCards.length !== 1 ? 's' : ''
          }}
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nueva Tarjeta
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <div
        class="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      Error al cargar las tarjetas: {{ error.message }}
    </div>

    <template v-else>
      <!-- Resumen total (solo si hay deuda) -->
      <div
        v-if="totalDebt > 0"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-5 text-white shadow-lg"
      >
        <div class="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div class="absolute -bottom-8 left-4 h-24 w-24 rounded-full bg-white/10" />
        <div class="relative flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-white/80">Deuda total este mes</p>
            <p class="mt-0.5 text-3xl font-bold">{{ formatCurrency(totalDebt) }}</p>
            <p v-if="mostUrgentDays !== null" class="mt-1.5 text-sm text-white/80">
              Próximo vencimiento en
              <span class="font-semibold text-white">{{ mostUrgentDays }} días</span>
            </p>
          </div>
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2">
        <button
          v-for="opt in filterOptions"
          :key="opt.val"
          @click="filterActive = opt.val"
          class="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          :class="
            filterActive === opt.val
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Cards activas -->
      <div v-if="filterActive !== 'inactive'" class="grid gap-5 sm:grid-cols-2">
        <div
          v-for="(card, idx) in filteredCards.filter((c) => c.isActive)"
          :key="card.id"
          class="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100"
        >
          <!-- Cara de la tarjeta (diseño físico) -->
          <div
            class="relative h-44 overflow-hidden bg-gradient-to-br p-5"
            :class="getGradient(idx)"
          >
            <!-- Círculos decorativos -->
            <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div class="absolute -bottom-10 -left-4 h-32 w-32 rounded-full bg-white/10" />

            <!-- Fila superior: logo + acciones -->
            <div class="relative flex items-start justify-between">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-widest text-white/60">
                  {{ card.bank }}
                </p>
                <p class="text-lg font-bold leading-tight text-white">{{ card.name }}</p>
              </div>
              <div class="flex gap-1">
                <button
                  @click="openPaymentHistoryModal(card)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                  title="Historial"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </button>
                <button
                  @click="openEditModal(card)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                  title="Editar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  @click="deleteCard(card)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-red-500/60"
                  title="Eliminar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Chip EMV (SVG simplificado) -->
            <div class="relative mt-4">
              <div class="h-7 w-10 rounded-md bg-yellow-300/80 ring-1 ring-yellow-200/50">
                <div class="m-1 grid grid-cols-2 gap-0.5">
                  <div class="h-1.5 rounded-sm bg-yellow-500/60"></div>
                  <div class="h-1.5 rounded-sm bg-yellow-500/60"></div>
                  <div class="h-1.5 rounded-sm bg-yellow-500/60"></div>
                  <div class="h-1.5 rounded-sm bg-yellow-500/60"></div>
                </div>
              </div>
            </div>

            <!-- Número de tarjeta -->
            <div class="relative mt-2">
              <p class="font-mono text-base font-semibold tracking-widest text-white/90">
                •••• •••• •••• {{ card.lastDigits }}
              </p>
            </div>
          </div>

          <!-- Cuerpo de la tarjeta -->
          <div class="p-4">
            <!-- Loading state -->
            <div v-if="loadingStatements" class="flex justify-center py-6">
              <div
                class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
              ></div>
            </div>

            <div v-else-if="getStatement(card.id)" class="space-y-4">
              <!-- Deuda + vencimiento -->
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Deuda del periodo
                  </p>
                  <p class="text-2xl font-bold text-gray-900">
                    {{ formatCurrency(getStatement(card.id).totalAmount) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400">Vence</p>
                  <p class="text-sm font-semibold text-gray-700">
                    {{
                      formatDate(
                        getStatement(card.id).billingPeriod?.paymentDueDate ??
                          getStatement(card.id).paymentDueDate
                      )
                    }}
                  </p>
                  <p class="text-xs" :class="urgencyClass(daysUntilDue(getStatement(card.id)))">
                    {{
                      daysUntilDue(getStatement(card.id)) !== null
                        ? `${daysUntilDue(getStatement(card.id))} días`
                        : ''
                    }}
                  </p>
                </div>
              </div>

              <!-- Barra de uso de crédito -->
              <div>
                <div class="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Uso del crédito</span>
                  <span class="font-medium"
                    >{{ (getStatement(card.id).creditUsagePercent ?? 0).toFixed(1) }}%</span
                  >
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="usageBarClass(getStatement(card.id).creditUsagePercent ?? 0)"
                    :style="{ width: (getStatement(card.id).creditUsagePercent ?? 0) + '%' }"
                  />
                </div>
                <div class="mt-1 flex justify-between text-xs text-gray-400">
                  <span
                    >Disponible:
                    {{ formatCurrency(getStatement(card.id).availableCredit ?? 0) }}</span
                  >
                  <span>Límite: {{ formatCurrency(card.creditLimit) }}</span>
                </div>
              </div>

              <!-- Chips info: corte / pago -->
              <div class="flex gap-2">
                <span
                  class="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
                >
                  <svg
                    class="h-3 w-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Corte día {{ card.billingDay }}
                </span>
                <span
                  class="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
                >
                  <svg
                    class="h-3 w-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Pago día {{ card.paymentDay }}
                </span>
              </div>

              <!-- Botón de pago -->
              <button
                v-if="getStatement(card.id).totalAmount > 0"
                @click="openPaymentModal(card, getStatement(card.id).totalAmount)"
                class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              >
                Registrar Pago
              </button>
              <div
                v-else
                class="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Sin deuda pendiente
              </div>
            </div>

            <!-- Sin datos -->
            <div v-else class="py-6 text-center text-sm text-gray-400">
              Sin movimientos este periodo
            </div>
          </div>
        </div>

        <!-- Empty state activas -->
        <div
          v-if="filteredCards.filter((c) => c.isActive).length === 0"
          class="col-span-2 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <svg
              class="h-8 w-8 text-indigo-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h3 class="mt-4 text-sm font-semibold text-gray-700">No hay tarjetas activas</h3>
          <p class="mt-1 text-sm text-gray-400">Agrega tu primera tarjeta de crédito.</p>
          <button
            @click="openCreateModal"
            class="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nueva Tarjeta
          </button>
        </div>
      </div>

      <!-- Lista para inactivas -->
      <div v-else class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div v-if="filteredCards.length === 0" class="py-10 text-center text-sm text-gray-400">
          No hay tarjetas para mostrar
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="card in filteredCards"
            :key="card.id"
            class="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 lg:px-5"
          >
            <!-- Icon -->
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <!-- Info -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold text-gray-800">{{ card.name }}</p>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :class="
                    card.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{ card.isActive ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                <span>{{ card.bank }}</span>
                <span>·</span>
                <span class="font-mono">•••• {{ card.lastDigits }}</span>
                <span>·</span>
                <span>Límite: {{ formatCurrency(card.creditLimit) }}</span>
              </div>
            </div>
            <!-- Days info -->
            <div class="hidden shrink-0 text-right sm:block">
              <p class="text-xs text-gray-400">Corte día {{ card.billingDay }}</p>
              <p class="text-xs text-gray-400">Pago día {{ card.paymentDay }}</p>
            </div>
            <!-- Actions -->
            <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                @click="openEditModal(card)"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                title="Editar"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="deleteCard(card)"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                title="Eliminar"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modales -->
    <TarjetasCreditCardFormModal
      v-model:show="showFormModal"
      :card="editingCard"
      @save="handleSave"
    />

    <TarjetasCardPaymentModal
      v-model:show="showPaymentModal"
      :card="cardToPay?.card ?? null"
      :suggested-amount="cardToPay?.suggestedAmount ?? 0"
      @save="handlePaymentSave"
    />

    <TarjetasCardPaymentHistoryModal
      v-model:show="showPaymentHistoryModal"
      :card-id="cardForHistory?.id ?? null"
      :card-name="cardForHistory?.name ?? ''"
    />
  </div>
</template>
