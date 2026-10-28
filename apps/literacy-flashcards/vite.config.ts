import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/literacy-flashcards/' :
    (process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/literacy-flashcards/` : '/')),
  plugins: [svelte()],
  server: { port: 5195, strictPort: true },
}))
