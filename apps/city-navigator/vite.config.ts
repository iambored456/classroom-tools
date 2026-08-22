import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/city-navigator/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/city-navigator/' : resolveBuildBase(),
  plugins: [svelte()],
  server: {
    port: 5185,
    strictPort: true,
  },
}))
