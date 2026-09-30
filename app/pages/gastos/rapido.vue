<script setup lang="ts">
import type { Expense } from '#types/gasto'
import type { Category } from '#types/categoria'
import type { CreditCard } from '#types/tarjeta'

definePageMeta({ layout: 'default' })

const toast = useToast()
const $authFetch = useAuthFetch()
const { today, toISOString, formatCurrency } = useDateFormatter()
const { $dayjs } = useNuxtApp()
const dayjs = $dayjs as typeof import('dayjs')

// Método de pago recordado por dispositivo: 'cash' | 'debit' | 'card:<id>'
const LAST_METHOD_KEY = 'quickExpense:lastMethod'
const TOP_CATEGORIES = 8
const USAGE_WINDOW_DAYS = 90

const categories = ref<Category[]>([])
const creditCards = ref<CreditCard[]>([])
const usage = ref<Record<number, number>>({})
const loading = ref(true)
const saving = ref(false)
const showAllCategories = ref(false)
const showDetails = ref(false)
const amountInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  amount: '',
  categoryId: 0,
  method: 'cash',
  description: '',
  date: today(),
  installments: 1,
})

const lastSaved = ref<{ id: number; label: string } | null>(null)
const undoing = ref(false)

const readLastMethod = () => {
  try {
    return localStorage.getItem(LAST_METHOD_KEY)
  } catch {
    return null
  }
}
const writeLastMethod = (value: string) => {
  try {
    localStorage.setItem(LAST_METHOD_KEY, value)
  } catch {
    // Almacenamiento no disponible (modo privado): se usa efectivo por defecto
  }
}

const fetchAll = async () => {
  loading.value = true
  try {
    const [exp, cats, cards] = await Promise.all([
      $authFetch<Expense[]>('/api/expenses'),
      $authFetch<Category[]>('/api/categories'),
      $authFetch<CreditCard[]>('/api/credit-cards'),
    ])
    categories.value = cats
    creditCards.value = cards

    const since = dayjs().subtract(USAGE_WINDOW_DAYS, 'day')
    usage.value = exp
      .filter((e) => dayjs(e.date).isAfter(since))
      .reduce(
        (acc, e) => {
          acc[e.categoryId] = (acc[e.categoryId] || 0) + 1
          return acc
        },
        {} as Record<number, number>
      )

    const saved = readLastMethod()
    if (saved && methodOptions.value.some((m) => m.key === saved)) form.method = saved
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al cargar los datos'))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchAll()
  amountInput.value?.focus()
})

// Categorías de gasto, las más usadas primero; empate → orden alfabético
const sortedCategories = computed(() =>
  categories.value
    .filter((c) => c.type === 'expense')
    .sort(
      (a, b) => (usage.value[b.id] || 0) - (usage.value[a.id] || 0) || a.name.localeCompare(b.name)
    )
)

const visibleCategories = computed(() => {
  if (showAllCategories.value) return sortedCategories.value
  const top = sortedCategories.value.slice(0, TOP_CATEGORIES)
  // Si la categoría elegida quedó fuera del top, se mantiene visible
  const selected = sortedCategories.value.find((c) => c.id === form.categoryId)
  return selected && !top.includes(selected) ? [...top, selected] : top
})

const methodOptions = computed(() => [
  { key: 'cash', label: 'Efectivo', sub: '' },
  { key: 'debit', label: 'Débito', sub: '' },
  ...creditCards.value
    .filter((c) => c.isActive !== false)
    .map((c) => ({ key: `card:${c.id}`, label: c.name, sub: `•••• ${c.lastDigits}` })),
])

const selectedCard = computed(() => {
  if (!form.method.startsWith('card:')) return null
  const id = Number(form.method.slice(5))
  return creditCards.value.find((c) => c.id === id) ?? null
})

const parsedAmount = computed(() => {
  const n = Number(String(form.amount).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
})

const installmentCost = computed(() =>
  computeInstallmentCost(selectedCard.value, parsedAmount.value, Number(form.installments))
)

const selectedCategory = computed(
  () => categories.value.find((c) => c.id === form.categoryId) ?? null
)

const canSave = computed(() => parsedAmount.value > 0 && form.categoryId > 0 && !saving.value)

const isYesterday = computed(() => form.date === dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
const isToday = computed(() => form.date === today())

watch(
  () => form.method,
  () => {
    if (!selectedCard.value) form.installments = 1
  }
)

const resetForm = () => {
  form.amount = ''
  form.categoryId = 0
  form.description = ''
  form.date = today()
  form.installments = 1
  showAllCategories.value = false
  showDetails.value = false
}

const handleSave = async () => {
  if (!canSave.value) return
  saving.value = true

  const card = selectedCard.value
  const paymentMethod = card ? 'credit' : form.method
  const cost = installmentCost.value
  const categoryName = selectedCategory.value?.name ?? 'Gasto'

  const body = {
    amount: parsedAmount.value,
    // El backend exige descripción; si se deja vacía se usa el nombre de la categoría
    description: form.description.trim() || categoryName,
    date: toISOString(form.date),
    isRecurring: false,
    categoryId: form.categoryId,
    paymentMethod,
    creditCardId: card?.id,
    installments: card && form.installments > 1 ? Number(form.installments) : undefined,
    installmentAmount: card && cost ? cost.monthlyPayment : undefined,
    totalWithInterest: card && cost && cost.totalInterest > 0 ? cost.totalToPay : undefined,
  }

  try {
    const created = await $authFetch<Expense>('/api/expenses', { method: 'POST', body })
    writeLastMethod(form.method)
    usage.value[form.categoryId] = (usage.value[form.categoryId] || 0) + 1

    const methodLabel = methodOptions.value.find((m) => m.key === form.method)?.label ?? ''
    lastSaved.value = {
      id: created.id,
      label: `${formatCurrency(body.amount)} · ${categoryName} · ${methodLabel}`,
    }
    toast.success(`Gasto registrado: ${lastSaved.value.label}`, 2500)
    resetForm()
    amountInput.value?.focus()
  } catch (err) {
    toast.error(getErrorMessage(err, 'Error al guardar el gasto'))
  } finally {
    saving.value = false
  }
}

const handleUndo = async () => {
  if (!lastSaved.value) return
  undoing.value = true
  try {
    await $authFetch(`/api/expenses/${lastSaved.value.id}`, { method: 'DELETE' })
    toast.info('Gasto eliminado')
    lastSaved.value = null
  } catch (err) {
    toast.error(getErrorMessage(err, 'No se pudo deshacer'))
  } finally {
    undoing.value = false
  }
}

const chipClass = (active: boolean) =>
  active
    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
    : 'border-gray-200 bg-white text-gray-700 active:bg-gray-100'
</script>

<template>
  <div class="mx-auto max-w-lg space-y-5">
    <div class="flex items-center justify-between">
      <NuxtLink to="/gastos" class="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Gastos
      </NuxtLink>
      <span v-if="loading" class="text-xs text-gray-400">Cargando…</span>
    </div>

    <form class="space-y-5" @submit.prevent="handleSave">
      <!-- Monto -->
      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <label for="quick-amount" class="text-xs font-medium uppercase tracking-wide text-gray-400">
          Monto
        </label>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-2xl font-semibold text-gray-400">S/</span>
          <input
            id="quick-amount"
            ref="amountInput"
            v-model="form.amount"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            enterkeyhint="done"
            placeholder="0.00"
            class="w-full bg-transparent text-4xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none"
          />
        </div>
      </div>

      <!-- Categoría -->
      <section>
        <h2 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Categoría</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in visibleCategories"
            :key="cat.id"
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition"
            :class="chipClass(form.categoryId === cat.id)"
            @click="form.categoryId = cat.id"
          >
            <span
              v-if="cat.color"
              class="h-2.5 w-2.5 rounded-full"
              :style="{ backgroundColor: cat.color }"
            ></span>
            {{ cat.name }}
          </button>
          <button
            v-if="sortedCategories.length > TOP_CATEGORIES"
            type="button"
            class="rounded-full border border-dashed border-gray-300 px-3.5 py-2 text-sm text-gray-500"
            @click="showAllCategories = !showAllCategories"
          >
            {{ showAllCategories ? 'Menos' : 'Más…' }}
          </button>
        </div>
      </section>

      <!-- Medio de pago -->
      <section>
        <h2 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Pagado con</h2>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="m in methodOptions"
            :key="m.key"
            type="button"
            class="rounded-xl border px-3 py-2.5 text-left transition"
            :class="chipClass(form.method === m.key)"
            @click="form.method = m.key"
          >
            <span class="block truncate text-sm font-semibold">{{ m.label }}</span>
            <span v-if="m.sub" class="block text-xs text-gray-400">{{ m.sub }}</span>
          </button>
        </div>
      </section>

      <!-- Fecha -->
      <section class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border px-3.5 py-2 text-sm font-medium"
          :class="chipClass(isToday)"
          @click="form.date = today()"
        >
          Hoy
        </button>
        <button
          type="button"
          class="rounded-full border px-3.5 py-2 text-sm font-medium"
          :class="chipClass(isYesterday)"
          @click="form.date = dayjs().subtract(1, 'day').format('YYYY-MM-DD')"
        >
          Ayer
        </button>
        <input
          v-model="form.date"
          type="date"
          aria-label="Fecha del gasto"
          class="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        />
      </section>

      <!-- Detalles opcionales -->
      <div>
        <button
          type="button"
          class="text-sm font-medium text-indigo-600"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Ocultar detalles' : '+ Descripción'
          }}{{ selectedCard && !showDetails ? ' / cuotas' : '' }}
        </button>

        <div v-if="showDetails" class="mt-3 space-y-3">
          <input
            v-model="form.description"
            type="text"
            maxlength="255"
            :placeholder="selectedCategory ? `Ej: ${selectedCategory.name}` : 'Descripción'"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div v-if="selectedCard" class="flex items-center gap-3">
            <label for="quick-installments" class="text-sm text-gray-600">Cuotas</label>
            <input
              id="quick-installments"
              v-model.number="form.installments"
              type="number"
              inputmode="numeric"
              min="1"
              max="60"
              class="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <span v-if="installmentCost" class="text-sm text-gray-500">
              {{ formatCurrency(installmentCost.monthlyPayment) }}/mes
              <span v-if="installmentCost.totalInterest > 0" class="text-red-500">
                (+{{ formatCurrency(installmentCost.totalInterest) }})
              </span>
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="!canSave"
        class="flex h-14 w-full items-center justify-center rounded-2xl bg-red-500 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:bg-gray-300"
      >
        {{
          saving
            ? 'Guardando…'
            : parsedAmount > 0
              ? `Registrar ${formatCurrency(parsedAmount)}`
              : 'Registrar gasto'
        }}
      </button>
    </form>

    <!-- Último registrado -->
    <div
      v-if="lastSaved"
      class="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm ring-1 ring-emerald-100"
    >
      <span class="text-emerald-800">✓ {{ lastSaved.label }}</span>
      <button
        type="button"
        :disabled="undoing"
        class="shrink-0 font-semibold text-emerald-700 underline disabled:opacity-50"
        @click="handleUndo"
      >
        Deshacer
      </button>
    </div>
  </div>
</template>
