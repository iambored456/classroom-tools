import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/paper-airplane-visualizer/' : (process.env.BASE_URL ?? '/'),
  server: { port: 5193, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
}))
