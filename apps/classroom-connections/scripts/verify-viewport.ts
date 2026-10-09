import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { startStaticServer } from '../../../scripts/lib/static-server.ts'
import { createStarterGroups } from '../src/groups.ts'

const server = await startStaticServer({ rootDir: resolve(import.meta.dirname, '../dist'), basePath: '/', host: '127.0.0.1' })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.url)
  const sizes = [
    { width: 1366, height: 600 },
    { width: 1280, height: 500 },
    { width: 390, height: 600 },
    { width: 844, height: 390 },
    { width: 1200, height: 900 },
  ]
  const checkFit = async () => {
    for (const size of sizes) {
      await page.setViewportSize(size)
      await page.waitForTimeout(100)
      const bounds = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
        controls: document.querySelector('.game-controls')!.getBoundingClientRect().bottom,
        rows: [...document.querySelectorAll('.word-tile, .solved-group')].map((element) => element.getBoundingClientRect().height),
      }))
      assert.ok(bounds.height <= bounds.viewport + 1, `Page overflows at ${JSON.stringify(size)}: ${JSON.stringify(bounds)}`)
      assert.ok(bounds.controls <= bounds.viewport, 'Controls remain visible')
      assert.ok(bounds.rows.every((height) => height > 20), 'Every card remains visible')
    }
  }
  for (const groupCount of [2, 4, 6]) {
    const groups = createStarterGroups().slice(0, groupCount)
    await page.evaluate(({ groups, groupCount }) => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem('classroom-connections:library:v1', JSON.stringify(groups))
      localStorage.setItem('classroom-connections:settings:v1', JSON.stringify({ groupCount, guessLimit: 4 }))
    }, { groups: createStarterGroups().map((group, index) => ({ ...group, enabled: index < groupCount })), groupCount })
    await page.reload()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await checkFit()
    for (const [index, group] of groups.entries()) {
      for (const word of group.words) await page.getByRole('button', { name: word, exact: true }).click()
      await page.getByRole('button', { name: 'Submit', exact: true }).click()
      await page.waitForFunction((count) => document.querySelectorAll('.solved-group').length === count && document.querySelector('.game-board')?.getAttribute('aria-busy') === 'false', index + 1)
      if (index === 0 || index === groups.length - 1) await checkFit()
    }
  }
  assert.deepEqual(errors, [])
  console.log('Viewport verification passed: 2, 4, and 6 groups, initial/partly solved/completed boards, and five window sizes.')
} finally {
  await browser.close()
  await server.stop()
}
