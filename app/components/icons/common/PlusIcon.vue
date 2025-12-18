<template>
  <svg class="h-5 w-5" :class="customClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>
