import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.BASE_URL ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [svelte()],
  server: {
    port: 5173,
    // The launcher reuses a matching server on this port. Never silently move the hub,
    // because all classroom-tool URLs are intentionally rooted at localhost:5173.
    strictPort: true,
    proxy: {
      '/class-clock': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/class-schedule-widget': {
        target: 'http://localhost:5181',
        changeOrigin: true,
      },
      '/classroom-connections': {
        target: 'http://localhost:5186',
        changeOrigin: true,
      },
      '/book-of-questions': {
        target: 'http://localhost:5188',
        changeOrigin: true,
      },
      '/classroom-wordle': {
        target: 'http://localhost:5187',
        changeOrigin: true,
      },
      '/read-along-highlighter': {
        target: 'http://localhost:5175',
        changeOrigin: true,
      },
      '/launchpad-whack-a-mole': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
      '/fish-visualizer': {
        target: 'http://localhost:5177',
        changeOrigin: true,
      },
      '/launchpad-controller': {
        target: 'http://localhost:5178',
        changeOrigin: true,
      },
      '/tax-brackets-marble-visual': {
        target: 'http://localhost:5179',
        changeOrigin: true,
      },
      '/coordinates': {
        target: 'http://localhost:5182',
        changeOrigin: true,
      },
      '/simple-compound-interest': {
        target: 'http://localhost:5183',
        changeOrigin: true,
      },
      '/oklch-visualizer': {
        target: 'http://localhost:5180',
        changeOrigin: true,
      },
      '/rugby-play-visualizer': {
        target: 'http://localhost:5184',
        changeOrigin: true,
      },
      '/city-navigator': {
        target: 'http://localhost:5185',
        changeOrigin: true,
      },
    },
  },
})
