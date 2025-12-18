<script setup lang="ts">
import type { SavingsGoal } from '#types/ahorro'

definePageMeta({
  layout: 'default',
})

// Data fetching
const { data: goals, pending, error, refresh } = await useFetchAuth<SavingsGoal[]>('/api/savings')

// State
const showFormModal = ref(false)
const showContributeModal = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)
const editingGoal = ref<SavingsGoal | null>(null)
const contributingGoal = ref<SavingsGoal | null>(null)
const goalToDelete = ref<SavingsGoal | null>(null)
const filterType = ref<'all' | 'active' | 'completed'>('all')

const { formatDate } = useDateFormatter()

// Computed
const filteredGoals = computed(() => {
  if (!goals.value) return []
  if (filterType.value === 'all') return goals.value
  if (filterType.value === 'completed') return goals.value.filter((g) => g.isCompleted)
  return goals.value.filter((g) => !g.isCompleted)
})

const totalSaved = computed(() => {
  if (!goals.value) return 0
  return goals.value.reduce((sum, goal) => sum + goal.currentAmount, 0)
})

const totalTarget = computed(() => {
  if (!goals.value) return 0
  return goals.value.filter((g) => !g.isCompleted).reduce((sum, goal) => sum + goal.targetAmount, 0)
})

const activeGoalsCount = computed(() => {
  if (!goals.value) return 0
  return goals.value.filter((g) => !g.isCompleted).length
})

// Methods
const openCreateModal = () => {
  editingGoal.value = null
  showFormModal.value = true
}

const openEditModal = (goal: SavingsGoal) => {
  editingGoal.value = goal
  showFormModal.value = true
}

const openContributeModal = (goal: SavingsGoal) => {
  contributingGoal.value = goal
  showContributeModal.value = true
}

const openDeleteModal = (goal: SavingsGoal) => {
  goalToDelete.value = goal
  showDeleteModal.value = true
}

const handleSave = () => {
  refresh()
}

const deleteGoal = async () => {
  if (!goalToDelete.value) return

  deleting.value = true
  const $authFetch = useAuthFetch()

  try {
    await $authFetch(`/api/savings/${goalToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    refresh()
  } catch (err) {
    console.error('Error al eliminar:', err)
    alert('Error al eliminar la meta de ahorro')
  } finally {
    deleting.value = false
  }
}

const getProgressPercentage = (goal: SavingsGoal) => {
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const getDaysRemaining = (deadline?: string) => {
  if (!deadline) return null
  const { diffDays } = useDateFormatter()
  const days = diffDays(deadline)
  return days
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Metas de Ahorro</h1>
        <p class="mt-1 text-sm text-gray-600">Alcanza tus objetivos financieros</p>
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
          Nueva Meta
        </template>
      </UiButton>
    </div>

    <!-- Stats -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-green-100 p-3">
            <svg
              class="h-6 w-6 text-green-600"
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
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Ahorrado</p>
            <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(totalSaved) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-indigo-100 p-3">
            <svg
              class="h-6 w-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Metas Activas</p>
            <p class="text-2xl font-semibold text-gray-900">{{ activeGoalsCount }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-orange-100 p-3">
            <svg
              class="h-6 w-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Meta Total</p>
            <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(totalTarget) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-lg bg-white p-4 shadow-sm">
      <div class="flex flex-wrap gap-4">
        <button
          @click="filterType = 'all'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Todas
        </button>
        <button
          @click="filterType = 'active'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Activas
        </button>
        <button
          @click="filterType = 'completed'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'completed'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Completadas
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
      Error al cargar las metas: {{ error.message }}
    </div>

    <!-- Goals Grid -->
    <div v-else-if="filteredGoals.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="goal in filteredGoals"
        :key="goal.id"
        class="relative overflow-hidden rounded-xl bg-white shadow-md transition-shadow hover:shadow-lg"
      >
        <!-- Progress Badge -->
        <div
          v-if="goal.isCompleted"
          class="absolute right-4 top-4 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white"
        >
          ✓ Completada
        </div>

        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900">{{ goal.name }}</h3>

          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Progreso</span>
              <span class="font-semibold text-gray-900"
                >{{ getProgressPercentage(goal).toFixed(1) }}%</span
              >
            </div>

            <!-- Progress Bar -->
            <div class="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                :class="[
                  'h-full transition-all',
                  goal.isCompleted ? 'bg-green-500' : 'bg-indigo-500',
                ]"
                :style="{ width: getProgressPercentage(goal) + '%' }"
              ></div>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">{{ formatCurrency(goal.currentAmount) }}</span>
              <span class="font-semibold text-gray-900">{{
                formatCurrency(goal.targetAmount)
              }}</span>
            </div>
          </div>

          <!-- Deadline -->
          <div v-if="goal.deadline" class="mt-4">
            <div
              :class="[
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                getDaysRemaining(goal.deadline)! < 30 && !goal.isCompleted
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800',
              ]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span v-if="!goal.isCompleted && getDaysRemaining(goal.deadline)! >= 0"
                >{{ getDaysRemaining(goal.deadline) }} días restantes</span
              >
              <span v-else-if="!goal.isCompleted">Fecha límite vencida</span>
              <span v-else>Completada el {{ formatDate(goal.deadline) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-2">
            <button
              v-if="!goal.isCompleted"
              @click="openContributeModal(goal)"
              class="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Agregar Aporte
            </button>
            <button
              @click="openEditModal(goal)"
              class="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-gray-50"
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
              @click="openDeleteModal(goal)"
              class="rounded-lg border border-gray-300 p-2 text-red-600 transition-colors hover:bg-red-50"
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
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="rounded-lg bg-white p-12 text-center shadow-sm">
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
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No hay metas de ahorro</h3>
      <p class="mt-1 text-sm text-gray-500">Comienza estableciendo una nueva meta financiera.</p>
    </div>

    <!-- Modals -->
    <AhorrosSavingsGoalFormModal
      v-model:show="showFormModal"
      :goal="editingGoal"
      @save="handleSave"
    />

    <AhorrosContributeModal
      v-model:show="showContributeModal"
      :goal="contributingGoal"
      @save="handleSave"
    />

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Eliminar Meta" size="sm">
      <p class="text-gray-600">
        ¿Estás seguro de que deseas eliminar la meta
        <strong>{{ goalToDelete?.name }}</strong
        >? Esta acción no se puede deshacer y se eliminarán todas las contribuciones asociadas.
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton @click="showDeleteModal = false" variant="outline"> Cancelar </UiButton>
          <UiButton @click="deleteGoal" :loading="deleting" variant="danger"> Eliminar </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
