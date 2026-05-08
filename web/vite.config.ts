import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'fractapay-shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
})
