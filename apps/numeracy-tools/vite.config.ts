import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/numeracy-tools/' :
    (process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/numeracy-tools/` : '/')),
  plugins: [svelte()],
  server: { port: 5198, strictPort: true },
}))
