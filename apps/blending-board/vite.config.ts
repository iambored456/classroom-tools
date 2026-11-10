import { defineConfig } from 'vite'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/blending-board/' : process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/blending-board/` : '/'),
  server: { port: 5197, strictPort: true },
}))
