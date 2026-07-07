import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/brasil-em-dados/' : '/',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
}))
