<script setup lang="ts">
import { ref } from 'vue'

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
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <!-- Logo/Header -->
      <div class="mb-8 text-center">
        <h1 class="mb-2 text-3xl font-bold text-gray-800">💰 Finanzas Dudu Bubu</h1>
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
            class="w-full rounded-lg border border-gray-300 px-4 py-3 transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
              class="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              :disabled="loading"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              :disabled="loading"
            >
              <!-- Ojo abierto (mostrar contraseña) -->
              <svg
                v-if="showPassword"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <!-- Ojo cerrado (ocultar contraseña) -->
              <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
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
