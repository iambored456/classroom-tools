import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const isWindows = process.platform === 'win32'
const comspec = process.env.ComSpec ?? 'cmd.exe'

type DevServer = {
  name: string
}

const servers: DevServer[] = [
  { name: 'class-clock' },
  { name: 'class-schedule-widget' },
  { name: 'read-along-highlighter' },
  { name: 'launchpad-whack-a-mole' },
  { name: 'fish-visualizer' },
  { name: 'launchpad-controller' },
  { name: 'tax-brackets-marble-visual' },
  { name: 'coordinates' },
  { name: 'simple-compound-interest' },
  { name: 'oklch-visualizer' },
  { name: 'hub' },
]

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

function handleOutput(name: string, line: string): void {
  const clean = stripAnsi(line).trim()
  rememberLine(name, clean)

  if (clean.includes('Local:')) {
    if (name === 'hub') {
      printHubUrl(clean)
    }
    return
  }

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

for (const server of servers) {
  const child = spawnServer(server.name)
  children.set(server.name, child)

  attachOutput(server.name, child.stdout)
  attachOutput(server.name, child.stderr)

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    printFailure(server.name, code, signal)
    shutdown(code ?? 1)
  })
}

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})
