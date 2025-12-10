<template>
  <div class="w-full">
    <!-- Search and Items per page -->
    <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <label for="items-per-page" class="text-sm text-gray-700">Mostrar:</label>
        <select
          id="items-per-page"
          v-model.number="itemsPerPageModel"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <span class="text-sm text-gray-700">registros</span>
      </div>

      <div v-if="searchable" class="flex-1 sm:max-w-xs">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700"
              :class="column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''"
              @click="column.sortable ? sort(column.key) : null"
            >
              <div class="flex items-center gap-2">
                <span>{{ column.label }}</span>
                <template v-if="column.sortable">
                  <svg
                    v-if="sortBy === column.key && sortOrder === 'asc'"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  <svg
                    v-else-if="sortBy === column.key && sortOrder === 'desc'"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <svg
                    v-else
                    class="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </template>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-if="paginatedData.length === 0">
            <td :colspan="columns.length" class="px-6 py-8 text-center text-gray-500">
              <slot name="empty"> No hay datos disponibles </slot>
            </td>
          </tr>
          <tr
            v-for="(item, index) in paginatedData"
            :key="index"
            class="transition-colors hover:bg-gray-50"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
            >
              <slot :name="`cell-${column.key}`" :item="item" :value="item[column.key]">
                {{ item[column.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-sm text-gray-700">
        Mostrando {{ startItem }} a {{ endItem }} de {{ totalItems }} registros
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          :class="[
            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            currentPage === page
              ? 'border-indigo-500 bg-indigo-500 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50',
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface Props {
  data: T[]
  columns: Column[]
  itemsPerPage?: number
  itemsPerPageOptions?: number[]
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 10,
  itemsPerPageOptions: () => [5, 10, 25, 50, 100],
  searchable: true,
})

const currentPage = ref(1)
const itemsPerPageModel = ref(props.itemsPerPage)
const searchQuery = ref('')
const sortBy = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Filtrado por búsqueda
const filteredData = computed(() => {
  if (!searchQuery.value) return props.data

  const query = searchQuery.value.toLowerCase()
  return props.data.filter((item) => {
    return Object.values(item).some((value) => String(value).toLowerCase().includes(query))
  })
})

// Ordenamiento
const sortedData = computed(() => {
  if (!sortBy.value) return filteredData.value

  return [...filteredData.value].sort((a, b) => {
    const aVal = a[sortBy.value]
    const bVal = b[sortBy.value]

    if (aVal === bVal) return 0

    const comparison = aVal > bVal ? 1 : -1
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
})

// Paginación
const totalItems = computed(() => sortedData.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPageModel.value))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPageModel.value
  const end = start + itemsPerPageModel.value
  return sortedData.value.slice(start, end)
})

const startItem = computed(() => {
  if (totalItems.value === 0) return 0
  return (currentPage.value - 1) * itemsPerPageModel.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * itemsPerPageModel.value
  return Math.min(end, totalItems.value)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

const sort = (key: string) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Reset a página 1 cuando cambia la búsqueda o items por página
watch([searchQuery, itemsPerPageModel], () => {
  currentPage.value = 1
})
</script>
