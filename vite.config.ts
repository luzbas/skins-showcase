import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works from any GitHub Pages path. Routing is hash-based for the same reason.
export default defineConfig({
  plugins: [react()],
  base: './',
})
