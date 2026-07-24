import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://transfermarkt-api.fly.dev',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/ceapi': {
        target: 'https://www.transfermarkt.com.tr',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ceapi/, '/ceapi')
      }
    }
  }
})
