<script setup lang="ts">
import type { BudgetProjection } from '#types/proyecciones'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import TripIcon from '@components/icons/proyecciones/TripIcon.vue'

definePageMeta({
  layout: 'default',
})

// Data fetching
const {
  data: projections,
  pending,
  error,
  refresh,
} = await useFetchAuth<BudgetProjection[]>('/api/budgets')

// State
const showFormModal = ref(false)
const completingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

const handleSave = () => {
  refresh()
}

const handleComplete = async (id: number) => {
  completingId.value = id
  const $authFetch = useAuthFetch()

  try {
    await $authFetch(`/api/budgets/${id}`, {
      method: 'PUT',
      body: { isCompleted: true },
    })
    await refresh()
  } catch (err) {
    console.error('Error al marcar la proyección como completada:', err)
    alert('Error al marcar la proyección como completada')
  } finally {
    completingId.value = null
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar esta proyección? Esta acción no se puede deshacer.')) {
    return
  }

  deletingId.value = id
  const $authFetch = useAuthFetch()

  try {
    await $authFetch(`/api/budgets/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (err) {
    console.error('Error al eliminar la proyección:', err)
    alert('Error al eliminar la proyección')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Proyecciones</h1>
        <p class="mt-1 text-sm text-gray-600">
          Planifica viajes o compras grandes y recibe una recomendación de débito vs. crédito
        </p>
      </div>
      <UiButton @click="showFormModal = true" variant="primary">
        <PlusIcon custom-class="mr-2 h-10 w-10" />
        Nueva Proyección
      </UiButton>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-800">
      Error al cargar las proyecciones: {{ error.message }}
    </div>

    <!-- Projections Grid -->
    <div
      v-else-if="projections && projections.length > 0"
      class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      <ProyeccionesProjectionCard
        v-for="projection in projections"
        :key="projection.id"
        :projection="projection"
        :completing="completingId === projection.id"
        :deleting="deletingId === projection.id"
        @complete="handleComplete"
        @delete="handleDelete"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
      <TripIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">No hay proyecciones</h3>
      <p class="mt-1 text-sm text-gray-500">
        Crea tu primera proyección para planificar un viaje o una compra grande.
      </p>
    </div>

    <!-- Modal -->
    <ProyeccionesProjectionFormModal v-model:show="showFormModal" @save="handleSave" />
  </div>
</template>
