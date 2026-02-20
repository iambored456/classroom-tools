import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, isAbsolute, relative, resolve } from 'node:path'

import { findFreePort } from './ports.js'

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const normalizeBasePath = (basePath) => {
  if (!basePath || basePath === '/') return '/'
  let normalized = basePath
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.endsWith('/')) normalized = `${normalized}/`
  return normalized
}

function contentTypeFor(filePath) {
  const extension = extname(filePath).toLowerCase()
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}

async function safeStat(filePath) {
  try {
    return await stat(filePath)
  } catch {
    return null
  }
}

function safeJoin(rootDir, requestPath) {
  const root = resolve(rootDir)
  const resolvedPath = resolve(root, `.${requestPath}`)
  const relativePath = relative(root, resolvedPath)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return null
  }
  return resolvedPath
}

function mapRequestPath(requestPath, basePath) {
  if (basePath === '/') {
    return requestPath
  }

  const trimmedBasePath = basePath.slice(0, -1)
  if (requestPath === trimmedBasePath) {
    return '/'
  }

  if (!requestPath.startsWith(basePath)) {
    return null
  }

  const suffix = requestPath.slice(basePath.length)
  if (!suffix) {
    return '/'
  }

  return `/${suffix.replace(/^\/+/, '')}`
}

async function resolveFilePath(rootDir, requestPath) {
  const candidate = safeJoin(rootDir, requestPath)
  if (!candidate) {
    return null
  }

  const stats = await safeStat(candidate)
  if (stats?.isFile()) {
    return candidate
  }

  if (stats?.isDirectory()) {
    const indexPath = resolve(candidate, 'index.html')
    const indexStats = await safeStat(indexPath)
    if (indexStats?.isFile()) {
      return indexPath
    }
    return null
  }

  if (!extname(candidate)) {
    const fallback = resolve(rootDir, 'index.html')
    const fallbackStats = await safeStat(fallback)
    if (fallbackStats?.isFile()) {
      return fallback
    }
  }

  return null
}

export async function startStaticServer(options) {
  const rootDir = resolve(options.rootDir)
  const basePath = normalizeBasePath(options.basePath)
  const host = options.host ?? '127.0.0.1'
  const port = options.port ?? (await findFreePort(host))
  const verbose = options.verbose ?? false

  const sockets = new Set()
  const server = createServer((request, response) => {
    void handleRequest(rootDir, basePath, request, response, verbose).catch(() => {
      if (!response.headersSent) {
        response.statusCode = 500
        response.end('Internal Server Error')
      } else {
        response.destroy()
      }
    })
  })

  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => {
      sockets.delete(socket)
    })
  })

  await new Promise((resolveStart, rejectStart) => {
    server.once('error', rejectStart)
    server.listen(port, host, () => {
      server.off('error', rejectStart)
      resolveStart()
    })
  })

  if (verbose) {
    console.log(`[capture-previews] Serving ${rootDir} on ${basePath} at http://${host}:${port}`)
  }

  let stopped = false
  const stop = async () => {
    if (stopped) {
      return
    }
    stopped = true

    for (const socket of sockets) {
      socket.destroy()
    }

    await new Promise((resolveStop, rejectStop) => {
      server.close((closeError) => {
        if (closeError) {
          rejectStop(closeError)
          return
        }
        resolveStop()
      })
    })
  }

  return {
    host,
    port,
    url: `http://${host}:${port}`,
    basePath,
    stop,
  }
}

async function handleRequest(rootDir, basePath, request, response, verbose) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.statusCode = 405
    response.end('Method Not Allowed')
    return
  }

  const requestUrl = new URL(request.url ?? '/', 'http://localhost')
  let pathname = '/'
  try {
    pathname = decodeURIComponent(requestUrl.pathname)
  } catch {
    // Keep fallback value.
  }

  const mappedPath = mapRequestPath(pathname, basePath)
  const filePath = mappedPath ? await resolveFilePath(rootDir, mappedPath) : null

  if (verbose) {
    const label = filePath ? '200' : '404'
    console.log(`[capture-previews] ${label} ${pathname}`)
  }

  if (!filePath) {
    response.statusCode = 404
    response.end('Not Found')
    return
  }

  response.statusCode = 200
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', contentTypeFor(filePath))

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  await new Promise((resolvePipe, rejectPipe) => {
    const stream = createReadStream(filePath)
    stream.on('error', rejectPipe)
    stream.on('end', () => resolvePipe())
    stream.pipe(response)
  }).catch((error) => {
    if (!response.headersSent) {
      response.statusCode = 500
      response.end('Internal Server Error')
    } else {
      response.destroy(error)
    }
  })
}
