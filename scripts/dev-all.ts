import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const isWindows = process.platform === 'win32'
const comspec = process.env.ComSpec ?? 'cmd.exe'

type DevServer = {
  name: string
  port: number
  path: string
}

const servers: DevServer[] = [
  { name: 'class-clock', port: 5174, path: '/class-clock/' },
  { name: 'class-schedule-widget', port: 5181, path: '/class-schedule-widget/' },
  { name: 'classroom-connections', port: 5186, path: '/classroom-connections/' },
  { name: 'book-of-questions', port: 5188, path: '/book-of-questions/' },
  { name: 'classroom-wordle', port: 5187, path: '/classroom-wordle/' },
  { name: 'read-along-highlighter', port: 5175, path: '/read-along-highlighter/' },
  { name: 'launchpad-whack-a-mole', port: 5176, path: '/launchpad-whack-a-mole/' },
  { name: 'fish-visualizer', port: 5177, path: '/fish-visualizer/' },
  { name: 'launchpad-controller', port: 5178, path: '/launchpad-controller/' },
  { name: 'tax-brackets-marble-visual', port: 5179, path: '/tax-brackets-marble-visual/' },
  { name: 'coordinates', port: 5182, path: '/coordinates/' },
  { name: 'simple-compound-interest', port: 5183, path: '/simple-compound-interest/' },
  { name: 'oklch-visualizer', port: 5180, path: '/oklch-visualizer/' },
  { name: 'rugby-play-visualizer', port: 5184, path: '/rugby-play-visualizer/' },
  { name: 'city-navigator', port: 5185, path: '/city-navigator/' },
  { name: 'hub', port: 5173, path: '/' },
]

type ServerProbe = {
  server: DevServer
  status: 'available' | 'reusable' | 'conflict'
  detail?: string
}

const recentLogs = new Map<string, string[]>()
const children = new Map<string, ChildProcess>()

let shuttingDown = false
let hubUrlPrinted = false

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '')
}

function rememberLine(name: string, line: string): void {
  const trimmed = line.trimEnd()
  if (!trimmed) return

  const existing = recentLogs.get(name) ?? []
  existing.push(trimmed)
  while (existing.length > 25) existing.shift()
  recentLogs.set(name, existing)
}

function isNoise(line: string): boolean {
  if (!line) return true
  if (line.includes('no Svelte config found')) return true
  if (line.includes('[vite] (client) hmr update')) return true
  if (line.startsWith('VITE v')) return true
  if (line.includes('ready in')) return true
  if (line.includes('Network: use --host to expose')) return true
  if (line.startsWith('> ') || line === 'vite') return true
  return false
}

function isErrorLike(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('exception') ||
    lower.includes('err_') ||
    lower.includes('eaddrinuse') ||
    lower.includes('exit status')
  )
}

function printHubUrl(line: string): void {
  if (hubUrlPrinted) return

  const match = line.match(/https?:\/\/\S+/)
  if (!match) return

  hubUrlPrinted = true
  console.log(match[0])
}

function serverUrl(server: DevServer): string {
  return `http://localhost:${server.port}${server.path}`
}

function expectedTitle(server: DevServer): string {
  const html = readFileSync(join(rootDir, 'apps', server.name, 'index.html'), 'utf8')
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? server.name
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: 'localhost', port })
    let settled = false

    const finish = (listening: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(listening)
    }

    socket.setTimeout(500)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function requestPageTitle(server: DevServer): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1_000)

  try {
    const response = await fetch(serverUrl(server), {
      headers: { accept: 'text/html' },
      signal: controller.signal,
    })
    if (!response.ok) return `HTTP ${response.status}`
    const html = await response.text()
    return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '(page without a title)'
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function probeServer(server: DevServer): Promise<ServerProbe> {
  if (!(await isPortListening(server.port))) {
    return { server, status: 'available' }
  }

  const wantedTitle = expectedTitle(server)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const actualTitle = await requestPageTitle(server)
    if (actualTitle === wantedTitle) {
      return { server, status: 'reusable' }
    }
    if (actualTitle !== null) {
      return {
        server,
        status: 'conflict',
        detail: `expected "${wantedTitle}" but received "${actualTitle}"`,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return {
    server,
    status: 'conflict',
    detail: 'the process on this port did not respond like the expected Vite app',
  }
}

async function waitForServer(server: DevServer, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const wantedTitle = expectedTitle(server)

  while (Date.now() < deadline) {
    if ((await requestPageTitle(server)) === wantedTitle) return true
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return false
}

function handleOutput(name: string, line: string): void {
  const clean = stripAnsi(line).trim()
  rememberLine(name, clean)

  if (clean.includes('Local:')) return

  if (isNoise(clean)) return

  if (isErrorLike(clean)) {
    console.error(`[${name}] ${clean}`)
  }
}

function attachOutput(name: string, stream: NodeJS.ReadableStream | null): void {
  if (!stream) return

  const reader = createInterface({ input: stream })
  reader.on('line', (line) => {
    handleOutput(name, line)
  })
}

function spawnServer(name: string): ChildProcess {
  if (isWindows) {
    return spawn(comspec, ['/d', '/s', '/c', 'pnpm', '--filter', name, 'run', 'dev'], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  }

  return spawn('pnpm', ['--filter', name, 'run', 'dev'], {
    cwd: rootDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function killChildTree(child: ChildProcess | undefined): void {
  if (!child?.pid) return

  if (isWindows) {
    spawnSync(comspec, ['/d', '/s', '/c', 'taskkill', '/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  child.kill('SIGTERM')
}

function shutdown(exitCode = 0): void {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children.values()) {
    killChildTree(child)
  }

  process.exit(exitCode)
}

function printFailure(name: string, code: number | null, signal: NodeJS.Signals | null): void {
  console.error(`\n${name} dev server exited unexpectedly.`)
  if (code !== null) {
    console.error(`Exit code: ${code}`)
  } else if (signal) {
    console.error(`Signal: ${signal}`)
  }

  const lines = recentLogs.get(name) ?? []
  if (lines.length > 0) {
    console.error('Recent output:')
    for (const line of lines) {
      console.error(line)
    }
  }
}

async function main(): Promise<void> {
  // Probe every fixed port before launching anything so a conflict cannot leave
  // behind a partially started stack. Distinct Vite servers can then start and
  // complete their readiness checks concurrently.
  const probes = await Promise.all(servers.map((server) => probeServer(server)))
  const conflict = probes.find(({ status }) => status === 'conflict')

  if (conflict) {
    const { server, detail } = conflict
    console.error(`Unable to use port ${server.port} for ${server.name}: ${detail}.`)
    console.error('Close that program, then run pnpm dev again. Existing classroom-tool Vite servers are reused automatically.')
    shutdown(1)
    return
  }

  const serversToLaunch = probes
    .filter(({ status }) => status === 'available')
    .map(({ server }) => server)

  for (const { server } of probes) {
    if (!serversToLaunch.includes(server)) {
      console.log(`[${server.name}] already running at ${serverUrl(server)} (reusing)`)
    }
  }

  for (const server of serversToLaunch) {
    console.log(`[${server.name}] starting at ${serverUrl(server)}`)
    const child = spawnServer(server.name)
    children.set(server.name, child)

    attachOutput(server.name, child.stdout)
    attachOutput(server.name, child.stderr)

    child.on('error', (error) => {
      if (shuttingDown) return
      console.error(`[${server.name}] could not be launched: ${error.message}`)
      shutdown(1)
    })

    child.on('exit', (code, signal) => {
      if (shuttingDown) return

      printFailure(server.name, code, signal)
      shutdown(code ?? 1)
    })
  }

  const readiness = await Promise.all(
    serversToLaunch.map(async (server) => ({
      server,
      ready: await waitForServer(server),
    })),
  )
  const timedOut = readiness.find(({ ready }) => !ready)

  if (timedOut) {
    console.error(`Timed out waiting for ${timedOut.server.name} on port ${timedOut.server.port}.`)
    shutdown(1)
    return
  }

  console.log('All classroom-tool dev servers are ready.')
  printHubUrl('http://localhost:5173/')
  if (children.size === 0) {
    console.log('All classroom-tool dev servers are already running; no duplicate processes were started.')
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  shutdown(1)
})

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})
