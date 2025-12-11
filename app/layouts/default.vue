<script lang="ts" setup>
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
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-semibold capitalize text-gray-800 lg:text-2xl">
            {{ $route.name !== 'index' ? $route.name : 'Dashboard' }}
          </h1>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Notifications -->
          <button
            class="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            title="Notificaciones"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              class="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500"
            ></span>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
