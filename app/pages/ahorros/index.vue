<script setup lang="ts">
import type { SavingsGoal } from '#types/ahorro'

definePageMeta({ layout: 'default' })

const toast = useToast()
const confirm = useConfirm()
const { formatDate, formatCurrency } = useDateFormatter()
const $authFetch = useAuthFetch()

const { data: goals, pending, error, refresh } = await useFetchAuth<SavingsGoal[]>('/api/savings')

const showFormModal = ref(false)
const showContributeModal = ref(false)
const deleting = ref(false)
const editingGoal = ref<SavingsGoal | null>(null)
const contributingGoal = ref<SavingsGoal | null>(null)
const filterType = ref<'all' | 'active' | 'completed'>('all')

const filteredGoals = computed(() => {
  if (!goals.value) return []
  if (filterType.value === 'completed') return goals.value.filter((g) => g.isCompleted)
  if (filterType.value === 'active') return goals.value.filter((g) => !g.isCompleted)
  return goals.value
})

const totalSaved = computed(() => (goals.value ?? []).reduce((sum, g) => sum + g.currentAmount, 0))

const totalTarget = computed(() =>
  (goals.value ?? []).filter((g) => !g.isCompleted).reduce((sum, g) => sum + g.targetAmount, 0)
)

const activeCount = computed(() => (goals.value ?? []).filter((g) => !g.isCompleted).length)
const completedCount = computed(() => (goals.value ?? []).filter((g) => g.isCompleted).length)

const overallProgress = computed(() => {
  const all = goals.value ?? []
  if (all.length === 0) return 0
  const sumTarget = all.reduce((s, g) => s + g.targetAmount, 0)
  const sumCurrent = all.reduce((s, g) => s + g.currentAmount, 0)
  return sumTarget > 0 ? Math.min(100, (sumCurrent / sumTarget) * 100) : 0
})

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

const handleSave = () => refresh()

const deleteGoal = async (goal: SavingsGoal) => {
  const ok = await confirm.confirm({
    title: 'Eliminar meta',
    message: `¿Seguro que deseas eliminar "${goal.name}"? Se eliminarán todas las contribuciones asociadas.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await $authFetch(`/api/savings/${goal.id}`, { method: 'DELETE' })
    await refresh()
  } catch {
    toast.error('Error al eliminar la meta de ahorro')
  } finally {
    deleting.value = false
  }
}

const getProgress = (goal: SavingsGoal) =>
  Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)

const getDaysRemaining = (deadline?: string) => {
  if (!deadline) return null
  const { diffDays } = useDateFormatter()
  return diffDays(deadline)
}

const filters = [
  { val: 'all', label: 'Todas' },
  { val: 'active', label: 'Activas' },
  { val: 'completed', label: 'Completadas' },
] as const
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Metas de Ahorro</h1>
        <p class="text-sm text-gray-500">{{ (goals ?? []).length }} metas en total</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nueva Meta
      </button>
    </div>

    <!-- Summary card -->
    <div
      v-if="(goals ?? []).length > 0"
      class="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style="background: linear-gradient(135deg, #059669 0%, #047857 60%, #064e3b 100%)"
    >
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-emerald-200">
            Progreso general
          </p>
          <p class="mt-1 text-3xl font-bold tracking-tight">{{ formatCurrency(totalSaved) }}</p>
          <p class="mt-0.5 text-sm text-emerald-200">
            ahorrado de {{ formatCurrency(totalTarget + totalSaved) }} total
          </p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold">{{ overallProgress.toFixed(0) }}%</p>
          <p class="text-xs text-emerald-200">completado</p>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
        <div
          class="h-full rounded-full bg-white transition-all duration-700"
          :style="{ width: overallProgress + '%' }"
        ></div>
      </div>
      <!-- Mini stats -->
      <div class="mt-4 flex gap-6">
        <div>
          <p class="text-lg font-bold">{{ activeCount }}</p>
          <p class="text-xs text-emerald-200">activas</p>
        </div>
        <div>
          <p class="text-lg font-bold">{{ completedCount }}</p>
          <p class="text-xs text-emerald-200">completadas</p>
        </div>
        <div>
          <p class="text-lg font-bold">{{ formatCurrency(totalTarget) }}</p>
          <p class="text-xs text-emerald-200">por alcanzar</p>
        </div>
      </div>
      <!-- Decorative -->
      <div class="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5"></div>
      <div class="absolute -bottom-4 right-12 h-20 w-20 rounded-full bg-white/5"></div>
    </div>

    <!-- Stats (compact, only when no summary) -->
    <div v-if="(goals ?? []).length === 0" class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Ahorrado</p>
        <p class="mt-1.5 text-lg font-bold text-emerald-600">{{ formatCurrency(totalSaved) }}</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Activas</p>
        <p class="mt-1.5 text-lg font-bold text-blue-600">{{ activeCount }}</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Por alcanzar</p>
        <p class="mt-1.5 text-lg font-bold text-indigo-600">{{ formatCurrency(totalTarget) }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-2">
      <button
        v-for="f in filters"
        :key="f.val"
        @click="filterType = f.val"
        class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
        :class="
          filterType === f.val
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
        "
      >
        {{ f.label }}
        <span
          class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          :class="filterType === f.val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
        >
          {{
            f.val === 'all'
              ? (goals ?? []).length
              : f.val === 'active'
                ? activeCount
                : completedCount
          }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-16">
      <div
        class="border-3 h-8 w-8 animate-spin rounded-full border-emerald-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      Error al cargar las metas: {{ error.message }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredGoals.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
        <svg class="h-8 w-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-700">
        {{ filterType !== 'all' ? 'Sin resultados' : 'No hay metas aún' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ filterType !== 'all' ? 'Prueba con otro filtro.' : 'Crea tu primera meta de ahorro.' }}
      </p>
      <button
        v-if="filterType === 'all'"
        @click="openCreateModal"
        class="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Nueva Meta
      </button>
    </div>

    <!-- Goals grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="goal in filteredGoals"
        :key="goal.id"
        class="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
      >
        <!-- Top accent bar -->
        <div
          class="h-1 w-full"
          :class="goal.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'"
        ></div>

        <div class="p-5">
          <!-- Title row -->
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-base font-bold leading-tight text-gray-900">{{ goal.name }}</h3>
            <span
              v-if="goal.isCompleted"
              class="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"
            >
              Completada
            </span>
          </div>

          <!-- Progress -->
          <div class="mt-4">
            <div class="mb-1.5 flex items-center justify-between text-xs text-gray-500">
              <span>{{ formatCurrency(goal.currentAmount) }}</span>
              <span class="font-semibold text-gray-700">{{ getProgress(goal).toFixed(1) }}%</span>
              <span>{{ formatCurrency(goal.targetAmount) }}</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="
                  goal.isCompleted
                    ? 'bg-emerald-500'
                    : getProgress(goal) >= 75
                      ? 'bg-blue-500'
                      : 'bg-indigo-500'
                "
                :style="{ width: getProgress(goal) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Remaining amount -->
          <div v-if="!goal.isCompleted" class="mt-3 text-xs text-gray-400">
            Faltan
            <span class="font-semibold text-gray-600">
              {{ formatCurrency(goal.targetAmount - goal.currentAmount) }}
            </span>
            para completar la meta
          </div>

          <!-- Deadline -->
          <div v-if="goal.deadline" class="mt-3">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="
                !goal.isCompleted && (getDaysRemaining(goal.deadline) ?? 999) < 30
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              "
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span v-if="goal.isCompleted">Completada el {{ formatDate(goal.deadline) }}</span>
              <span v-else-if="(getDaysRemaining(goal.deadline) ?? -1) >= 0">
                {{ getDaysRemaining(goal.deadline) }} días restantes
              </span>
              <span v-else>Plazo vencido</span>
            </span>
          </div>

          <!-- Contributions count -->
          <div v-if="goal._count" class="mt-2 text-xs text-gray-400">
            {{ goal._count.contributions }} aporte{{
              goal._count.contributions !== 1 ? 's' : ''
            }}
            registrado{{ goal._count.contributions !== 1 ? 's' : '' }}
          </div>

          <!-- Actions -->
          <div class="mt-4 flex items-center gap-2">
            <button
              v-if="!goal.isCompleted"
              @click="openContributeModal(goal)"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Aportar
            </button>
            <div v-else class="flex-1"></div>

            <button
              @click="openEditModal(goal)"
              class="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 ring-1 ring-gray-200 transition hover:bg-indigo-50 hover:text-indigo-600 hover:ring-indigo-200"
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
              @click="deleteGoal(goal)"
              class="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-500 hover:ring-red-200"
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
  </div>
</template>
