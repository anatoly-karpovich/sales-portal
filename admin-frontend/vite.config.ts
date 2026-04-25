import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('numeral')) {
            return 'charts-vendor'
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-vendor'
          }

          if (id.includes('socket.io-client')) {
            return 'socket-vendor'
          }

          if (id.includes('@tanstack/react-query') || id.includes('axios')) {
            return 'data-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
