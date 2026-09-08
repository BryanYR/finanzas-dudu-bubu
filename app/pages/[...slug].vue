<script setup lang="ts">
import HomeIcon from '@components/icons/common/HomeIcon.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="mb-4 text-6xl font-bold text-gray-800">404</h1>
      <p class="mb-8 text-xl text-gray-600">Página no encontrada</p>
      <NuxtLink
        to="/"
        class="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 text-white transition hover:bg-primary-700"
      >
        <HomeIcon custom-class="mr-2 h-5 w-5" />
        Volver al inicio
      </NuxtLink>
    </div>
  </div>
</template>
