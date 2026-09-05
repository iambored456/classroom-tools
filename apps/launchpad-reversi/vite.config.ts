import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/launchpad-reversi/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/launchpad-reversi/' : resolveBuildBase(),
  plugins: [svelte()],
  server: {
    port: 5190,
    strictPort: true,
  },
}))
