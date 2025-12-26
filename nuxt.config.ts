// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', 'dayjs-nuxt'],
  devtools: { enabled: true },
  css: ['./app/assets/css/main.css'],

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
