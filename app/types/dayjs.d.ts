import type { Dayjs } from 'dayjs'

declare module '#app' {
  interface NuxtApp {
    $dayjs: typeof import('dayjs')
    $authFetch: typeof $fetch
  }
}

export {}
