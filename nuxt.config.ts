// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', 'dayjs-nuxt'],
  devtools: { enabled: true },
  css: ['./app/assets/css/main.css'],

  // PWA instalable (Android e iOS). Sin service worker: ver docs/plans/registro-rapido-de-gastos.md
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'FinanzApp',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'theme-color', content: '#4f46e5' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'FinanzApp' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  dayjs: {
    locales: ['es'],
    defaultLocale: 'es',
    defaultTimezone: 'America/Lima',
    plugins: ['utc', 'timezone', 'relativeTime', 'duration', 'customParseFormat'],
  },

  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2024-04-03',
  alias: {
    '@server': resolve(__dirname, './server'),
    '@api': resolve(__dirname, './server/api'),
    '@components': resolve(__dirname, './app/components'),
    '#types': resolve(__dirname, './app/types'),
  },
  nitro: {
    preset: 'vercel',
  },
})
