import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Finances-Dashboard/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.jsx',
    css: false,
  },
})
