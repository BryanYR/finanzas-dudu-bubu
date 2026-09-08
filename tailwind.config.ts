import colors from 'tailwindcss/colors'

export default {
  content: ['./components/**/*.{vue,js,ts}', './layouts/**/*.vue', './pages/**/*.vue', './app.vue'],
  theme: {
    extend: {
      colors: {
        // Color de marca. Usar `primary-*` en vez de `indigo-*`/`emerald-*` sueltos
        // en todo el código nuevo para que el acento de marca quede centralizado aquí.
        primary: colors.emerald,
      },
    },
  },
  plugins: [],
}
