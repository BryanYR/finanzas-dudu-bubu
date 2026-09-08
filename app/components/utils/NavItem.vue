<template>
  <NuxtLink
    :to="to"
    class="group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150"
    :class="[
      collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5',
      isActive
        ? 'bg-white/20 text-white shadow-sm'
        : 'text-indigo-200 hover:bg-white/10 hover:text-white',
    ]"
    :title="collapsed ? label : undefined"
  >
    <!-- Active indicator (solo expandido) -->
    <span
      v-if="!collapsed"
      class="h-5 w-0.5 shrink-0 rounded-full transition-all"
      :class="isActive ? 'bg-white' : 'bg-transparent group-hover:bg-indigo-400'"
    />

    <!-- Ícono -->
    <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <slot name="icon" />
    </svg>

    <!-- Etiqueta (solo expandido) -->
    <span v-if="!collapsed" class="truncate">
      <slot />
    </span>

    <!-- Tooltip (solo colapsado) -->
    <span
      v-if="collapsed"
      class="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block"
    >
      <slot />
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  to: string
  exact?: boolean
  collapsed: boolean
}>()

const route = useRoute()
const label = computed(() => '')

const isActive = computed(() =>
  props.exact ? route.path === props.to : route.path.startsWith(props.to)
)
</script>
