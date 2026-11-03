import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // GitHub Pages serve il sito da /<nome-repo>/: il workflow passa VITE_BASE
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
