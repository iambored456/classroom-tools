import { resolve } from 'node:path'

import { defineConfig } from 'vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/class-schedule-widget/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/class-schedule-widget/' : resolveBuildBase(),
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        widget: resolve(__dirname, 'widget.html'),
      },
    },
  },
  server: {
    port: 5181,
    strictPort: true,
  },
}))
