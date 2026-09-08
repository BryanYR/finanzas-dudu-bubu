<script setup lang="ts">
import { ref } from 'vue'
import WalletIcon from '@components/icons/dashboard/WalletIcon.vue'
import EyeIcon from '@components/icons/common/EyeIcon.vue'
import EyeOffIcon from '@components/icons/common/EyeOffIcon.vue'

definePageMeta({
  layout: false, // Sin layout para página de login
  middleware: ['guest'], // Solo usuarios no autenticados
})

const form = ref({
  email: '',
  password: '',
})

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: form.value,
    })

    // Login exitoso, hacer una recarga completa para que el servidor establezca la sesión
    window.location.href = '/'
  } catch (err: any) {
    error.value = err.data?.message || 'Credenciales inválidas. Intenta nuevamente.'
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <!-- Logo/Header -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600"
        >
          <WalletIcon custom-class="h-6 w-6 text-white" />
        </div>
        <h1 class="mb-2 text-2xl font-bold text-gray-900">Finanzas Dudu Bubu</h1>
        <p class="text-gray-600">Inicia sesión para gestionar tus finanzas</p>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <!-- Email -->
        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-3 transition focus:border-transparent focus:ring-2 focus:ring-primary-500"
            placeholder="tu@email.com"
            :disabled="loading"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="mb-2 block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 transition focus:border-transparent focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
              :disabled="loading"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              :disabled="loading"
            >
              <EyeIcon v-if="showPassword" custom-class="h-5 w-5" />
              <EyeOffIcon v-else custom-class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <UiButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          :disabled="loading"
          class="w-full !py-2"
        >
          {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
        </UiButton>
      </form>

      <!-- Footer -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>¿No tienes cuenta? Contacta al administrador</p>
      </div>
    </div>
  </div>
</template>
