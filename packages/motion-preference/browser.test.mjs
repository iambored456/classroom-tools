// Run: node packages/motion-preference/browser.test.mjs
// Builds four representative consumers in memory; never writes Pages output.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(resolve(root, 'apps/hub/package.json'))
const { build } = await import(pathToFileURL(require.resolve('vite')).href)
const files = new Map()
const base = '/classroom-tools/'
for (const app of ['hub', 'numeracy-tools', 'numberle', 'paper-airplane-visualizer']) {
  const appRoot = resolve(root, 'apps', app)
  const prefix = app === 'hub' ? base : base + app + '/'
  const result = await build({
    root: appRoot,
    configFile: resolve(appRoot, existsSync(resolve(appRoot, 'vite.config.ts')) ? 'vite.config.ts' : 'vite.config.js'),
    base: prefix, logLevel: 'error',
    build: { write: false, emptyOutDir: false, reportCompressedSize: false },
  })
  for (const output of (Array.isArray(result) ? result : [result])) {
    for (const file of output.output) {
      files.set(prefix + file.fileName, file.type === 'chunk' ? file.code : file.source)
    }
  }
}
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const key = pathname.endsWith('/') ? pathname + 'index.html' : pathname
  let content = files.get(key)
  if (content === undefined && pathname.startsWith(base + 'images/') && !pathname.includes('..')) {
    try { content = await readFile(resolve(root, 'docs', pathname.slice(base.length))) } catch {}
  }
  if (content === undefined) { response.writeHead(404).end(); return }
  response.setHeader('Content-Type', ({
    '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
    '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
  })[extname(key)] || 'application/octet-stream')
  response.end(content)
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
let browser
try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1200, height: 850 } })
  // Remote fonts are unnecessary to verify preference behavior and dialog layout.
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ contentType: 'text/css', body: '' }))
  const errors = []
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
  const hub = await context.newPage()
  const url = 'http://127.0.0.1:' + server.address().port + base
  const key = 'classroom-tools.motion-preference'
  const expectMotion = (page, reduced) => page.waitForFunction(value =>
    document.documentElement.dataset.reducedMotion === String(value), reduced)
  const openSettings = () => hub.getByRole('button', { name: 'Classroom Tools settings', exact: true }).click()
  const choose = value => hub.locator('input[name="hub-motion"][value="' + value + '"]').check()
  await hub.goto(url)
  await openSettings()
  assert.equal(await hub.locator('input[value="system"]').isChecked(), true)
  await expectMotion(hub, true)
  assert.equal(await hub.locator('.card').first().evaluate(node => getComputedStyle(node).opacity), '1')
  await choose('full')
  await expectMotion(hub, false)
  assert.equal(await hub.evaluate(key => localStorage.getItem(key), key), 'full')

  // Reopening the hub retains the explicit override even when the OS reduces motion.
  await hub.reload()
  await openSettings()
  assert.equal(await hub.locator('input[value="full"]').isChecked(), true)
  const numeracy = await context.newPage()
  await numeracy.goto(url + 'numeracy-tools/?debugAnimations=0#substitution-visualization')
  await expectMotion(numeracy, false)
  await numeracy.locator('button.next').click()
  await numeracy.waitForFunction(() => {
    const progress = Number(document.querySelector('#substitution-progress').value)
    return progress > 0 && progress < 1000
  })
  assert.equal(await numeracy.locator('button.play').getAttribute('aria-label'), 'Pause animation')

  // A change in the hub reaches an already-open app and pauses motion when requested.
  await choose('reduced')
  await expectMotion(numeracy, true)
  assert.equal(await numeracy.locator('button.play').getAttribute('aria-label'), 'Play animation')
  await numeracy.locator('button.next').click()
  assert.equal(await numeracy.locator('#substitution-progress').inputValue(), '1000')
  await numeracy.emulateMedia({ reducedMotion: 'no-preference' })
  await expectMotion(numeracy, true) // Explicit reduced wins over the device.
  await choose('full')
  await expectMotion(numeracy, false)
  await numeracy.emulateMedia({ reducedMotion: 'reduce' })
  await expectMotion(numeracy, false) // Explicit full wins over the device.
  await numeracy.reload()
  await expectMotion(numeracy, false)
  await numeracy.locator('button.next').click()
  await numeracy.waitForFunction(() => {
    const progress = Number(document.querySelector('#substitution-progress').value)
    return progress > 0 && progress < 1000
  })

  // Diagnostic evidence must distinguish the device preference from the app override.
  await numeracy.evaluate(() => nd())
  const environment = await numeracy.evaluate(() => numeracyDiagnostics.report().environment)
  assert.equal(environment.reducedMotion, true)
  assert.equal(environment.siteMotionPreference, 'full')
  assert.equal(environment.effectiveReducedMotion, false)
  await numeracy.evaluate(() => nd.stop())

  // A CSS-only consumer uses the same preference, including its opt-in reveal animation.
  const numberle = await context.newPage()
  await numberle.goto(url + 'numberle/')
  await expectMotion(numberle, false)
  const tile = numberle.locator('.tile').first()
  await tile.evaluate(node => node.classList.add('correct'))
  assert.equal(await tile.evaluate(node => getComputedStyle(node).animationName), 'reveal')
  await choose('reduced')
  await expectMotion(numberle, true)
  assert.equal(await tile.evaluate(node => getComputedStyle(node).animationName), 'none')

  // A plain-JavaScript/WebGL consumer also uses the override.
  await choose('full')
  const paper = await context.newPage()
  await paper.goto(url + 'paper-airplane-visualizer/')
  await expectMotion(paper, false)
  assert.equal(await paper.locator('#play').getAttribute('aria-label'), 'Pause animation')
  await choose('reduced')
  await expectMotion(paper, true)
  assert.equal(await paper.locator('#play').getAttribute('aria-label'), 'Play animation')

  // System mode follows live OS changes; clearing storage restores that default.
  await choose('system')
  await expectMotion(numeracy, true)
  await numeracy.emulateMedia({ reducedMotion: 'no-preference' })
  await expectMotion(numeracy, false)
  await numeracy.emulateMedia({ reducedMotion: 'reduce' })
  await expectMotion(numeracy, true)
  await choose('full')
  await expectMotion(numeracy, false)
  await hub.evaluate(key => localStorage.removeItem(key), key)
  await expectMotion(numeracy, true)

  // Settings dialog: keyboard dismissal/focus return, narrow layout, and optional screenshots.
  await hub.reload()
  await openSettings()
  await choose('full')
  const screenshotDir = process.env.MOTION_SCREENSHOT_DIR
  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true })
    await hub.screenshot({ path: resolve(screenshotDir, 'motion-settings-desktop.png') })
  }
  await hub.keyboard.press('Escape')
  assert.equal(await hub.locator('.hub-settings').evaluate(node => node.open), false)
  assert.equal(await hub.getByRole('button', { name: 'Classroom Tools settings', exact: true }).evaluate(node => node === document.activeElement), true)
  await hub.setViewportSize({ width: 390, height: 750 })
  await openSettings()
  const dialog = await hub.locator('.hub-settings').boundingBox()
  assert(dialog && dialog.x >= 0 && dialog.x + dialog.width <= 390)
  assert.equal(await hub.locator('.hub-settings').evaluate(node => node.scrollWidth <= node.clientWidth), true)
  if (screenshotDir) await hub.screenshot({ path: resolve(screenshotDir, 'motion-settings-mobile.png') })

  // Managed browsers that block storage must not silently claim persistence.
  const restricted = await browser.newContext({ reducedMotion: 'reduce' })
  await restricted.addInitScript(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Blocked for test', 'SecurityError')
      return original.call(this, name, value)
    }
  }, key)
  const blockedHub = await restricted.newPage()
  await blockedHub.goto(url)
  await blockedHub.getByRole('button', { name: 'Classroom Tools settings', exact: true }).click()
  await blockedHub.locator('input[value="full"]').check()
  await expectMotion(blockedHub, false)
  assert.match(await blockedHub.getByRole('status').textContent(), /could not save/)
  await blockedHub.reload()
  await expectMotion(blockedHub, true)
  await restricted.close()
  assert.deepEqual(errors, [])
  console.log('PASS: persistence, reduced-motion override, live cross-app updates, device changes, storage reset/failure, JS and CSS consumers, diagnostic evidence, keyboard and mobile settings.')
  if (screenshotDir) console.log('Screenshots: ' + screenshotDir)
  await context.close()
} finally {
  await browser?.close()
  await new Promise(done => server.close(done))
}
