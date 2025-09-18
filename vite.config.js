import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true, // Allow external connections
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}) 