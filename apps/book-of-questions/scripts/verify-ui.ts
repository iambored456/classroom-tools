import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from '../../../scripts/lib/static-server.ts'
import { createStarterLibrary, formatQuestionForDisplay, questionSizeClass, splitFollowUpPrompts } from '../src/data.ts'

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

const starterLibrary = createStarterLibrary()
const starterQuestions = starterLibrary.questions
const explicitQuestionCount = starterQuestions.filter((question) => question.explicit).length
assert.equal(starterQuestions.length, 1_486)
assert.equal(starterLibrary.categories.length, 12)
assert.equal(explicitQuestionCount, 61)
assert.equal(starterQuestions.find((question) => question.id === 'stock-037')?.explicit, true)
assert.equal(starterQuestions.find((question) => question.id === 'stock-192')?.explicit, true)
assert.equal(starterQuestions.find((question) => question.id === 'poole-0924')?.explicit, true)
assert.equal(starterQuestions.find((question) => question.id === 'stock-002')?.explicit, false)
assert.equal(starterQuestions.find((question) => question.id === 'kids-stock-029')?.explicit, true)
assert.equal(starterQuestions.find((question) => question.id === 'kids-stock-257')?.explicit, true)
assert.equal(starterQuestions.find((question) => question.id === 'kids-stock-001')?.explicit, false)
assert.equal(
  starterQuestions.filter((question) => question.categoryId === 'kids-book-of-questions').length,
  268,
)
assert.equal(questionSizeClass(starterQuestions.find((question) => question.id === 'stock-051')!), 'long')
assert.equal(questionSizeClass(starterQuestions.find((question) => question.id === 'stock-023')!), 'very-long')

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
  await page.evaluate((legacyLibrary) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('book-of-questions:library:v1', JSON.stringify({
      ...legacyLibrary,
      questions: legacyLibrary.questions.map((question) => ({ ...question, explicit: false })),
    }))
  }, starterLibrary)
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const migratedExplicitCount = await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem('book-of-questions:library:v2') ?? 'null')
    return library?.questions.filter((question: { explicit: boolean }) => question.explicit).length
  })
  assert.equal(migratedExplicitCount, explicitQuestionCount)

  await page.getByRole('heading', { name: 'Book of Questions' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Resume' }).isDisabled(), true)
  assert.equal(await page.locator('.monogram').count(), 0)
  assert.equal(await page.getByText('One thoughtful question at a time.').count(), 0)
  assert.equal(await page.getByText('1,486 questions enabled', { exact: false }).count(), 1)
  assert.equal(await page.getByText('12 categories', { exact: false }).count(), 1)
  assert.equal(await page.locator('.session-panel .library-button').count(), 0)
  assert.equal(await page.locator('.landing-card > .landing-library-button').count(), 1)
  assert.equal(await page.getByRole('heading', { name: 'Sessions', exact: true }).count(), 1)
  assert.equal(await page.getByText('Saved sessions', { exact: true }).count(), 0)
  assert.equal(await page.getByText('Pick up where you left off', { exact: true }).count(), 0)
  const landingWidths = await page.evaluate(() => ({
    library: document.querySelector<HTMLElement>('.landing-library-button')?.getBoundingClientRect().width ?? 0,
    sessions: document.querySelector<HTMLElement>('.session-panel')?.getBoundingClientRect().width ?? 0,
  }))
  assert.ok(landingWidths.library < landingWidths.sessions)
  const landingVerticalSpace = await page.locator('.landing-card').evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { above: bounds.top, below: window.innerHeight - bounds.bottom }
  })
  assert.ok(Math.abs(landingVerticalSpace.above - landingVerticalSpace.below) <= 1)
  const landingScale = await page.evaluate(() => {
    const title = document.querySelector<HTMLElement>('.landing-copy h1')
    const sessionHeading = document.querySelector<HTMLElement>('.session-panel h2')
    const action = document.querySelector<HTMLElement>('.landing-actions button')
    return {
      titleSize: Number.parseFloat(getComputedStyle(title!).fontSize),
      sessionHeadingSize: Number.parseFloat(getComputedStyle(sessionHeading!).fontSize),
      sessionHeadingAlignment: getComputedStyle(sessionHeading!).textAlign,
      actionFontSize: Number.parseFloat(getComputedStyle(action!).fontSize),
      actionHeight: action!.getBoundingClientRect().height,
    }
  })
  assert.ok(landingScale.titleSize >= 120)
  assert.ok(landingScale.sessionHeadingSize >= 36 && landingScale.sessionHeadingSize <= 41)
  assert.equal(landingScale.sessionHeadingAlignment, 'center')
  assert.ok(landingScale.actionFontSize >= 23)
  assert.ok(landingScale.actionHeight >= 80)
  assert.equal(await page.getByRole('checkbox', { name: 'Dark mode' }).isChecked(), true)
  assert.equal(
    await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"')),
    true,
  )
  await page.getByRole('button', { name: /Question Library/ }).click()
  const libraryDialog = page.getByRole('dialog', { name: 'Question Library' })
  await libraryDialog.waitFor()
  assert.equal(await libraryDialog.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(21, 21, 21)')
  assert.equal(await libraryDialog.getByText('Question collection', { exact: true }).count(), 0)
  assert.equal(await libraryDialog.getByRole('searchbox').count(), 0)
  assert.equal(await libraryDialog.locator('.category-row').count(), 12)
  assert.equal(
    await libraryDialog.getByRole('button', { name: /^Kids' Book of Questions 268 of 268 enabled$/ }).count(),
    1,
  )
  assert.equal(await libraryDialog.locator('.question-library-card').count(), 217)

  assert.equal(await libraryDialog.locator('.question-card-copy > small').count(), 0)
  const alcoholQuestion = libraryDialog.locator('.question-library-card').filter({ hasText: 'What was your best experience with drugs or alcohol?' })
  assert.equal(await alcoholQuestion.getByRole('button', { name: 'Explicit' }).getAttribute('aria-pressed'), 'true')
  const ghostQuestion = libraryDialog.locator('.question-library-card').filter({ hasText: 'Do you believe in ghosts or evil spirits?' })
  assert.equal(await ghostQuestion.getByRole('button', { name: 'Not Explicit' }).getAttribute('aria-pressed'), 'false')
  await ghostQuestion.getByRole('button', { name: 'Not Explicit' }).click()
  assert.equal(await ghostQuestion.getByRole('button', { name: 'Explicit' }).getAttribute('aria-pressed'), 'true')
  await libraryDialog.getByRole('button', { name: 'Disable Explicit Questions' }).click()
  assert.match(
    await libraryDialog.locator('.library-header').innerText(),
    new RegExp(`${(starterQuestions.length - explicitQuestionCount - 1).toLocaleString()} of 1,486 questions enabled`),
  )
  await libraryDialog.getByRole('button', { name: 'Add category' }).click()
  await libraryDialog.getByLabel('New category').fill('Community')
  await libraryDialog.locator('.category-form').getByRole('button', { name: 'Save' }).click()
  await libraryDialog.getByRole('heading', { name: 'Community' }).waitFor()
  assert.equal(await libraryDialog.locator('.category-row').count(), 13)

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
  const mainQuestionStyle = await page.locator('.question-card h1').evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: Number.parseFloat(style.fontSize), fontWeight: style.fontWeight }
  })
  assert.ok(mainQuestionStyle.fontSize >= 90)
  assert.equal(mainQuestionStyle.fontWeight, '400')
  assert.equal(await page.getByRole('button', { name: 'Session Settings' }).innerText(), '')
  const settingsIcon = page.getByRole('button', { name: 'Session Settings' }).locator('.settings-tool-icon')
  assert.equal(await settingsIcon.getAttribute('data-icon-source'), 'music-learning-tools/packages/diatonic-compass-ui/public/assets/Settings_optimized.svg')
  assert.match(await settingsIcon.getAttribute('src') ?? '', /Settings_optimized-.*\.svg$/)
  assert.equal(await page.locator('.question-shortcuts').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Choose another card' }).innerText(), 'Choose another card')
  assert.equal(await page.locator('.follow-up-reveal-icon').count(), 0)
  assert.equal(await page.getByRole('button', { name: /Next Card/ }).isDisabled(), true)
  await page.getByRole('button', { name: 'Follow-Up Question' }).click()
  assert.equal(await page.getByRole('button', { name: /Next Card/ }).isEnabled(), true)
  await page.getByText('What’s the advantage of your method?', { exact: true }).waitFor()
  const followUpStyle = await page.locator('.follow-up-sequence li').evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: Number.parseFloat(style.fontSize), fontWeight: style.fontWeight }
  })
  assert.ok(followUpStyle.fontSize >= 36)
  assert.equal(followUpStyle.fontWeight, '400')
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
  await page.evaluate(() => {
    Math.random = () => 0
  })

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
  const sessionCardLayout = await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>('.session-list')!.getBoundingClientRect()
    const card = document.querySelector<HTMLElement>('.session-card')!.getBoundingClientRect()
    return {
      listCentre: list.left + list.width / 2,
      cardCentre: card.left + card.width / 2,
      widthRatio: card.width / list.width,
    }
  })
  assert.ok(Math.abs(sessionCardLayout.listCentre - sessionCardLayout.cardCentre) <= 1)
  assert.ok(sessionCardLayout.widthRatio >= .9)
  assert.equal(await page.locator('.session-card-copy small').count(), 0)
  assert.equal(await page.locator('.session-progress strong').innerText(), '1/100')
  assert.equal(await page.locator('.session-progress').getAttribute('aria-label'), '1 of 100 questions completed')
  assert.match(await page.locator('.session-card-footer').innerText(), /^Last played /)
  const questionSetsToggle = page.getByRole('button', { name: 'Show question sets for Period 2' })
  assert.equal(await questionSetsToggle.getAttribute('aria-expanded'), 'false')
  const questionSetsId = await questionSetsToggle.getAttribute('aria-controls')
  assert.ok(questionSetsId)
  await questionSetsToggle.click()
  assert.equal(
    await page.getByRole('button', { name: 'Hide question sets for Period 2' }).getAttribute('aria-expanded'),
    'true',
  )
  const questionSets = page.locator(`#${questionSetsId}`)
  await questionSets.waitFor()
  assert.equal(await questionSets.getByText('Question sets enabled', { exact: true }).count(), 1)
  assert.match(await questionSets.innerText(), /Light & Easy\s+100 enabled/)
  assert.equal(await questionSets.getByText('Explicit questions excluded', { exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Hide question sets for Period 2' }).click()
  assert.equal(await questionSets.count(), 0)
  await page.getByRole('button', { name: 'More actions for Period 2' }).click()
  const sessionMenu = page.locator('.session-menu-popover:popover-open')
  await sessionMenu.waitFor()
  const sessionMenuLayer = await sessionMenu.evaluate((menu) => {
    const menuBounds = menu.getBoundingClientRect()
    const listBounds = document.querySelector<HTMLElement>('.session-list')!.getBoundingClientRect()
    const topmostElement = document.elementFromPoint(
      menuBounds.left + menuBounds.width / 2,
      menuBounds.top + menuBounds.height / 2,
    )
    return {
      overflowsList: menuBounds.bottom > listBounds.bottom || menuBounds.top < listBounds.top,
      isTopmost: topmostElement === menu || menu.contains(topmostElement),
    }
  })
  assert.equal(sessionMenuLayer.overflowsList, true)
  assert.equal(sessionMenuLayer.isTopmost, true)
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
