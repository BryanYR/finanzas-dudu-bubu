export type DatePreset =
  | 'all'
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'last-12-months'
  | 'this-year'
  | 'custom'

export const datePresets: { val: DatePreset; label: string }[] = [
  { val: 'all', label: 'Todo' },
  { val: 'this-month', label: 'Este mes' },
  { val: 'last-month', label: 'Mes anterior' },
  { val: 'last-3-months', label: 'Últimos 3 meses' },
  { val: 'this-year', label: 'Este año' },
]

// Atajos para Reportes (rangos más largos que en las listas)
export const reportPresets: { val: DatePreset; label: string }[] = [
  { val: 'this-month', label: 'Este mes' },
  { val: 'last-month', label: 'Mes anterior' },
  { val: 'last-3-months', label: '3 meses' },
  { val: 'last-6-months', label: '6 meses' },
  { val: 'last-12-months', label: '12 meses' },
  { val: 'this-year', label: 'Este año' },
]

/**
 * Estado de un filtro por rango de fechas con atajos (este mes, mes anterior, etc.).
 * `from`/`to` son strings YYYY-MM-DD (vacío = sin límite) y se comparan contra la
 * misma fecha que muestra la UI (`dayjs(date).format('YYYY-MM-DD')`).
 */
export const useDateRangeFilter = () => {
  const { $dayjs } = useNuxtApp()
  const dayjs = $dayjs as typeof import('dayjs')

  const preset = ref<DatePreset>('all')
  const from = ref('')
  const to = ref('')

  const fmt = (d: ReturnType<typeof dayjs>) => d.format('YYYY-MM-DD')

  const applyPreset = (p: DatePreset) => {
    const now = dayjs()
    preset.value = p
    if (p === 'all') {
      from.value = ''
      to.value = ''
    } else if (p === 'this-month') {
      from.value = fmt(now.startOf('month'))
      to.value = fmt(now.endOf('month'))
    } else if (p === 'last-month') {
      const last = now.subtract(1, 'month')
      from.value = fmt(last.startOf('month'))
      to.value = fmt(last.endOf('month'))
    } else if (p === 'last-3-months') {
      from.value = fmt(now.subtract(2, 'month').startOf('month'))
      to.value = fmt(now.endOf('month'))
    } else if (p === 'last-6-months') {
      from.value = fmt(now.subtract(5, 'month').startOf('month'))
      to.value = fmt(now.endOf('month'))
    } else if (p === 'last-12-months') {
      from.value = fmt(now.subtract(11, 'month').startOf('month'))
      to.value = fmt(now.endOf('month'))
    } else if (p === 'this-year') {
      from.value = fmt(now.startOf('year'))
      to.value = fmt(now.endOf('year'))
    }
  }

  // Al editar una fecha a mano el atajo deja de aplicar
  const setCustom = () => {
    preset.value = from.value || to.value ? 'custom' : 'all'
  }

  const matches = (date: string | Date) => {
    if (!from.value && !to.value) return true
    const day = fmt(dayjs(date))
    if (from.value && day < from.value) return false
    if (to.value && day > to.value) return false
    return true
  }

  const isActive = computed(() => !!from.value || !!to.value)

  return { preset, from, to, applyPreset, setCustom, matches, isActive }
}
