<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

interface CreditCard {
  id: number
  name: string
  bank: string
  lastDigits: string
  creditLimit: number
  billingDay: number
  paymentDay: number
  interestRate?: number
  isActive: boolean
  userId: number
  createdAt: string
  updatedAt: string
}

// Data fetching
const {
  data: creditCards,
  pending,
  error,
  refresh,
} = await useFetch<CreditCard[]>('/api/credit-cards')

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)
const editingCard = ref<CreditCard | null>(null)
const cardToDelete = ref<CreditCard | null>(null)
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

const handleSave = async () => {
  await refresh()
}

const deleteCard = async () => {
  if (!cardToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/credit-cards/${cardToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    await refresh()
  } catch (err) {
    console.error('Error al eliminar tarjeta:', err)
    alert('Error al eliminar la tarjeta')
  } finally {
    deleting.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
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
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nueva Tarjeta
        </template>
      </UiButton>
    </div>

    <!-- Filters -->
    <div class="rounded-lg bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-4">
        <button
          @click="filterActive = 'all'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterActive === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Todas
        </button>
        <button
          @click="filterActive = 'active'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterActive === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Activas
        </button>
        <button
          @click="filterActive = 'inactive'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterActive === 'inactive'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Inactivas
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-800">
      Error al cargar las tarjetas: {{ error.message }}
    </div>

    <!-- Data Table -->
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
            class="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50"
            title="Editar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            @click="openDeleteModal(item)"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Eliminar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </template>

      <template #empty>
        <div class="text-center">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
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
  </div>
</template>
