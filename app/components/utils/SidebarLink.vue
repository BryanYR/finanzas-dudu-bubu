<template>
  <NuxtLink
    :to="to"
    class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150"
    :class="isActive ? 'bg-white/15 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'"
  >
    <!-- Indicator bar -->
    <span
      class="h-5 w-0.5 rounded-full transition-all"
      :class="isActive ? 'bg-white' : 'bg-transparent group-hover:bg-indigo-400'"
    />
    <!-- Icon -->
    <svg
      class="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <slot name="icon" />
    </svg>
    <!-- Label -->
    <span>
      <slot />
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  to: string
  exact?: boolean
}>()

const route = useRoute()
const isActive = computed(() =>
  props.exact ? route.path === props.to : route.path.startsWith(props.to),
)
</script>
