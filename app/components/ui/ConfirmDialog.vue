<script setup lang="ts">
import { useConfirm } from '~/composables/useConfirm'

const { confirmState, accept, cancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="confirmState.open"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-4"
        @click.self="cancel"
      >
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ confirmState.options.title || 'Confirmar acción' }}
          </h3>
          <p class="mt-2 text-sm text-gray-600">{{ confirmState.options.message }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              @click="cancel"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {{ confirmState.options.cancelText || 'Cancelar' }}
            </button>
            <button
              @click="accept"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-medium text-white',
                confirmState.options.danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700',
              ]"
            >
              {{ confirmState.options.confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
