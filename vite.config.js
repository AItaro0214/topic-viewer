import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/topic-viewer/',
  build: {
    target: ['es2015', 'safari11'],
  },
})
