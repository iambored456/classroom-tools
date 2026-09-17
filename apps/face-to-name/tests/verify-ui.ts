import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type Page } from 'playwright'
import { type FaceSet } from '../src/model.ts'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'node_modules/.cache/face-to-name-qa')
await mkdir(output, { recursive: true })
const url = process.env.FACE_TEST_URL ?? 'http://localhost:5193/face-to-name/'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true })
const page = await context.newPage()
const failures: string[] = []
page.on('pageerror', error => failures.push(error.message))
const id = `qa-${Date.now()}`
const fixtureFile = resolve(root, 'apps/face-to-name/public/sets', `${id}.json`)
async function click(text: string) { await page.getByRole('button', { name: text, exact: true }).click() }
async function noOverflow(page: Page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal overflow') }

try {
  await page.goto(url)
  await page.getByRole('button', { name: 'Create a set' }).waitFor()
  await page.screenshot({ path: resolve(output, 'home-desktop.png'), fullPage: true })
  const names = ['Jake M.', 'Maya', 'Alex', 'Robin']
  // Distinct, labelled raster test cards stand in for photos; no fixture is shipped.
  const photos = await page.evaluate((names) => names.map((name, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 400
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = ['#9dc9dc', '#e5ba97', '#bccb8d', '#b6a8cc'][i]; ctx.fillRect(0, 0, 320, 400)
    ctx.fillStyle = '#163440'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, 160, 205)
    return canvas.toDataURL('image/png')
  }), names)
  await page.getByRole('button', { name: 'Create a set' }).click()
  await page.getByLabel('Set title', { exact: true }).fill('Riverside Rugby')
  assert.equal(await page.getByRole('button', { name: 'Export for publishing', exact: true }).isDisabled(), true)
  await page.getByLabel('Upload photos', { exact: true }).setInputFiles(photos.map((photo, i) => ({ name: `${names[i]}.png`, mimeType: 'image/png', buffer: Buffer.from(photo.split(',')[1], 'base64') })))
  await page.locator('.assignment').nth(3).waitFor()
  for (const name of names) {
    await page.locator('.assignment').first().getByLabel('Preferred name').fill(name)
    await page.locator('.assignment').first().getByRole('button', { name: 'Assign photo' }).click()
  }
  await page.getByText('Saved on this browser', { exact: true }).waitFor()
  await page.locator('.editor-person').nth(1).getByLabel('Preferred name').fill(' jake m. ')
  assert.equal(await page.getByRole('button', { name: 'Export for publishing', exact: true }).isDisabled(), true)
  await page.getByText(/already used/).waitFor()
  await page.locator('.editor-person').nth(1).getByLabel('Preferred name').fill('Maya')
  // Attach a second and third image; the full person must then be unavailable.
  for (let i = 0; i < 2; i++) {
    await page.getByLabel('Upload photos', { exact: true }).setInputFiles({ name: 'alternate.png', mimeType: 'image/png', buffer: Buffer.from(photos[0].split(',')[1], 'base64') })
    await page.locator('.assignment').first().getByLabel('Attach to').selectOption({ label: `Jake M. (${i + 1}/3 photos)` })
    await page.locator('.assignment').first().getByRole('button', { name: 'Assign photo' }).click()
  }
  await page.getByLabel('Upload photos', { exact: true }).setInputFiles({ name: 'fourth.png', mimeType: 'image/png', buffer: Buffer.from(photos[0].split(',')[1], 'base64') })
  await page.locator('.assignment').waitFor()
  assert.equal(await page.locator('.assignment option').filter({ hasText: 'Jake M. (3/3 photos)' }).isDisabled(), true)
  await page.locator('.assignment').getByRole('button', { name: 'Discard' }).click()
  const downloadPromise = page.waitForEvent('download')
  await click('Export for publishing')
  const download = await downloadPromise
  await download.saveAs(resolve(output, 'export.json'))
  const set: FaceSet = JSON.parse(await readFile(resolve(output, 'export.json'), 'utf8'))
  assert.equal(set.people.length, 4); assert.equal(set.people[0].photos.length, 3)
  await page.reload()
  await page.getByRole('heading', { name: 'Riverside Rugby', exact: true }).waitFor()
  await click('Edit set')
  await page.screenshot({ path: resolve(output, 'builder-desktop.png'), fullPage: true })
  await click('Browse & practice →')
  await page.getByRole('heading', { name: 'Riverside Rugby', exact: true }).waitFor()
  assert.equal(await page.locator('.person-card').count(), 4)
  await page.getByRole('button', { name: 'Next photo of Jake M.' }).click()
  await page.screenshot({ path: resolve(output, 'gallery-desktop.png'), fullPage: true })
  await page.getByLabel('Practice direction').selectOption('face')
  await click('Start practice →')
  assert.equal(await page.locator('.answer').count(), 4)
  // A mistake visibly reveals the correct pairing and disables further answers.
  let photo = await page.locator('.question-photo img').getAttribute('src')
  let target = set.people.find(p => p.photos.includes(photo!))!
  await page.getByRole('button', { name: set.people.find(p => p.id !== target.id)!.name, exact: true }).click()
  await page.getByText(`This is ${target.name}.`, { exact: true }).waitFor()
  assert.equal(await page.locator('.answer.correct').count(), 1)
  assert.equal(await page.locator('.answer.incorrect').count(), 1)
  assert.equal(await page.locator('.answer:disabled').count(), 4)
  await page.screenshot({ path: resolve(output, 'practice-feedback.png'), fullPage: true })
  await page.reload()
  await click('Browse & practice →')
  await click('Resume practice →')
  await click('← Back to everyone')
  await page.getByLabel('Practice direction').selectOption('mixed')
  await click('Resume practice →')
  let questions = 0
  const seen = new Set<string>()
  while (await page.locator('.quiz').count()) {
    const face = await page.locator('.question-photo').count()
    seen.add(face ? 'face' : 'name')
    if (face) {
      photo = await page.locator('.question-photo img').getAttribute('src')
      target = set.people.find(p => p.photos.includes(photo!))!
      await page.getByRole('button', { name: target.name, exact: true }).click()
    } else {
      const prompt = await page.locator('#practice-heading').innerText()
      target = set.people.find(p => prompt === `Which one is ${p.name}?`)!
      const sources = await page.locator('.answer img').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')))
      const index = sources.findIndex(src => target.photos.includes(src!))
      assert.ok(index >= 0)
      await page.locator('.answer').nth(index).click()
    }
    await page.locator('#next-question').click()
    assert.ok(++questions <= 20, 'Mixed practice ends')
  }
  assert.equal(questions, 16)
  assert.equal(seen.size, 2)
  await page.getByRole('heading', { name: 'You know your people.' }).waitFor()
  await click('Back to everyone')
  await page.getByText('4 of 4 people ready', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await noOverflow(page)
  await page.screenshot({ path: resolve(output, 'gallery-mobile.png'), fullPage: true })
  await click('Start this mode fresh')
  await click('Start fresh')
  await noOverflow(page)
  await page.screenshot({ path: resolve(output, 'practice-mobile.png'), fullPage: true })
  await click('← Back to everyone')
  await click('Edit set')
  await noOverflow(page)
  await page.screenshot({ path: resolve(output, 'builder-mobile.png'), fullPage: true })
  await page.goto(url)
  await page.getByLabel('Import set file').setInputFiles(resolve(output, 'export.json'))
  await page.getByRole('dialog').waitFor()
  await click('Replace local copy')
  await page.getByLabel('Set title', { exact: true }).waitFor()
  // Real static link loading, without a directory or permanent test dataset.
  const publishInput = resolve(output, 'publish.json')
  await writeFile(publishInput, JSON.stringify({ ...set, id }))
  const result = execFileSync(process.execPath, ['--import', 'tsx', resolve(root, 'scripts/publish-face-set.ts'), publishInput], { cwd: root, encoding: 'utf8' })
  assert.ok(result.includes(`?set=${id}`))
  assert.equal(JSON.parse(await readFile(fixtureFile, 'utf8')).id, id)
  await page.goto(`${url}?set=${id}`)
  await page.getByRole('heading', { name: 'Riverside Rugby', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Edit set', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Copy practice link ↗', exact: true }).count(), 1)
  await page.goto(`${url}?set=missing-set`)
  await page.getByRole('heading', { name: 'We couldn’t open this set' }).waitFor()
  await page.goto(`${url}?set=..%2Fbad`)
  await page.getByText('This set link is invalid.', { exact: false }).waitFor()
  assert.deepEqual(failures, [])
  console.log(`UI checks passed: bulk upload, duplicate validation, three-photo limit, export/import, draft persistence, both question directions, mistake feedback, 16-question mixed completion, saved progress, mobile layouts, published and invalid links. Screenshots: ${output}`)
} finally {
  await rm(fixtureFile, { force: true })
  await browser.close()
}
