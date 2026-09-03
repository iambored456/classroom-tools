import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from '../../../scripts/lib/static-server.ts'

const ROOT_BASE = '/classroom-tools/'
const rootDir = resolve(import.meta.dirname, '..')
const server = await startStaticServer({
  rootDir: join(rootDir, 'dist'),
  basePath: ROOT_BASE,
  host: '127.0.0.1',
})
const browser = await chromium.launch({ headless: true })

const expectedTags = new Map([
  ['Classroom Wordle', 'Dev. Ed.'],
  ['Classroom Connections', 'Dev. Ed.'],
  ['City Routes', 'Dev. Ed.'],
  ['Launchpad Whack-a-Mole', 'Dev. Ed.'],
  ['Fish Visualizer', 'Dev. Ed.'],
  ['ReadAlong Highlighter', 'Classroom'],
  ['ClassClock', 'Classroom'],
  ['Class Schedule Widget', 'Classroom'],
  ['OKLCH Visualizer', 'Classroom'],
  ['Launchpad Controller', 'Classroom'],
  ['Rugby Play Visualizer', 'Sports'],
  ['Coordinates', 'Math'],
  ['Simple & Compound Interest', 'Math'],
  ['Tax Brackets', 'Math'],
])

try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${server.url}${ROOT_BASE}`, { waitUntil: 'networkidle' })

  await page.getByRole('heading', { name: 'Classroom Tools' }).waitFor()
  assert.equal(await page.locator('.subhead').count(), 0)
  assert.equal(await page.locator('.folder-button, .folder-modal').count(), 0)
  assert.equal(await page.locator('.card').count(), expectedTags.size)

  for (const [name, expectedTag] of expectedTags) {
    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name, exact: true }) })
    assert.equal(await card.count(), 1, name)
    assert.equal((await card.locator('.tags span').allTextContents()).join(','), expectedTag, name)
    assert.equal(await card.locator('a.preview-link').count(), 1, name)
  }

  assert.equal(
    await page.locator('.preview img').evaluateAll((images) =>
      images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
    ),
    true,
  )

  assert.equal(
    await page.locator('.card').filter({ hasText: 'Classroom Wordle' }).locator('.description').innerText(),
    'Guess the hidden word.\nAdjust length, attempts, and answers.',
  )
  assert.equal(
    await page.locator('.card').filter({ hasText: 'Classroom Connections' }).locator('.description').innerText(),
    'Find groups of connected words.\nAdjust difficulty, groups, and make your own.',
  )
  assert.equal(
    await page.locator('.card').filter({ hasText: 'City Routes' }).locator('.description').innerText(),
    'Plan routes through a city.\nThen, watch every instruction play out.',
  )

  console.log('Classroom Tools homepage UI verification passed.')
  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
