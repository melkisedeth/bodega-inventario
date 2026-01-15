import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  base: '/bodega-inventario/', // Esto está correcto
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})