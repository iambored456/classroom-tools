import { defineConfig } from 'vite'
export default defineConfig(({command}) => ({base: command === 'serve' ? '/open-middle/' : (process.env.BASE_URL ?? './'), server:{port:5194,strictPort:true}}))
