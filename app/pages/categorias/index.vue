<script setup lang="ts">
import type { Category } from '#types/categoria'
import PlusIcon from '@components/icons/common/PlusIcon.vue'
import EditIcon from '@components/icons/common/EditIcon.vue'
import DeleteIcon from '@components/icons/common/DeleteIcon.vue'
import TagIcon from '@components/icons/categorias/TagIcon.vue'

definePageMeta({
  layout: 'default',
})

// Data fetching
const {
  data: categories,
  pending,
  error,
  refresh,
} = await useFetchAuth<Category[]>('/api/categories')
const $authFetch = useAuthFetch()

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
    await $authFetch(`/api/categories/${categoryToDelete.value.id}`, {
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
          <PlusIcon custom-class="mr-2 h-10 w-10" />
          Nueva Categoría
        </template>
      </UiButton>
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
        @click="filterType = 'income'"
        :variant="filterType === 'income' ? 'success' : 'outline'"
        size="sm"
      >
        Ingresos
      </UiButton>
      <UiButton
        @click="filterType = 'expense'"
        :variant="filterType === 'expense' ? 'danger' : 'outline'"
        size="sm"
      >
        Gastos
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
        <span v-if="value" class="text-2xl">{{ value }}</span>
        <TagIcon v-else custom-class="h-5 w-5 text-gray-400" />
      </template>

      <template #cell-color="{ value }">
        <div class="flex items-center gap-2">
          <div
            class="h-6 w-6 rounded-full border border-gray-300"
            :style="{ backgroundColor: value || '#6B7280' }"
          ></div>
          <span class="text-xs text-gray-600">{{ value || '#6B7280' }}</span>
        </div>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center gap-2">
          <UiButton
            @click="openEditModal(item)"
            variant="ghost"
            size="sm"
            :icon="EditIcon"
            title="Editar"
          />
          <UiButton
            @click="openDeleteModal(item)"
            variant="danger"
            size="sm"
            :icon="DeleteIcon"
            title="Eliminar"
          />
        </div>
      </template>

      <template #empty>
        <div class="text-center">
          <TagIcon custom-class="mx-auto h-10 w-10 text-gray-400" />
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
