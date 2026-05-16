import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  base: '/S37/',
  plugins: [tailwindcss(), react(), svgr()],
  resolve: {
    alias: {
      'fractapay-shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
})
