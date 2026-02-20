import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/read-along-highlighter/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/read-along-highlighter/' : resolveBuildBase(),
  server: {
    port: 5175,
    strictPort: true,
  },
}))
