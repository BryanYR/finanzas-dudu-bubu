<script setup lang="ts">
import type { CreditCard, CardStatement } from '#types/tarjeta'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import HistoryIcon from '@components/icons/common/HistoryIcon.vue'
import PaymentIcon from '@components/icons/common/PaymentIcon.vue'
import CardIcon from '@components/icons/tarjetas/CardIcon.vue'

definePageMeta({
  layout: 'default',
})

// Data fetching
const {
  data: creditCards,
  pending,
  error,
  refresh,
} = await useFetchAuth<CreditCard[]>('/api/credit-cards')
const $authFetch = useAuthFetch()

// Obtener estados de cuenta de cada tarjeta activa
const cardStatements = ref<Record<number, CardStatement>>({})
const loadingStatements = ref(false)

const loadStatements = async () => {
  if (!creditCards.value) return

  loadingStatements.value = true
  const activeCards = creditCards.value.filter((c) => c.isActive)

  try {
    await Promise.all(
      activeCards.map(async (card) => {
        try {
          const data = await $authFetch(`/api/credit-cards/${card.id}/statement`)
          cardStatements.value[card.id] = data.statement
        } catch (err) {
          console.error(`Error al cargar estado de cuenta de tarjeta ${card.id}:`, err)
        }
      })
    )
  } finally {
    loadingStatements.value = false
  }
}

// Cargar estados de cuenta al montar
onMounted(() => {
  loadStatements()
})

// Recargar cuando cambien las tarjetas
watch(creditCards, () => {
  loadStatements()
})

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showPaymentModal = ref(false)
const showPaymentHistoryModal = ref(false)
const deleting = ref(false)
const editingCard = ref<CreditCard | null>(null)
const cardToDelete = ref<CreditCard | null>(null)
const cardToPay = ref<{ card: CreditCard; suggestedAmount: number } | null>(null)
const cardForHistory = ref<{ id: number; name: string } | null>(null)
const filterActive = ref<'all' | 'active' | 'inactive'>('all')

// Table columns
const columns = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'bank', label: 'Banco', sortable: true },
  { key: 'lastDigits', label: 'Número', sortable: false },
  { key: 'creditLimit', label: 'Límite', sortable: true },
  { key: 'billingDay', label: 'Día Corte', sortable: true },
  { key: 'paymentDay', label: 'Día Pago', sortable: true },
  { key: 'isActive', label: 'Estado', sortable: true },
  { key: 'actions', label: 'Acciones', sortable: false },
]

// Computed
const filteredCards = computed(() => {
  if (!creditCards.value) return []
  if (filterActive.value === 'all') return creditCards.value
  return creditCards.value.filter((card) =>
    filterActive.value === 'active' ? card.isActive : !card.isActive
  )
})

// Methods
const openCreateModal = () => {
  editingCard.value = null
  showFormModal.value = true
}

const openEditModal = (card: CreditCard) => {
  editingCard.value = card
  showFormModal.value = true
}

const openDeleteModal = (card: CreditCard) => {
  cardToDelete.value = card
  showDeleteModal.value = true
}

const openPaymentModal = (card: CreditCard, suggestedAmount: number) => {
  cardToPay.value = { card, suggestedAmount }
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

const deleteCard = async () => {
  if (!cardToDelete.value) return

  deleting.value = true
  try {
    await $authFetch(`/api/credit-cards/${cardToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    await refresh()
    await loadStatements()
  } catch (err) {
    console.error('Error al eliminar tarjeta:', err)
    alert('Error al eliminar la tarjeta')
  } finally {
    deleting.value = false
  }
}

const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount)
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return ''
  return dayjs(dateString).format('DD MMM')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tarjetas de Crédito</h1>
        <p class="mt-1 text-sm text-gray-600">Gestiona tus tarjetas de crédito</p>
      </div>
      <UiButton @click="openCreateModal" variant="primary">
        <template #default>
          <PlusIcon custom-class="mr-2 h-10 w-10" />
          Nueva Tarjeta
        </template>
      </UiButton>
    </div>

    <!-- Filters -->
    <div class="rounded-xl bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-3">
        <UiButton
          @click="filterActive = 'all'"
          :variant="filterActive === 'all' ? 'primary' : 'outline'"
          size="sm"
        >
          Todas
        </UiButton>
        <UiButton
          @click="filterActive = 'active'"
          :variant="filterActive === 'active' ? 'primary' : 'outline'"
          size="sm"
        >
          Activas
        </UiButton>
        <UiButton
          @click="filterActive = 'inactive'"
          :variant="filterActive === 'inactive' ? 'secondary' : 'outline'"
          size="sm"
        >
          Inactivas
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-xl bg-red-50 p-4 text-red-800">
      Error al cargar las tarjetas: {{ error.message }}
    </div>

    <!-- Cards View (Activas con saldo pendiente) -->
    <div v-else-if="filterActive !== 'inactive'" class="space-y-6">
      <!-- Resumen de deudas pendientes -->
      <div class="rounded-xl bg-amber-600 p-6 text-white shadow-sm">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Deuda Total en Tarjetas</h2>
          <CardIcon custom-class="h-8 w-8" />
        </div>
        <p class="text-4xl font-bold">
          {{
            formatCurrency(Object.values(cardStatements).reduce((sum, s) => sum + s.totalAmount, 0))
          }}
        </p>
        <p class="mt-2 text-sm opacity-90">
          Debes pagar este mes en {{ Object.keys(cardStatements).length }} tarjetas activas
        </p>
      </div>

      <!-- Tarjetas activas con estado de cuenta -->
      <div class="grid gap-6 md:grid-cols-2">
        <div
          v-for="card in filteredCards.filter((c) => c.isActive)"
          :key="card.id"
          class="rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
        >
          <!-- Card Header: representación flat de la tarjeta física -->
          <div class="flex items-start justify-between rounded-t-xl bg-gray-900 p-6 text-white">
            <div>
              <h3 class="text-xl font-bold">{{ card.name }}</h3>
              <p class="mt-1 text-sm opacity-90">{{ card.bank }}</p>
              <p class="mt-2 font-mono text-lg">•••• •••• •••• {{ card.lastDigits }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="openPaymentHistoryModal(card)"
                class="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="Historial de Pagos"
              >
                <HistoryIcon custom-class="h-5 w-5" />
              </button>
              <button
                @click="openEditModal(card)"
                class="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="Editar"
              >
                <EditIcon custom-class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="p-6">
            <div v-if="loadingStatements" class="flex items-center justify-center py-8">
              <div
                class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
              ></div>
            </div>

            <div v-else-if="cardStatements[card.id]" class="space-y-4">
              <!-- Saldo pendiente -->
              <div class="rounded-lg bg-amber-50 p-4">
                <p class="text-sm font-medium text-amber-800">Deuda del Periodo Actual</p>
                <p class="mt-1 text-3xl font-bold text-amber-900">
                  {{ formatCurrency(cardStatements[card.id]?.totalAmount ?? 0) }}
                </p>
                <div class="mt-3 flex items-center justify-between text-sm text-amber-700">
                  <span
                    >Pagar antes del {{ formatDate(cardStatements[card.id]?.paymentDueDate) }}</span
                  >
                  <span
                    :class="
                      dayjs(cardStatements[card.id]?.paymentDueDate).diff(dayjs(), 'days') <= 7
                        ? 'font-bold text-red-700'
                        : ''
                    "
                  >
                    {{ dayjs(cardStatements[card.id]?.paymentDueDate).diff(dayjs(), 'days') }} días
                  </span>
                </div>

                <!-- Botón de pago -->
                <UiButton
                  v-if="(cardStatements[card.id]?.totalAmount ?? 0) > 0"
                  @click="openPaymentModal(card, cardStatements[card.id]?.totalAmount ?? 0)"
                  variant="success"
                  full-width
                  class="mt-3"
                >
                  <template #default>
                    <PaymentIcon custom-class="mr-2 h-5 w-5" />
                    Registrar Pago
                  </template>
                </UiButton>
              </div>

              <!-- Límite de crédito -->
              <div>
                <div class="mb-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Límite de crédito</span>
                  <span class="font-semibold text-gray-900">{{
                    formatCurrency(card.creditLimit)
                  }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    :class="[
                      'h-full transition-all',
                      (cardStatements[card.id]?.creditUsagePercent ?? 0) > 80
                        ? 'bg-red-500'
                        : (cardStatements[card.id]?.creditUsagePercent ?? 0) > 50
                          ? 'bg-amber-500'
                          : 'bg-green-500',
                    ]"
                    :style="{ width: (cardStatements[card.id]?.creditUsagePercent ?? 0) + '%' }"
                  ></div>
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  Disponible:
                  {{ formatCurrency(cardStatements[card.id]?.availableCredit ?? 0) }} ({{
                    (100 - (cardStatements[card.id]?.creditUsagePercent ?? 0)).toFixed(1)
                  }}%)
                </p>
              </div>

              <!-- Estadísticas -->
              <div class="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p class="text-xs text-gray-600">Corte</p>
                  <p class="text-sm font-semibold text-gray-900">
                    {{
                      formatDate(cardStatements[card.id]?.billingEndDate) ||
                      `Día ${card.billingDay}`
                    }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-600">Pago</p>
                  <p class="text-sm font-semibold text-gray-900">
                    {{
                      formatDate(cardStatements[card.id]?.paymentDueDate) ||
                      `Día ${card.paymentDay}`
                    }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="py-4 text-center text-sm text-gray-500">
              No hay gastos registrados este periodo
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state para activas -->
      <div
        v-if="filteredCards.filter((c) => c.isActive).length === 0"
        class="rounded-xl bg-white p-12 text-center shadow-sm"
      >
        <CardIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay tarjetas activas</h3>
        <p class="mt-1 text-sm text-gray-500">Comienza agregando una nueva tarjeta de crédito.</p>
      </div>
    </div>

    <!-- Data Table (para vista de todas o inactivas) -->
    <UiDataTable v-else :data="filteredCards" :columns="columns" :items-per-page="10">
      <template #cell-lastDigits="{ value }">
        <span class="font-mono">•••• {{ value }}</span>
      </template>

      <template #cell-creditLimit="{ value }">
        <span class="font-semibold text-gray-900">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-billingDay="{ value }">
        <span class="text-sm text-gray-600">Día {{ value }}</span>
      </template>

      <template #cell-paymentDay="{ value }">
        <span class="text-sm text-gray-600">Día {{ value }}</span>
      </template>

      <template #cell-isActive="{ value }">
        <span
          :class="[
            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
          ]"
        >
          {{ value ? 'Activa' : 'Inactiva' }}
        </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <button
            @click="openEditModal(item)"
            class="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50"
            title="Editar"
          >
            <EditIcon custom-class="h-5 w-5" />
          </button>
          <button
            @click="openDeleteModal(item)"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Eliminar"
          >
            <DeleteIcon custom-class="h-5 w-5" />
          </button>
        </div>
      </template>

      <template #empty>
        <div class="text-center">
          <CardIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">No hay tarjetas</h3>
          <p class="mt-1 text-sm text-gray-500">Comienza agregando una nueva tarjeta de crédito.</p>
        </div>
      </template>
    </UiDataTable>

    <!-- Form Modal -->
    <TarjetasCreditCardFormModal
      v-model:show="showFormModal"
      :card="editingCard"
      @save="handleSave"
    />

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Eliminar Tarjeta" size="sm">
      <p class="text-gray-600">
        ¿Estás seguro de que deseas eliminar la tarjeta
        <strong>{{ cardToDelete?.name }} (••••{{ cardToDelete?.lastDigits }})</strong>? Esta acción
        no se puede deshacer.
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton @click="showDeleteModal = false" variant="outline"> Cancelar </UiButton>
          <UiButton @click="deleteCard" :loading="deleting" variant="danger"> Eliminar </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Payment Modal -->
    <TarjetasCardPaymentModal
      v-model:show="showPaymentModal"
      :card="cardToPay?.card ?? null"
      :suggested-amount="cardToPay?.suggestedAmount ?? 0"
      @save="handlePaymentSave"
    />

    <!-- Payment History Modal -->
    <TarjetasCardPaymentHistoryModal
      v-model:show="showPaymentHistoryModal"
      :card-id="cardForHistory?.id ?? null"
      :card-name="cardForHistory?.name ?? ''"
    />
  </div>
</template>
