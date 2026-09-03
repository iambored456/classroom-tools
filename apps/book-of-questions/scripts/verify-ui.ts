import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from '../../../scripts/lib/static-server.ts'
import { formatQuestionForDisplay, splitFollowUpPrompts } from '../src/data.ts'

assert.deepEqual(
  splitFollowUpPrompts('What happened first? What changed next! What did you learn.'),
  ['What happened first?', 'What changed next!', 'What did you learn.'],
)
assert.deepEqual(
  splitFollowUpPrompts('If not, why not?\nWhich matters more?'),
  ['If not, why not?', 'Which matters more?'],
)
assert.equal(
  formatQuestionForDisplay('First statement. Second clause; final question?'),
  'First statement.\nSecond clause;\nfinal question?',
)

const rootDir = resolve(import.meta.dirname, '..')
const server = await startStaticServer({
  rootDir: join(rootDir, 'dist'),
  basePath: '/',
  host: '127.0.0.1',
})
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`))

  await page.goto(server.url, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)

  await page.getByRole('heading', { name: 'Book of Questions' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Resume' }).isDisabled(), true)
  assert.equal(await page.locator('.monogram').count(), 0)
  assert.equal(await page.getByText('One thoughtful question at a time.').count(), 0)
  assert.equal(await page.getByText('1,218 questions enabled', { exact: false }).count(), 1)
  assert.equal(await page.getByText('11 categories', { exact: false }).count(), 1)
  assert.equal(await page.locator('.session-panel .library-button').count(), 0)
  assert.equal(await page.locator('.landing-card > .landing-library-button').count(), 1)
  assert.equal(await page.getByRole('checkbox', { name: 'Dark mode' }).isChecked(), true)
  assert.equal(
    await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"')),
    true,
  )
  await page.getByRole('button', { name: /Question Library/ }).click()
  const libraryDialog = page.getByRole('dialog', { name: 'Question Library' })
  await libraryDialog.waitFor()
  assert.equal(await libraryDialog.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(21, 21, 21)')
  assert.equal(await libraryDialog.locator('.category-row').count(), 11)
  assert.equal(await libraryDialog.locator('.question-library-card').count(), 217)

  await libraryDialog.getByPlaceholder('Search questions and follow-ups').fill('ghosts or evil spirits')
  assert.equal(await libraryDialog.locator('.question-library-card').count(), 1)
  assert.equal(await libraryDialog.locator('.question-card-copy > small').count(), 0)
  await libraryDialog.getByRole('button', { name: 'Not Explicit' }).click()
  assert.equal(await libraryDialog.getByRole('button', { name: 'Explicit' }).getAttribute('aria-pressed'), 'true')
  await libraryDialog.getByRole('button', { name: 'Disable Explicit Questions' }).click()
  assert.match(await libraryDialog.locator('.library-header').innerText(), /1,217 of 1,218 questions enabled/)
  await libraryDialog.getByRole('button', { name: 'Add category' }).click()
  await libraryDialog.getByLabel('New category').fill('Community')
  await libraryDialog.locator('.category-form').getByRole('button', { name: 'Save' }).click()
  await libraryDialog.getByRole('heading', { name: 'Community' }).waitFor()
  assert.equal(await libraryDialog.locator('.category-row').count(), 12)

  await libraryDialog.getByRole('button', { name: 'Add Question' }).click()
  await libraryDialog.getByLabel('Main question').fill('What makes a classroom feel welcoming?')
  await libraryDialog.getByLabel(/Follow-up question/).fill('What is one thing we could do tomorrow? Who could help us!')
  assert.equal(await libraryDialog.locator('.follow-up-registration li').count(), 2)
  assert.equal(await libraryDialog.locator('.follow-up-registration ol').count(), 0)
  await libraryDialog.locator('.question-form').getByRole('button', { name: 'Add Question' }).click()
  await libraryDialog.getByText('What makes a classroom feel welcoming?', { exact: true }).waitFor()
  assert.equal(await libraryDialog.locator('.question-library-card .follow-up-preview li').count(), 2)
  await libraryDialog.getByRole('button', { name: 'Close question library' }).click()

  await page.getByRole('button', { name: 'New Session' }).click()
  const sessionDialog = page.getByRole('dialog', { name: 'Choose your questions' })
  await sessionDialog.waitFor()
  assert.equal(await sessionDialog.getByRole('checkbox', { name: /Include Explicit Questions/ }).isChecked(), false)
  await sessionDialog.getByLabel('Session name').fill('Period 2')
  await sessionDialog.locator('.category-choice').filter({ hasText: 'Light & Easy' }).click()
  assert.match(await sessionDialog.locator('.dialog-footer').innerText(), /100\s+questions available/)
  await page.evaluate(() => {
    Math.random = () => 0
  })
  await sessionDialog.getByRole('button', { name: 'Start Session' }).click()

  await page.getByRole('heading', { name: 'Do you squeeze the toothpaste tube or roll it?' }).waitFor()
  assert.match(await page.locator('.active-session-heading').innerText(), /0\/100/)
  assert.equal(await page.getByRole('button', { name: 'Session Settings' }).innerText(), '')
  assert.equal(await page.locator('.question-shortcuts').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Choose another card' }).innerText(), 'Choose another card')
  assert.equal(await page.locator('.follow-up-reveal-icon').count(), 0)
  assert.equal(await page.getByRole('button', { name: /Next Card/ }).isDisabled(), true)
  await page.getByRole('button', { name: 'Follow-Up Question' }).click()
  assert.equal(await page.getByRole('button', { name: /Next Card/ }).isEnabled(), true)
  await page.getByText('What’s the advantage of your method?', { exact: true }).waitFor()
  await page.getByRole('button', { name: /Choose another card/ }).click()
  await page.getByRole('heading', { name: 'How many siblings do you have?' }).waitFor()

  const savedAfterSwap = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('book-of-questions:sessions:v1') ?? '[]'),
  ) as Array<{ askedQuestionIds: string[]; currentQuestionId: string }>
  assert.deepEqual(savedAfterSwap[0].askedQuestionIds, [])
  assert.equal(savedAfterSwap[0].currentQuestionId, 'poole-0002')

  await page.getByRole('button', { name: 'Return to sessions' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.getByRole('button', { name: 'Resume' }).isEnabled(), true)
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.getByRole('heading', { name: 'How many siblings do you have?' }).waitFor()

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Space')
  await page.getByText('What’s your birth order?', { exact: true }).waitFor()
  await page.keyboard.press('ArrowRight')
  const savedAfterKeyboard = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('book-of-questions:sessions:v1') ?? '[]'),
  ) as Array<{ askedQuestionIds: string[]; currentQuestionId: string }>
  assert.deepEqual(savedAfterKeyboard[0].askedQuestionIds, ['poole-0002'])
  assert.equal(savedAfterKeyboard[0].currentQuestionId, 'poole-0001')

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    false,
  )

  await page.setViewportSize({ width: 1200, height: 900 })
  await page.getByRole('button', { name: 'Return to sessions' }).click()
  await page.locator('summary[aria-label="More actions for Period 2"]').click()
  await page.getByRole('button', { name: 'Edit name & categories' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit this session' })
  await editDialog.getByLabel('Session name').fill('Period 3')
  await editDialog.getByRole('button', { name: 'Save Changes' }).click()
  await page.getByText('Period 3', { exact: true }).waitFor()

  await page.getByRole('button', { name: /Question Library/ }).click()
  await page.getByRole('dialog', { name: 'Question Library' }).getByRole('button', { name: /^Community 1 of 1 enabled$/ }).waitFor()
  await page.getByRole('button', { name: 'Close question library' }).click()

  assert.deepEqual(browserErrors, [])
  console.log('Book of Questions UI verification passed.')

  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
