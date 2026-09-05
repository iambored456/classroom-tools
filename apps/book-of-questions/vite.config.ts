import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

const resolveBuildBase = () =>
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/book-of-questions/` : '/')

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/book-of-questions/' : resolveBuildBase(),
  plugins: [svelte()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          if (normalizedId.endsWith('/src/would-you-rather-questions.json')) {
            return 'would-you-rather-bank'
          }
          if (
            normalizedId.endsWith('/src/questions.json') ||
            normalizedId.endsWith('/src/kids-questions.json')
          ) {
            return 'question-bank'
          }
        },
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
  },
}))
