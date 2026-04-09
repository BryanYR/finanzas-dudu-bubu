<script setup lang="ts">
import type { Category } from '#types/categoria'

definePageMeta({ layout: 'default' })

const toast = useToast()
const confirm = useConfirm()

const { data: categories, pending, error, refresh } = await useFetchAuth<Category[]>('/api/categories')

const showFormModal = ref(false)
const deleting = ref(false)
const editingCategory = ref<Category | null>(null)
const filterType = ref<'all' | 'income' | 'expense'>('all')
const searchQuery = ref('')

const filteredCategories = computed(() => {
  let list = categories.value ?? []
  if (filterType.value !== 'all') list = list.filter((c) => c.type === filterType.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((c) => c.name.toLowerCase().includes(q))
  }
  return list
})

const incomeCount = computed(() => (categories.value ?? []).filter((c) => c.type === 'income').length)
const expenseCount = computed(() => (categories.value ?? []).filter((c) => c.type === 'expense').length)

const openCreateModal = () => {
  editingCategory.value = null
  showFormModal.value = true
}

const openEditModal = (category: Category) => {
  editingCategory.value = category
  showFormModal.value = true
}

const handleSave = () => refresh()

const deleteCategory = async (category: Category) => {
  const ok = await confirm.confirm({
    title: 'Eliminar categoría',
    message: `¿Seguro que deseas eliminar "${category.name}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await $fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
    await refresh()
  } catch {
    toast.error('Error al eliminar la categoría')
  } finally {
    deleting.value = false
  }
}

const filters = [
  { val: 'all', label: 'Todas' },
  { val: 'income', label: 'Ingresos' },
  { val: 'expense', label: 'Gastos' },
] as const
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 lg:text-2xl">Categorías</h1>
        <p class="text-sm text-gray-500">{{ (categories ?? []).length }} categorías en total</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Nueva Categoría
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
        <p class="mt-1.5 text-lg font-bold text-indigo-600 lg:text-xl">
          {{ (categories ?? []).length }}
        </p>
        <p class="mt-0.5 text-xs text-gray-400">categorías</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Ingresos</p>
        <p class="mt-1.5 text-lg font-bold text-emerald-600 lg:text-xl">{{ incomeCount }}</p>
        <p class="mt-0.5 text-xs text-gray-400">categorías</p>
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Gastos</p>
        <p class="mt-1.5 text-lg font-bold text-red-500 lg:text-xl">{{ expenseCount }}</p>
        <p class="mt-0.5 text-xs text-gray-400">categorías</p>
      </div>
    </div>

    <!-- Filters + Search -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.val"
          @click="filterType = f.val"
          class="rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            filterType === f.val
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
          "
        >
          {{ f.label }}
        </button>
      </div>
      <div class="relative flex-1">
        <svg
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar categoría..."
          class="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-16">
      <div class="border-3 h-8 w-8 animate-spin rounded-full border-indigo-500 border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      Error al cargar las categorías: {{ error.message }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredCategories.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-100"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
        <svg class="h-8 w-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-700">
        {{ searchQuery ? 'Sin resultados' : 'No hay categorías aún' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ searchQuery ? 'Prueba con otro término.' : 'Crea tu primera categoría.' }}
      </p>
      <button
        v-if="!searchQuery"
        @click="openCreateModal"
        class="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Nueva Categoría
      </button>
    </div>

    <!-- Grid de categorías -->
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="category in filteredCategories"
        :key="category.id"
        class="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
      >
        <!-- Icon -->
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm ring-1 ring-gray-100"
          :style="
            category.color
              ? `background-color: ${category.color}20; color: ${category.color}`
              : ''
          "
          :class="!category.color ? 'bg-gray-50 text-gray-500' : ''"
        >
          {{ category.icon || '📁' }}
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-800">{{ category.name }}</p>
          <div class="mt-1 flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="
                category.type === 'income'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              "
            >
              {{ category.type === 'income' ? 'Ingreso' : 'Gasto' }}
            </span>
            <div
              v-if="category.color"
              class="h-3 w-3 rounded-full ring-1 ring-gray-200"
              :style="{ backgroundColor: category.color }"
            ></div>
            <span v-if="category.color" class="text-[10px] text-gray-400">{{ category.color }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            @click="openEditModal(category)"
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
            @click="deleteCategory(category)"
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

    <!-- Modal formulario -->
    <CategoriasCategoryFormModal
      v-model:show="showFormModal"
      :category="editingCategory"
      @save="handleSave"
    />
  </div>
</template>
