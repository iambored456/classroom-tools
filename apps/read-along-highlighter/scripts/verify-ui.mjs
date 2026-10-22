import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(`${project}/package.json`)
const { chromium } = require('playwright')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html')
    response.end('<title>Classroom Tools</title>Classroom Tools')
    return
  }
  const file = pathname === '/read-along-highlighter/' ? 'index.html' : pathname.replace(/^\//, '')
  try {
    const data = await readFile(join(project, 'apps/read-along-highlighter/dist', file))
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
    response.end(data)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 650 } })
  page.setDefaultTimeout(60000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto(`${origin}/read-along-highlighter/`)
  const paste = await page.evaluate(() => {
    window.heartbeat = 0
    window.heartbeatTimer = setInterval(() => window.heartbeat++, 30)
    const sentence = 'The reader followed the quiet pathway through the garden under the morning sun.'
    const paragraph = Array(12).fill(sentence).join(' ')
    const text = Array(400).fill(paragraph).join('\n\n')
    window.expectedWords = text.split(/\s+/).length
    const input = document.querySelector('#text-input')
    const start = performance.now()
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return { handlerMs: performance.now() - start, words: window.expectedWords }
  })
  await page.waitForFunction(() => document.querySelector('#text-container').getAttribute('aria-busy') === 'false' && document.querySelectorAll('.word').length === window.expectedWords)
  const loaded = await page.evaluate(() => ({ heartbeat: window.heartbeat, words: document.querySelectorAll('.word').length, spellcheck: document.querySelector('#text-input').spellcheck }))
  assert.ok(paste.handlerMs < 1000, 'Pasting queues work without blocking for a second')
  assert.ok(loaded.heartbeat > 3, 'The page continues processing other tasks during paste')
  assert.equal(loaded.spellcheck, false)
  await page.waitForFunction(() => document.querySelector('#minimap').dataset.layoutEngine === 'paragraph-overview')
  assert.ok(await page.locator('.minimap-line').count() <= 512)
  const mutationCount = await page.evaluate(async () => {
    let count = 0
    const container = document.querySelector('#text-container')
    const observer = new MutationObserver(records => { count += records.length })
    observer.observe(container, { subtree: true, attributes: true, childList: true })
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))
    observer.disconnect()
    return count
  })
  assert.ok(mutationCount <= 10, 'One navigation step must not rewrite the novel')
  const navigation = await page.evaluate(async () => {
    const container = document.querySelector('#text-container')
    const word = index => container.querySelector(`[data-index="${index}"]`)
    const visible = index => {
      const bounds = word(index).getBoundingClientRect()
      return bounds.top >= -1 && bounds.bottom <= container.clientHeight + 1
    }
    word(150).click()
    let failures = 0
    let current = 150
    for (const direction of [1, -1]) {
      for (let count = 0; count < 120; count++) {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: direction > 0 ? 'ArrowRight' : 'ArrowLeft', repeat: true, bubbles: true }))
        current += direction
        if (!visible(current)) failures++
        await new Promise(resolve => setTimeout(resolve, 16))
        if (!visible(current)) failures++
      }
    }
    const jumps = []
    for (const index of [30000, window.expectedWords - 1, 0]) {
      const started = performance.now()
      word(index).click()
      const immediateVisible = visible(index)
      await new Promise(resolve => setTimeout(resolve, 800))
      jumps.push({ index, immediateVisible, settledVisible: visible(index), elapsedMs: Math.round(performance.now() - started) })
    }
    return { failures, jumps }
  })
  assert.equal(navigation.failures, 0)
  console.log(JSON.stringify({ navigation }, null, 2))
  for (const jump of navigation.jumps) {
    assert.equal(jump.immediateVisible, true, `Jump to ${jump.index} immediately visible`)
    assert.equal(jump.settledVisible, true, `Jump to ${jump.index} remains visible`)
  }
  await page.waitForFunction(() => localStorage.getItem('readAlong:lastText') === document.querySelector('#text-input').value)
  await page.reload()
  await page.waitForFunction(() => document.querySelector('#text-container').getAttribute('aria-busy') === 'false' && document.querySelectorAll('.word').length > 60000)
  await page.getByRole('button', { name: 'Open settings', exact: true }).click()
  await page.locator('#font-size-range').fill('52')
  await page.locator('#minimap-visible').uncheck({ force: true })
  await page.waitForFunction(() => document.querySelector('#minimap').hidden)
  await page.locator('#minimap-visible').check({ force: true })
  await page.waitForFunction(() => !document.querySelector('#minimap').hidden && document.querySelectorAll('.minimap-line').length <= 512)
  // Replacement while an older document is still building must win.
  await page.evaluate(async () => {
    const input = document.querySelector('#text-input')
    input.value = Array(80000).fill('replacement').join(' ')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))
    input.value = '🙂 café , done'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => document.querySelector('#text-container').getAttribute('aria-busy') === 'false' && document.querySelectorAll('.word').length === 4)
  await page.waitForTimeout(800)
  assert.equal(await page.locator('.word').count(), 4)
  const unicode = await page.evaluate(() => {
    const input = document.querySelector('#text-input')
    input.blur()
    const key = (key, shiftKey = false) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
    document.querySelector('.word').click()
    key('ArrowLeft', true)
    const empty = !document.querySelector('.word').classList.contains('highlighted')
    key('ArrowRight', true)
    const full = document.querySelector('.word').classList.contains('highlighted')
    key('ArrowRight')
    key('ArrowLeft', true)
    const partial = document.querySelector('[data-index="1"] .character-highlighted')?.textContent
    key('ArrowRight')
    const punctuationSkipped = document.querySelector('[data-index="3"]').classList.contains('highlighted')
    return { empty, full, partial, punctuationSkipped }
  })
  assert.deepEqual(unicode, { empty: true, full: true, partial: 'caf', punctuationSkipped: true })
  // Simulate full browser storage without losing the current document.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'readAlong:lastText') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
    const input = document.querySelector('#text-input')
    input.value = 'The document still works when saving fails.'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => document.querySelector('#text-status').textContent.includes('could not be saved'))
  assert.equal(await page.locator('.word').count(), 7)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ paste, loaded, navigation, unicode, errors }, null, 2))
  console.log('Verified a 62,400-word document with a 4× CPU slowdown, background paste responsiveness, paragraph navigation, distant jumps, reload, typography, minimap, stale-build cancellation, Unicode character highlighting, and storage quota handling.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
