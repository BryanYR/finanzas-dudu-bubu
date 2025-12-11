<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

interface Category {
  id: number
  name: string
  type: string
  icon?: string
  color?: string
  userId: number
  createdAt: string
  updatedAt: string
}

// Data fetching
const { data: categories, pending, error, refresh } = await useFetch<Category[]>('/api/categories')

// State
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)
const editingCategory = ref<Category | null>(null)
const categoryToDelete = ref<Category | null>(null)
const filterType = ref<'all' | 'income' | 'expense'>('all')

// Table columns
const columns = [
  { key: 'icon', label: 'Icono', sortable: false },
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'type', label: 'Tipo', sortable: true },
  { key: 'color', label: 'Color', sortable: false },
  { key: 'actions', label: 'Acciones', sortable: false },
]

// Computed
const filteredCategories = computed(() => {
  if (!categories.value) return []
  if (filterType.value === 'all') return categories.value
  return categories.value.filter((cat) => cat.type === filterType.value)
})

// Methods
const openCreateModal = () => {
  editingCategory.value = null
  showFormModal.value = true
}

const openEditModal = (category: Category) => {
  editingCategory.value = category
  showFormModal.value = true
}

const openDeleteModal = (category: Category) => {
  categoryToDelete.value = category
  showDeleteModal.value = true
}

const handleSave = async () => {
  await refresh()
}

const deleteCategory = async () => {
  if (!categoryToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/categories/${categoryToDelete.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    await refresh()
  } catch (err) {
    console.error('Error al eliminar categoría:', err)
    alert('Error al eliminar la categoría')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Categorías</h1>
        <p class="mt-1 text-sm text-gray-600">Gestiona las categorías de tus ingresos y gastos</p>
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
          Nueva Categoría
        </template>
      </UiButton>
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
          @click="filterType = 'income'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'income'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Ingresos
        </button>
        <button
          @click="filterType = 'expense'"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            filterType === 'expense'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          Gastos
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
      Error al cargar las categorías: {{ error.message }}
    </div>

    <!-- Data Table -->
    <UiDataTable v-else :data="filteredCategories" :columns="columns" :items-per-page="10">
      <template #cell-type="{ value }">
        <span
          :class="[
            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
            value === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
          ]"
        >
          {{ value === 'income' ? 'Ingreso' : 'Gasto' }}
        </span>
      </template>

      <template #cell-icon="{ value }">
        <span class="text-2xl">{{ value || '📁' }}</span>
      </template>

      <template #cell-color="{ value }">
        <div class="flex items-center gap-2">
          <div
            class="h-6 w-6 rounded-full border-2 border-gray-300"
            :style="{ backgroundColor: value || '#6B7280' }"
          ></div>
          <span class="text-xs text-gray-600">{{ value || '#6B7280' }}</span>
        </div>
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
          <p class="mt-1 text-sm text-gray-500">Comienza creando una nueva categoría.</p>
        </div>
      </template>
    </UiDataTable>

    <!-- Form Modal -->
    <CategoriasCategoryFormModal
      v-model:show="showFormModal"
      :category="editingCategory"
      @save="handleSave"
    />

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Eliminar Categoría" size="sm">
      <p class="text-gray-600">
        ¿Estás seguro de que deseas eliminar la categoría
        <strong>{{ categoryToDelete?.name }}</strong
        >? Esta acción no se puede deshacer.
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton @click="showDeleteModal = false" variant="outline"> Cancelar </UiButton>
          <UiButton @click="deleteCategory" :loading="deleting" variant="danger">
            Eliminar
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
