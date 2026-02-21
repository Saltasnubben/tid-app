import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tid/',
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
  },
  server: {
    proxy: {
      '/tid/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tid/, ''),
      }
    }
  }
})
