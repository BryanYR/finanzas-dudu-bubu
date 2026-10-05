<script setup lang="ts">
interface Option {
  value: number | string
  label: string
  icon?: string
}

const props = defineProps<{ options: Option[]; placeholder: string }>()
const selected = defineModel<(number | string)[]>({ required: true })

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const toggle = (v: number | string) => {
  selected.value = selected.value.includes(v)
    ? selected.value.filter((x) => x !== v)
    : [...selected.value, v]
}

const label = computed(() => {
  if (!selected.value.length) return props.placeholder
  if (selected.value.length === 1)
    return props.options.find((o) => o.value === selected.value[0])?.label ?? props.placeholder
  return `${selected.value.length} seleccionadas`
})

const onClickOutside = (e: MouseEvent) => {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      @click="open = !open"
      class="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm shadow-sm outline-none transition hover:bg-gray-50"
      :class="selected.length ? 'font-medium text-gray-800' : 'text-gray-500'"
    >
      <span class="truncate">{{ label }}</span>
      <svg
        class="h-4 w-4 shrink-0 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div
      v-if="open"
      class="absolute left-0 z-20 mt-1 max-h-64 w-full min-w-[12rem] overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200"
    >
      <p v-if="!options.length" class="px-3 py-2 text-xs text-gray-400">Sin opciones</p>
      <label
        v-for="o in options"
        :key="o.value"
        class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <input
          type="checkbox"
          :checked="selected.includes(o.value)"
          class="rounded border-gray-300"
          @change="toggle(o.value)"
        />
        <span v-if="o.icon">{{ o.icon }}</span>
        <span class="truncate">{{ o.label }}</span>
      </label>
      <button
        v-if="selected.length"
        type="button"
        class="w-full border-t border-gray-100 px-3 py-1.5 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
        @click="selected = []"
      >
        Limpiar selección
      </button>
    </div>
  </div>
</template>
