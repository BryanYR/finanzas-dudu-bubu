<script lang="ts" setup>
import MenuIcon from '@components/icons/common/MenuIcon.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <!-- Sidebar -->
    <UtilsSidebar :is-open="sidebarOpen" @toggle="toggleSidebar" @navigate="closeSidebar" />

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden lg:ml-64">
      <!-- Top Navigation Bar -->
      <header
        class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6"
      >
        <button
          @click="toggleSidebar"
          class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        >
          <MenuIcon custom-class="h-6 w-6" />
        </button>

        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-semibold capitalize text-gray-800 lg:text-2xl">
            {{ $route.name !== 'index' ? $route.name : 'Dashboard' }}
          </h1>
        </div>

        <!--
          Espacio reservado para acciones de header (antes había un botón de
          notificaciones puramente decorativo, sin funcionalidad real, que se
          retiró por ser confuso). Reintroducir aquí cuando exista una
          implementación real de notificaciones.
        -->
        <div class="flex items-center space-x-4"></div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
