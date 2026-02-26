import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/fish-visualizer/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/fish-visualizer/' : resolveBuildBase(),
  server: {
    port: 5177,
    strictPort: true,
  },
}))
