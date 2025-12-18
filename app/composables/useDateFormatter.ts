export const useDateFormatter = () => {
  // dayjs está disponible como plugin de Nuxt
  const { $dayjs } = useNuxtApp()
  const dayjs = $dayjs as typeof import('dayjs')

  const formatDate = (date: string | Date, format = 'DD/MM/YYYY') => {
    if (!date) return ''
    return dayjs(date).format(format)
  }

  const formatDateShort = (date: string | Date) => {
    if (!date) return ''
    return dayjs(date).format('DD MMM')
  }

  const formatDateTime = (date: string | Date) => {
    if (!date) return ''
    return dayjs(date).format('DD/MM/YYYY HH:mm')
  }

  const fromNow = (date: string | Date) => {
    if (!date) return ''
    return dayjs(date).fromNow()
  }

  const diffDays = (date1: string | Date, date2: string | Date = new Date()) => {
    if (!date1) return 0
    return dayjs(date1).diff(dayjs(date2), 'days')
  }

  const toISOString = (date: string | Date) => {
    if (!date) return dayjs().toISOString()
    return dayjs(date).toISOString()
  }

  const today = () => {
    return dayjs().format('YYYY-MM-DD')
  }

  return {
    formatDate,
    formatDateShort,
    formatDateTime,
    fromNow,
    diffDays,
    toISOString,
    today,
  }
}
