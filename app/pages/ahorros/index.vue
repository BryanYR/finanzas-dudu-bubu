<script setup lang="ts">
import type { SavingsGoal } from '#types/ahorro'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import CheckCircleIcon from '@components/icons/common/CheckCircleIcon.vue'
import CalendarIcon from '@components/icons/dashboard/CalendarIcon.vue'
import TrendingUpIcon from '@components/icons/ingresos/TrendingUpIcon.vue'
import SavingsIcon from '@components/icons/ahorros/SavingsIcon.vue'
import GoalIcon from '@components/icons/ahorros/GoalIcon.vue'

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
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
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
          <PlusIcon custom-class="mr-2 h-10 w-10" />
          Nueva Meta
        </template>
      </UiButton>
    </div>

    <!-- Stats -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-blue-100 p-3">
            <SavingsIcon custom-class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Ahorrado</p>
            <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(totalSaved) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-primary-100 p-3">
            <GoalIcon custom-class="h-6 w-6 text-primary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Metas Activas</p>
            <p class="text-2xl font-semibold text-gray-900">{{ activeGoalsCount }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex items-center">
          <div class="rounded-lg bg-orange-100 p-3">
            <TrendingUpIcon custom-class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Meta Total</p>
            <p class="text-2xl font-semibold text-gray-900">{{ formatCurrency(totalTarget) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <UiButton
        @click="filterType = 'all'"
        :variant="filterType === 'all' ? 'primary' : 'outline'"
        size="sm"
      >
        Todas
      </UiButton>
      <UiButton
        @click="filterType = 'active'"
        :variant="filterType === 'active' ? 'success' : 'outline'"
        size="sm"
      >
        Activas
      </UiButton>
      <UiButton
        @click="filterType = 'completed'"
        :variant="filterType === 'completed' ? 'secondary' : 'outline'"
        size="sm"
      >
        Completadas
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
      Error al cargar las metas: {{ error.message }}
    </div>

    <!-- Goals Grid -->
    <div v-else-if="filteredGoals.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="goal in filteredGoals"
        :key="goal.id"
        class="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <!-- Progress Badge -->
        <div
          v-if="goal.isCompleted"
          class="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white"
        >
          <CheckCircleIcon custom-class="h-3.5 w-3.5" />
          Completada
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
                  goal.isCompleted ? 'bg-green-500' : 'bg-blue-500',
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
              <CalendarIcon custom-class="h-4 w-4" />
              <span v-if="!goal.isCompleted && getDaysRemaining(goal.deadline)! >= 0"
                >{{ getDaysRemaining(goal.deadline) }} días restantes</span
              >
              <span v-else-if="!goal.isCompleted">Fecha límite vencida</span>
              <span v-else>Completada el {{ formatDate(goal.deadline) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-2">
            <UiButton
              v-if="!goal.isCompleted"
              @click="openContributeModal(goal)"
              variant="success"
              size="sm"
              full-width
            >
              Agregar Aporte
            </UiButton>
            <UiButton
              @click="openEditModal(goal)"
              variant="ghost"
              size="sm"
              :icon="EditIcon"
              title="Editar"
            />
            <UiButton
              @click="openDeleteModal(goal)"
              variant="danger"
              size="sm"
              :icon="DeleteIcon"
              title="Eliminar"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
      <GoalIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
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
