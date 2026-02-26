import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

import { startStaticServer } from './lib/static-server.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const VIEWPORT = { width: 1200, height: 900 }
const DEVICE_SCALE_FACTOR = 2
const DEFAULT_DELAY_MS = 250
const NAVIGATION_TIMEOUT_MS = 45_000
const SELECTOR_TIMEOUT_MS = 15_000
const OUTPUT_DIR = join(rootDir, 'apps', 'hub', 'public', 'images')

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
  if (process.env.CAPTURE_ROOT_BASE) return normalizeBase(process.env.CAPTURE_ROOT_BASE)
  if (process.env.BASE_URL) return normalizeBase(process.env.BASE_URL)

  const homepageBase = baseFromHomepage()
  if (homepageBase) return homepageBase

  const repoNameFromEnv = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const repoName = repoNameFromEnv ?? repoNameFromRemote()

  if (!repoName) {
    const dirName = basename(rootDir)
    if (dirName && !dirName.endsWith('.github.io')) {
      return normalizeBase(dirName)
    }
    return '/'
  }

  if (repoName.endsWith('.github.io')) return '/'
  return normalizeBase(repoName)
}

function buildTargets(rootBase) {
  const classClockBase = appendPath(rootBase, 'class-clock')
  const readAlongBase = appendPath(rootBase, 'read-along-highlighter')
  const whackAMoleBase = appendPath(rootBase, 'launchpad-whack-a-mole')
  const fishVisualizerBase = appendPath(rootBase, 'fish-visualizer')
  const launchpadControllerBase = appendPath(rootBase, 'launchpad-controller')

  return [
    {
      id: 'class-clock',
      outputFile: 'ClassClock-screenshot.png',
      distDir: 'apps/class-clock/dist',
      basePath: classClockBase,
      route: classClockBase,
      waitFor: '#clock-display-area #time',
      delayMs: 450,
      injectCss: `
#menu-toggle,
#settings-menu {
  display: none !important;
}
#time-left {
  display: none !important;
}
#clock-display-area {
  width: 100vw !important;
  height: 100vh !important;
}
`,
    },
    {
      id: 'read-along-highlighter',
      outputFile: 'ReadAlongHighlighter-screenshot.png',
      distDir: 'apps/read-along-highlighter/dist',
      basePath: readAlongBase,
      route: readAlongBase,
      waitFor: '#text-container .word',
      delayMs: 350,
      postReadyScript: `
(() => {
  const sizeButton = document.querySelector('.text-size-btn[data-size="60"]');
  if (sizeButton instanceof HTMLButtonElement) {
    sizeButton.click();
  }
})();
`,
      injectCss: `
#sidebar,
#chevron {
  display: none !important;
}
#text-container {
  width: 100vw !important;
  max-width: none !important;
  height: 100vh !important;
  padding: 4rem 5vw !important;
}
`,
      theme: 'dark',
    },
    {
      id: 'launchpad-whack-a-mole',
      outputFile: 'LaunchpadWhackaMole-screenshot.png',
      distDir: 'apps/launchpad-whack-a-mole/dist',
      basePath: whackAMoleBase,
      route: whackAMoleBase,
      waitFor: '.grid .pad',
      delayMs: 300,
      postReadyScript: `
(() => {
  const pads = Array.from(document.querySelectorAll('.grid .pad'));
  const middle = pads[Math.floor(pads.length / 2)];
  if (middle instanceof HTMLElement) {
    middle.classList.add('active');
    middle.style.backgroundColor = '#62bbf7';
  }
})();
`,
      injectCss: `
.container > *:not(.scoreboard):not(.grid) {
  display: none !important;
}
`,
    },
    {
      id: 'fish-visualizer',
      outputFile: 'FishVisualizer-screenshot.png',
      distDir: 'apps/fish-visualizer/dist',
      basePath: fishVisualizerBase,
      route: fishVisualizerBase,
      waitFor: '#network-graph .node',
      delayMs: 600,
      injectCss: `
  #tooltip {
    display: none !important;
  }
  `,
    },
    {
      id: 'launchpad-controller',
      outputFile: 'LaunchpadController-screenshot.png',
      distDir: 'apps/launchpad-controller/dist',
      basePath: launchpadControllerBase,
      route: launchpadControllerBase,
      waitFor: '.grid-placeholder, .grid',
      delayMs: 300,
      injectCss: `
button {
  display: none !important;
}
.status-text {
  display: none !important;
}
`,
    },
  ]
}

const DETERMINISTIC_INIT_SCRIPT = `
(() => {
  window.__SCREENSHOT__ = true;
})();
`

function buildDeterministicCss(theme) {
  return `
:root {
  color-scheme: ${theme} !important;
}
*,
*::before,
*::after {
  animation: none !important;
  animation-delay: 0ms !important;
  animation-duration: 0ms !important;
  transition: none !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
html,
body {
  overflow: hidden !important;
}
vite-error-overlay,
#vite-error-overlay,
[data-debug],
[class*="debug-overlay" i],
[id*="debug-overlay" i],
[class*="fps" i],
[id*="fps" i],
[class*="perf" i],
[id*="perf" i] {
  visibility: hidden !important;
  display: none !important;
}
`
}

function printUsage() {
  console.log(
    [
      'Usage: pnpm -w capture:previews [-- --only <id[,id...]>] [--verbose] [--list] [--theme <light|dark>]',
      '',
      'Flags:',
      '  --only <ids>    Capture only specific target IDs (comma-separated or repeated).',
      '  --verbose       Print detailed server and capture logs.',
      '  --list          Print configured targets and exit.',
      '  --theme <name>  Force a color scheme. Default: light.',
      '',
    ].join('\n'),
  )
}

function parseCliArgs(argv) {
  const only = new Set()
  let verbose = false
  let list = false
  let theme = 'light'

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--verbose') {
      verbose = true
      continue
    }

    if (arg === '--list') {
      list = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--only') {
      const nextArg = argv[index + 1]
      if (!nextArg) {
        throw new Error('Missing value for --only')
      }
      addOnlyValues(only, nextArg)
      index += 1
      continue
    }

    if (arg.startsWith('--only=')) {
      addOnlyValues(only, arg.slice('--only='.length))
      continue
    }

    if (arg === '--theme') {
      const nextArg = argv[index + 1]
      if (!nextArg) {
        throw new Error('Missing value for --theme')
      }
      if (nextArg !== 'light' && nextArg !== 'dark') {
        throw new Error(`Invalid value for --theme: ${nextArg}`)
      }
      theme = nextArg
      index += 1
      continue
    }

    if (arg.startsWith('--theme=')) {
      const value = arg.slice('--theme='.length)
      if (value !== 'light' && value !== 'dark') {
        throw new Error(`Invalid value for --theme: ${value}`)
      }
      theme = value
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return {
    only: only.size > 0 ? only : null,
    verbose,
    list,
    theme,
  }
}

function addOnlyValues(targetSet, raw) {
  const values = raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)

  for (const value of values) {
    targetSet.add(value)
  }
}

function selectTargets(allTargets, only) {
  if (!only) {
    return [...allTargets]
  }

  const unknown = [...only].filter((id) => !allTargets.some((target) => target.id === id))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown target id(s): ${unknown.join(', ')}. Available targets: ${allTargets.map((target) => target.id).join(', ')}`,
    )
  }

  return allTargets.filter((target) => only.has(target.id))
}

function normalizeRoute(route) {
  if (!route) {
    return '/'
  }
  if (route.startsWith('/')) {
    return route
  }
  return `/${route}`
}

function withScreenshotFlag(baseUrl, route) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const url = new URL(normalizeRoute(route), normalizedBase)
  url.searchParams.set('screenshot', '1')
  return url.toString()
}

async function directoryExists(path) {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (!('fonts' in document)) {
      return
    }

    const fontSet = document.fonts
    if (!fontSet) {
      return
    }

    await fontSet.ready
  })
}

async function captureTarget(browser, target, options) {
  const resolvedDistDir = resolve(rootDir, target.distDir)
  const distExists = await directoryExists(resolvedDistDir)
  const route = normalizeRoute(target.route)
  let url = 'n/a'
  let staticServer = null
  const activeTheme = target.theme ?? options.theme

  if (!distExists) {
    return {
      id: target.id,
      distDir: resolvedDistDir,
      distExists: false,
      url,
      error: new Error('Dist directory not found. Build this app first.'),
    }
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: activeTheme,
    reducedMotion: 'reduce',
  })

  try {
    await context.addInitScript({ content: DETERMINISTIC_INIT_SCRIPT })
    const page = await context.newPage()

    if (options.verbose) {
      page.on('pageerror', (error) => {
        const details = error.stack ?? error.message
        console.error(`[capture-previews] pageerror (${target.id}): ${details}`)
      })

      page.on('console', (message) => {
        if (message.type() === 'error') {
          console.error(`[capture-previews] console.${message.type()} (${target.id}): ${message.text()}`)
        }
      })
    }

    staticServer = await startStaticServer({
      rootDir: resolvedDistDir,
      basePath: target.basePath,
      host: '127.0.0.1',
      verbose: options.verbose,
    })

    url = withScreenshotFlag(staticServer.url, route)

    if (options.verbose) {
      console.log(`[capture-previews] Capturing ${target.id} -> ${url}`)
    }

    await page.emulateMedia({
      colorScheme: activeTheme,
      reducedMotion: 'reduce',
    })

    await page.goto(url, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT_MS })

    if (target.waitFor) {
      await page.waitForSelector(target.waitFor, {
        timeout: SELECTOR_TIMEOUT_MS,
      })
    }

    if (target.postReadyScript) {
      await page.evaluate(target.postReadyScript)
    }

    if (target.postReadyWaitFor) {
      await page.waitForSelector(target.postReadyWaitFor, {
        timeout: SELECTOR_TIMEOUT_MS,
      })
    }

    if (target.postReadyWaitForFunction) {
      await page.waitForFunction(target.postReadyWaitForFunction, {
        timeout: SELECTOR_TIMEOUT_MS,
      })
    }

    const cssToInject = `${buildDeterministicCss(activeTheme)}\n${target.injectCss ?? ''}`
    await page.addStyleTag({ content: cssToInject })

    await waitForFonts(page)

    const delayMs = target.delayMs ?? DEFAULT_DELAY_MS
    if (delayMs > 0) {
      await page.waitForTimeout(delayMs)
    }

    const pngPath = resolve(OUTPUT_DIR, target.outputFile)
    const screenshotOptions = {
      path: pngPath,
      type: 'png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
      caret: 'hide',
      omitBackground: target.omitBackground ?? false,
    }

    if (target.clip) {
      screenshotOptions.clip = target.clip
    }

    await page.screenshot(screenshotOptions)
    await page.close()

    if (options.verbose) {
      console.log(`[capture-previews] Wrote ${pngPath}`)
    } else {
      console.log(`[capture-previews] ${target.id} -> images/${target.outputFile}`)
    }

    return null
  } catch (error) {
    return {
      id: target.id,
      distDir: resolvedDistDir,
      distExists,
      url,
      error,
    }
  } finally {
    await context.close().catch(() => {
      // Best effort close.
    })

    if (staticServer) {
      await staticServer.stop().catch(() => {
        // Best effort close.
      })
    }
  }
}

async function main() {
  const rootBase = resolveRootBase()
  const allTargets = buildTargets(rootBase)
  const options = parseCliArgs(process.argv.slice(2))
  const targets = selectTargets(allTargets, options.only)

  if (options.list) {
    for (const target of targets) {
      console.log(
        `${target.id}\n  output: images/${target.outputFile}\n  distDir: ${target.distDir}\n  basePath: ${target.basePath}\n  route: ${target.route}\n  waitFor: ${target.waitFor ?? '(none)'}`,
      )
    }
    return
  }

  if (targets.length === 0) {
    throw new Error('No capture targets selected.')
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  console.log(
    `[capture-previews] Starting ${targets.length} target(s), base=${rootBase}, theme=${options.theme}, viewport=${VIEWPORT.width}x${VIEWPORT.height}@${DEVICE_SCALE_FACTOR}x`,
  )

  const browser = await chromium.launch({ headless: true })
  const failures = []

  try {
    for (const target of targets) {
      const failure = await captureTarget(browser, target, options)
      if (failure) {
        failures.push(failure)
        console.error(`[capture-previews] FAILED ${failure.id}`)
        console.error(`  url: ${failure.url}`)
        console.error(`  distDir: ${failure.distDir}`)
        console.error(`  distExists: ${failure.distExists}`)
        console.error(`  error: ${formatError(failure.error)}`)
        if (options.verbose && failure.error instanceof Error && failure.error.stack) {
          console.error(failure.error.stack)
        }
      }
    }
  } finally {
    await browser.close()
  }

  if (failures.length > 0) {
    throw new Error(`Capture failed for ${failures.length} target(s).`)
  }

  console.log('[capture-previews] Done.')
}

main().catch((error) => {
  console.error(`[capture-previews] ${formatError(error)}`)
  process.exitCode = 1
})

