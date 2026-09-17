import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/face-to-name/' : (process.env.BASE_URL ?? '/face-to-name/'),
  plugins: [svelte()],
  server: { port: 5193, strictPort: true },
}))
