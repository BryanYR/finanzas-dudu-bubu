<script setup lang="ts">
interface Category {
  id?: number
  name: string
  type: string
  icon?: string
  color?: string
}

const props = defineProps<{
  category?: Category | null
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [category: Category]
}>()

const saving = ref(false)

const form = reactive({
  name: '',
  type: '',
  icon: '',
  color: '#6B7280',
})

const resetForm = () => {
  form.name = ''
  form.type = ''
  form.icon = ''
  form.color = '#6B7280'
}

// Watch category prop to populate form
watch(
  () => props.category,
  (newCategory) => {
    if (newCategory) {
      form.name = newCategory.name
      form.type = newCategory.type
      form.icon = newCategory.icon || ''
      form.color = newCategory.color || '#6B7280'
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch show prop to reset form when modal opens for new category
watch(
  () => props.show,
  (isShowing) => {
    if (isShowing && !props.category) {
      resetForm()
    } else if (isShowing && props.category) {
      // Asegurar que el formulario se actualice cuando se abre para editar
      form.name = props.category.name
      form.type = props.category.type
      form.icon = props.category.icon || ''
      form.color = props.category.color || '#6B7280'
    }
  }
)

const handleClose = () => {
  emit('update:show', false)
  resetForm()
}

const handleSave = async () => {
  saving.value = true

  // Preparar datos a enviar, asegurando que icon y color no sean strings vacíos
  const dataToSend = {
    name: form.name,
    type: form.type,
    icon: form.icon || undefined,
    color: form.color || '#6B7280',
  }

  console.log('Guardando categoría:', dataToSend)

  try {
    if (props.category?.id) {
      // Update existing category
      await $fetch(`/api/categories/${props.category.id}`, {
        method: 'PUT',
        body: dataToSend,
      })
    } else {
      // Create new category
      await $fetch('/api/categories', {
        method: 'POST',
        body: dataToSend,
      })
    }
    emit('save', dataToSend)
    emit('update:show', false)
    // Reset después de cerrar exitosamente
    setTimeout(() => resetForm(), 300)
  } catch (err) {
    console.error('Error al guardar categoría:', err)
    alert('Error al guardar la categoría')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="show"
    @update:model-value="handleClose"
    :title="category ? 'Editar Categoría' : 'Nueva Categoría'"
    size="md"
  >
    <form @submit.prevent="handleSave" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">
          Nombre <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Ej: Alimentación"
        />
      </div>

      <div>
        <label for="type" class="block text-sm font-medium text-gray-700">
          Tipo <span class="text-red-500">*</span>
        </label>
        <select
          id="type"
          v-model="form.type"
          required
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar...</option>
          <option value="income">Ingreso</option>
          <option value="expense">Gasto</option>
        </select>
      </div>

      <div>
        <label for="icon" class="block text-sm font-medium text-gray-700"> Icono (Emoji) </label>
        <input
          id="icon"
          v-model="form.icon"
          type="text"
          maxlength="2"
          class="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Ej: 🍔"
        />
        <p class="mt-1 text-xs text-gray-500">
          Puedes copiar un emoji desde
          <a href="https://emojipedia.org/" target="_blank" class="text-indigo-600 hover:underline"
            >Emojipedia</a
          >
        </p>
      </div>

      <div>
        <label for="color" class="block text-sm font-medium text-gray-700"> Color </label>
        <div class="mt-1 flex gap-2">
          <input
            id="color"
            v-model="form.color"
            type="color"
            class="h-10 w-20 cursor-pointer rounded-lg border border-gray-300"
          />
          <input
            v-model="form.color"
            type="text"
            pattern="^#[0-9A-Fa-f]{6}$"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="#6B7280"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">
          Selecciona un color o ingresa un código hexadecimal
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton @click="handleClose" variant="outline"> Cancelar </UiButton>
        <UiButton @click="handleSave" :loading="saving" variant="primary">
          {{ category ? 'Actualizar' : 'Crear' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
