import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/class-clock/` : '/')

export default defineConfig(({ command }) => ({
  // In local dev we mount under /class-clock/ so hub proxying preserves asset paths.
  base: command === 'serve' ? '/class-clock/' : resolveBuildBase(),
  server: {
    port: 5174,
    strictPort: true,
  },
}))
