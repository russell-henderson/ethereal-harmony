// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  assetsInclude: ['**/*.vert', '**/*.frag'],
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.(tsx|ts)$/,
  }
})
