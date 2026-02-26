import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
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

runBuild('class-clock', appendPath(rootBase, 'class-clock'))
runBuild('read-along-highlighter', appendPath(rootBase, 'read-along-highlighter'))
runBuild('launchpad-whack-a-mole', appendPath(rootBase, 'launchpad-whack-a-mole'))
runBuild('fish-visualizer', appendPath(rootBase, 'fish-visualizer'))
runBuild('launchpad-controller', appendPath(rootBase, 'launchpad-controller'))
runNodeScript(['scripts/capture-previews.js'], {
  ...process.env,
  CAPTURE_ROOT_BASE: rootBase,
})
runBuild('hub', rootBase)
runNodeScript(['scripts/assemble-pages.js', '--out', 'docs'])
