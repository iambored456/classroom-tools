import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/tax-brackets-marble-visual/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/tax-brackets-marble-visual/' : resolveBuildBase(),
  server: {
    port: 5179,
    strictPort: true,
  },
}))
