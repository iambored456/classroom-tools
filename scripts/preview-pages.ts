import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const docsDir = join(rootDir, 'docs')
const port = Number(process.env.PORT ?? 4173)

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const sendFile = (res, filePath) => {
  const ext = extname(filePath).toLowerCase()
  res.writeHead(200, { 'Content-Type': mimeByExt[ext] ?? 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
}

const sendText = (res, status, message) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(message)
}

if (!existsSync(docsDir)) {
  console.error('docs/ does not exist. Run `pnpm run build:pages` first.')
  process.exit(1)
}

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  let pathname = decodeURIComponent(requestUrl.pathname)

  if (pathname.endsWith('/')) pathname += 'index.html'
  if (!extname(pathname) && pathname !== '/') pathname += '/index.html'
  if (pathname === '/') pathname = '/index.html'

  const resolved = normalize(join(docsDir, pathname))
  if (!resolved.startsWith(docsDir)) {
    sendText(res, 403, 'Forbidden')
    return
  }

  if (!existsSync(resolved)) {
    sendText(res, 404, 'Not Found')
    return
  }

  const stats = statSync(resolved)
  if (stats.isDirectory()) {
    const indexFile = join(resolved, 'index.html')
    if (!existsSync(indexFile)) {
      sendText(res, 404, 'Not Found')
      return
    }
    sendFile(res, indexFile)
    return
  }

  sendFile(res, resolved)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Previewing docs at http://127.0.0.1:${port}`)
})
