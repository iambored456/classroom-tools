import { execSync, spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const appsDir = join(rootDir, 'apps')
const isWindows = process.platform === 'win32'
const comspec = process.env.ComSpec ?? 'cmd.exe'

const normalizeBase = (value) => {
  if (!value) return '/'
  let base = value
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`
  return base
}

const appendPath = (base, slug) => `${normalizeBase(base)}${slug.replace(/^\/+|\/+$/g, '')}/`

const repoNameFromRemote = () => {
  try {
    const remote = execSync('git config --get remote.origin.url', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim()
    if (!remote) return null
    const clean = remote.replace(/\.git$/i, '')
    const parts = clean.split(/[/:]/).filter(Boolean)
    return parts.at(-1) ?? null
  } catch {
    return null
  }
}

const baseFromHomepage = () => {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
    const homepage = typeof pkg.homepage === 'string' ? pkg.homepage.trim() : ''
    if (!homepage) return null
    try {
      const url = new URL(homepage)
      return normalizeBase(url.pathname)
    } catch {
      return normalizeBase(homepage)
    }
  } catch {
    return null
  }
}

const resolveRootBase = () => {
  if (process.env.BASE_URL) return normalizeBase(process.env.BASE_URL)

  const homepageBase = baseFromHomepage()
  if (homepageBase) return homepageBase

  const repoNameFromEnv = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const repoName = repoNameFromEnv ?? repoNameFromRemote()

  if (!repoName) {
    // Local builds may run outside a git checkout. Fall back to the folder name
    // so GitHub Pages project sites still resolve assets correctly.
    const dirName = basename(rootDir)
    if (dirName && !dirName.endsWith('.github.io')) {
      return normalizeBase(dirName)
    }
    return '/'
  }
  if (repoName.endsWith('.github.io')) return '/'
  return normalizeBase(repoName)
}

const runPnpm = (args, env = process.env) => {
  if (isWindows) {
    return spawnSync(comspec, ['/d', '/s', '/c', 'pnpm', ...args], {
      cwd: rootDir,
      stdio: 'inherit',
      env,
    })
  }

  return spawnSync('pnpm', args, {
    cwd: rootDir,
    stdio: 'inherit',
    env,
  })
}

const runBuild = (filter, baseUrl) => {
  console.log(`\nBuilding ${filter} with BASE_URL=${baseUrl}`)
  const result = runPnpm(['--filter', filter, 'run', 'build'], {
    ...process.env,
    BASE_URL: baseUrl,
  })
  if (result.error) {
    throw new Error(`Failed running build for ${filter}: ${result.error.message}`)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const buildableApps = () =>
  readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'hub')
    .map((entry) => {
      const packagePath = join(appsDir, entry.name, 'package.json')
      try {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
        return typeof pkg.name === 'string' && typeof pkg.scripts?.build === 'string'
          ? { directory: entry.name, packageName: pkg.name }
          : null
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.directory.localeCompare(b.directory))

const runNodeScript = (args, env = process.env) => {
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env,
  })
  if (result.error) {
    throw new Error(`Failed running ${args.join(' ')}: ${result.error.message}`)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const rootBase = resolveRootBase()
console.log(`Using root BASE_URL=${rootBase}`)

for (const app of buildableApps()) {
  runBuild(app.packageName, appendPath(rootBase, app.directory))
}
runNodeScript(['scripts/capture-previews.ts'], {
  ...process.env,
  CAPTURE_ROOT_BASE: rootBase,
})
runBuild('hub', rootBase)
runNodeScript(['scripts/assemble-pages.ts', '--out', 'docs'])
runNodeScript(['scripts/verify-pages-links.ts'], {
  ...process.env,
  PAGES_ROOT_BASE: rootBase,
})
