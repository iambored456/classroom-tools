import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/classroom-connections/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/classroom-connections/' : resolveBuildBase(),
  plugins: [svelte()],
  server: {
    port: 5186,
    strictPort: true,
  },
}))
