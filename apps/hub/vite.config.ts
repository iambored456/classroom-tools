import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/class-clock': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/read-along-highlighter': {
        target: 'http://localhost:5175',
        changeOrigin: true,
      },
      '/launchpad-whack-a-mole': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
    },
  },
})
