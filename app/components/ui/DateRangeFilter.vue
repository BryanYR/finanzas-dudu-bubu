<script setup lang="ts">
import type { DatePreset } from '~/composables/useDateRangeFilter'

const props = withDefaults(defineProps<{ presets?: { val: DatePreset; label: string }[] }>(), {
  presets: () => datePresets,
})

const preset = defineModel<DatePreset>('preset', { required: true })
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })

const emit = defineEmits<{
  (e: 'select-preset', value: DatePreset): void
  (e: 'edit-dates'): void
}>()
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in props.presets"
        :key="p.val"
        type="button"
        @click="emit('select-preset', p.val)"
        class="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm"
        :class="
          preset === p.val
            ? 'bg-gray-800 text-white shadow-sm'
            : 'bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
        "
      >
        {{ p.label }}
      </button>
    </div>
    <div class="flex items-center gap-2">
      <input
        v-model="from"
        type="date"
        :max="to || undefined"
        aria-label="Desde"
        class="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm outline-none focus:border-gray-400 sm:w-auto sm:text-sm"
        @change="emit('edit-dates')"
      />
      <span class="text-xs text-gray-400">a</span>
      <input
        v-model="to"
        type="date"
        :min="from || undefined"
        aria-label="Hasta"
        class="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm outline-none focus:border-gray-400 sm:w-auto sm:text-sm"
        @change="emit('edit-dates')"
      />
    </div>
  </div>
</template>
