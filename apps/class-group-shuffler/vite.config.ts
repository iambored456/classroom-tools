import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const path = '/class-group-shuffler/'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig(({ command }) => ({
  base: command === 'serve'
    ? path
    : process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}${path}` : '/'),
  plugins: [svelte()],
  server: { port: 5199, strictPort: true },
}))
