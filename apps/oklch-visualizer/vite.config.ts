import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/oklch-visualizer/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/oklch-visualizer/' : resolveBuildBase(),
  // Scan the app entry only; legacy and reference folders are separate projects.
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5180,
    strictPort: true,
  },
}))
