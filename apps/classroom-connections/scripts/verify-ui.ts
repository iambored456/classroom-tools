import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from '../../../scripts/lib/static-server.ts'

const ROOT_BASE = '/classroom-tools/classroom-connections/'
const rootDir = resolve(import.meta.dirname, '..')
const landingShot = join(tmpdir(), 'classroom-connections-landing.png')
const lightLandingShot = join(tmpdir(), 'classroom-connections-landing-light.png')
const libraryShot = join(tmpdir(), 'classroom-connections-library.png')
const pendingShot = join(tmpdir(), 'classroom-connections-pending.png')
const wrongShot = join(tmpdir(), 'classroom-connections-wrong.png')
const movingShot = join(tmpdir(), 'classroom-connections-moving.png')
const gameShot = join(tmpdir(), 'classroom-connections-game.png')
const mobileShot = join(tmpdir(), 'classroom-connections-mobile.png')
const completionShot = join(tmpdir(), 'classroom-connections-completion.png')

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const server = await startStaticServer({
  rootDir: join(rootDir, 'dist'),
  basePath: ROOT_BASE,
  host: '127.0.0.1',
})
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`Browser console: ${message.text()}`)
  })
  page.on('pageerror', (error) => console.error(`Browser page error: ${error.message}`))
  const url = `${server.url}${ROOT_BASE}`
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(url).origin,
  })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  assert.equal(
    await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"')),
    true,
  )
  await page.locator('.landing-card').waitFor()
  await page.getByRole('heading', { name: 'Classroom Connections' }).waitFor()
  const themeToggle = page.getByRole('checkbox', { name: 'Dark mode' })
  assert.equal(await themeToggle.isChecked(), true)
  const darkLandingBackground = await page.locator('.landing-screen').evaluate((screen) =>
    getComputedStyle(screen).backgroundImage,
  )
  await page.locator('.theme-toggle').click()
  assert.equal(await page.locator('.landing-screen.dark-mode').count(), 0)
  const lightLandingBackground = await page.locator('.landing-screen').evaluate((screen) =>
    getComputedStyle(screen).backgroundImage,
  )
  assert.notEqual(lightLandingBackground, darkLandingBackground)
  assert.equal(await page.getByRole('button', { name: 'Play', exact: true }).innerText(), 'Play')
  assert.equal(
    await page.getByRole('button', { name: 'Play', exact: true }).evaluate((button) =>
      getComputedStyle(button).color,
    ),
    'rgb(255, 255, 255)',
  )
  await page.waitForTimeout(150)
  await page.screenshot({ path: lightLandingShot, fullPage: false })
  await page.locator('.theme-toggle').click()
  assert.equal(await page.locator('.landing-screen.dark-mode').count(), 1)
  assert.equal(await page.locator('.landing-eyebrow, .landing-meta').count(), 0)
  assert.equal(await page.getByRole('link', { name: 'Classroom Tools home' }).innerText(), '')
  assert.ok(
    await page
      .locator('body, .landing-copy h1, .landing-copy p, .landing-button')
      .evaluateAll((elements) =>
        elements.every((element) =>
          getComputedStyle(element).fontFamily.includes('Atkinson Hyperlegible Next'),
        ),
      ),
  )
  assert.ok((await page.locator('.hub-link svg').evaluate((icon) => icon.getBoundingClientRect().width)) >= 25)
  assert.ok(
    Number.parseFloat(await page.locator('.landing-copy h1').evaluate((heading) => getComputedStyle(heading).fontSize)) >= 70,
  )
  assert.ok(
    Number.parseFloat(
      await page.getByRole('button', { name: 'Play', exact: true }).evaluate((button) => getComputedStyle(button).fontSize),
    ) >= 24,
  )
  await page.screenshot({ path: landingShot, fullPage: false })

  await page.getByRole('button', { name: 'Group Library' }).click()
  await page.getByRole('dialog', { name: 'Group Library' }).waitFor()
  assert.equal(await page.locator('.tier-section').count(), 4)
  assert.equal(await page.locator('.group-card').count(), 96)

  const easySection = page.locator('.tier-section').first()
  const copyEasyButton = easySection.getByRole('button', { name: 'Copy all Easy groups' })
  await copyEasyButton.click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Copied!'),
  )
  const copiedEasyGroups = await page.evaluate(() => navigator.clipboard.readText())
  const copiedEasyLines = copiedEasyGroups.split(/\r?\n/)
  assert.equal(copiedEasyLines.length, 24)
  assert.equal(copiedEasyLines[0], 'Bugs:(Ladybug,Ant,Beetle,Firefly)')
  assert.ok(copiedEasyLines.includes('Tools:(Hammer,Screwdriver,Drill,Saw)'))
  assert.ok(copiedEasyLines.includes('Vegetables:(Carrot,Peas,Corn,Broccoli)'))

  await easySection.getByRole('button', { name: 'Disable all' }).click()
  assert.match(await page.locator('.enabled-summary').innerText(), /72\s+of 96 groups enabled/i)
  assert.equal(await easySection.locator('.switch-label input:checked').count(), 0)
  await easySection.getByRole('button', { name: 'Enable all' }).click()
  assert.match(await page.locator('.enabled-summary').innerText(), /96\s+of 96 groups enabled/i)

  await page.getByRole('button', { name: 'Close group library' }).click()
  await page.evaluate(() => {
    const raw = localStorage.getItem('classroom-connections:library:v1')
    const groups = raw ? JSON.parse(raw) : []
    localStorage.setItem('classroom-connections:library:v1', JSON.stringify(groups.slice(0, 48)))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Group Library' }).click()
  assert.equal(await page.locator('.group-card').count(), 96)
  await page.getByText('Vegetables', { exact: true }).waitFor()

  await page.getByRole('button', { name: /Add group/ }).first().click()
  await page.getByLabel('Category name').fill('Things in a garden')
  const words = ['Soil', 'Seeds', 'Hose', 'Shovel']
  for (let index = 0; index < words.length; index += 1) {
    await page.getByPlaceholder(`Word ${index + 1}`).fill(words[index])
  }
  await page.getByRole('button', { name: 'Add to library' }).click()
  await page.getByText('Things in a garden', { exact: true }).waitFor()
  assert.match(await page.locator('.enabled-summary').innerText(), /97\s+of 97 groups enabled/i)
  await page.screenshot({ path: libraryShot, fullPage: false })

  await page.getByRole('button', { name: 'Close group library' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Group Library' }).click()
  assert.match(await page.locator('.enabled-summary').innerText(), /97\s+of 97 groups enabled/i)
  await page.getByRole('button', { name: 'Close group library' }).click()

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('.tile-grid').waitFor()
  assert.equal(await page.locator('.game-screen.dark-mode').count(), 1)
  assert.equal(await page.locator('.game-screen').evaluate((screen) => getComputedStyle(screen).backgroundColor), 'rgb(21, 20, 30)')
  assert.equal(await page.locator('.word-tile').count(), 16)
  assert.equal(await page.getByRole('button', { name: 'Library' }).count(), 0)
  assert.equal(await page.locator('.game-header, .game-instruction').count(), 0)
  assert.ok((await page.locator('.home-action svg').evaluate((icon) => icon.getBoundingClientRect().width)) >= 25)
  assert.ok(
    Number.parseFloat(await page.locator('.word-tile').first().evaluate((tile) => getComputedStyle(tile).fontSize)) >= 20,
  )
  assert.ok(
    Number.parseFloat(
      await page.getByRole('button', { name: 'Shuffle' }).evaluate((button) => getComputedStyle(button).fontSize),
    ) >= 18,
  )
  await page.getByRole('button', { name: 'Return to home' }).click()
  await page.getByRole('dialog', { name: 'Are you sure you want to exit the game?' }).waitFor()
  await page.getByRole('button', { name: 'Stay' }).click()
  await page.locator('.tile-grid').waitFor()

  const tileWords = (await page.locator('.word-tile').allTextContents()).map((word) =>
    word.trim().toLocaleLowerCase(),
  )
  const storedGroups = await page.evaluate(() => {
    const raw = localStorage.getItem('classroom-connections:library:v1')
    return raw ? JSON.parse(raw) : []
  })
  const playableGroups = storedGroups.filter((group: { words: string[] }) =>
    group.words.every((word) => tileWords.includes(word.trim().toLocaleLowerCase())),
  ) as Array<{ title: string; words: string[] }>

  assert.equal(playableGroups.length, 4, 'Expected four complete groups to be present on the board')

  for (const group of playableGroups) {
    const word = group.words[0]
    await page
      .locator('.word-tile')
      .filter({ hasText: new RegExp(`^${escapeRegExp(word)}$`, 'i') })
      .click()
  }
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.locator('.word-tile.pending').first().waitFor()
  assert.equal(await page.locator('.word-tile.pending').count(), 4)
  await page.screenshot({ path: pendingShot, fullPage: false })

  await page.locator('.word-tile.wrong').first().waitFor()
  assert.equal(await page.locator('.word-tile.wrong').count(), 4)
  await page.screenshot({ path: wrongShot, fullPage: false })
  await page.locator('.word-tile.wrong').first().waitFor({ state: 'detached' })
  assert.equal(await page.locator('.word-tile[aria-pressed="true"]').count(), 4)
  await page.getByRole('button', { name: 'Deselect All' }).click()

  const playableGroup = playableGroups[0]

  for (const word of playableGroup.words) {
    await page
      .locator('.word-tile')
      .filter({ hasText: new RegExp(`^${escapeRegExp(word)}$`, 'i') })
      .click()
  }
  await page.evaluate(() => {
    const debugWindow = window as typeof window & { __solvingClasses?: string[] }
    debugWindow.__solvingClasses = []
    new MutationObserver(() => {
      const className = document.querySelector('.solving-stage')?.className
      if (typeof className === 'string') debugWindow.__solvingClasses?.push(className)
    }).observe(document.body, { attributes: true, childList: true, subtree: true })
  })
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.locator('.solving-stage').waitFor()
  await page.waitForTimeout(180)
  await page.screenshot({ path: movingShot, fullPage: false })
  await page.locator('.solved-group').waitFor()
  const solvingClassHistory = await page.evaluate(
    () => (window as typeof window & { __solvingClasses?: string[] }).__solvingClasses ?? [],
  )
  assert.ok(
    solvingClassHistory.some((className) => className.includes('illuminating')),
    'Correct row should illuminate after the cards finish moving',
  )
  assert.equal(await page.locator('.moving-card-clone').count(), 0)
  assert.equal(await page.locator('.word-tile').count(), 12)
  assert.match(await page.locator('.solved-group h2').innerText(), new RegExp(playableGroup.title, 'i'))
  await page.screenshot({ path: gameShot, fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  assert.equal(horizontalOverflow, false, 'Mobile game should not scroll horizontally')
  await page.screenshot({ path: mobileShot, fullPage: false })

  await page.setViewportSize({ width: 1200, height: 900 })
  const forcedEasyGroups = (await page.evaluate(() => {
    sessionStorage.clear()
    const raw = localStorage.getItem('classroom-connections:library:v1')
    const groups = raw ? JSON.parse(raw) : []
    let enabledEasyGroups = 0
    const nextGroups = groups.map((group: { difficulty: string; enabled: boolean }) => {
      const shouldEnable = group.difficulty === 'easy' && enabledEasyGroups < 8
      if (shouldEnable) enabledEasyGroups += 1
      return { ...group, enabled: shouldEnable }
    })
    localStorage.setItem('classroom-connections:library:v1', JSON.stringify(nextGroups))
    return nextGroups.filter((group: { enabled: boolean }) => group.enabled)
  })) as Array<{ title: string; words: string[] }>

  assert.equal(forcedEasyGroups.length, 8)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Play', exact: true }).click()

  const firstRoundWords = (await page.locator('.word-tile').allTextContents()).map((word) =>
    word.trim().toLocaleLowerCase(),
  )
  const firstRoundGroups = forcedEasyGroups.filter((group) =>
    group.words.every((word) => firstRoundWords.includes(word.toLocaleLowerCase())),
  )
  assert.equal(firstRoundGroups.length, 4)

  for (let groupIndex = 0; groupIndex < firstRoundGroups.length; groupIndex += 1) {
    for (const word of firstRoundGroups[groupIndex].words) {
      await page
        .locator('.word-tile')
        .filter({ hasText: new RegExp(`^${escapeRegExp(word)}$`, 'i') })
        .click()
    }
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForFunction(
      (expectedCount) => document.querySelectorAll('.solved-group').length === expectedCount,
      groupIndex + 1,
    )
  }

  const solvedColourClasses = await page.locator('.solved-group').evaluateAll((elements) =>
    elements.map((element) =>
      ['easy', 'medium', 'hard', 'tricky'].find((difficulty) => element.classList.contains(difficulty)),
    ),
  )
  assert.deepEqual(new Set(solvedColourClasses), new Set(['easy', 'medium', 'hard', 'tricky']))

  const solvedBackgroundColours = await page
    .locator('.solved-group')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))
  assert.deepEqual(
    new Set(solvedBackgroundColours),
    new Set(['rgb(249, 223, 109)', 'rgb(160, 195, 90)', 'rgb(176, 196, 239)', 'rgb(186, 129, 197)']),
  )

  const completionTime = page.locator('.completion-time')
  await completionTime.waitFor()
  assert.match(await completionTime.innerText(), /Time\s+\d+:\d{2}/i)
  await page.screenshot({ path: completionShot, fullPage: false })

  const playedBeforeNextRound = await page.evaluate(() => {
    const raw = sessionStorage.getItem('classroom-connections:played-groups:v1')
    return raw ? JSON.parse(raw) : []
  })
  assert.equal(playedBeforeNextRound.length, 4)

  await page.getByRole('button', { name: 'New Game' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.word-tile').length === 16)
  const secondRoundWords = (await page.locator('.word-tile').allTextContents()).map((word) =>
    word.trim().toLocaleLowerCase(),
  )
  const secondRoundGroups = forcedEasyGroups.filter((group) =>
    group.words.every((word) => secondRoundWords.includes(word.toLocaleLowerCase())),
  )
  assert.equal(secondRoundGroups.length, 4)
  assert.deepEqual(
    secondRoundGroups.filter((group) =>
      firstRoundGroups.some((firstRoundGroup) => firstRoundGroup.title === group.title),
    ),
    [],
  )

  const playedAfterCycle = await page.evaluate(() => {
    const raw = sessionStorage.getItem('classroom-connections:played-groups:v1')
    return raw ? JSON.parse(raw) : []
  })
  assert.equal(playedAfterCycle.length, 0)

  await page.getByRole('button', { name: 'Return to home' }).click()
  await page.getByRole('button', { name: 'Exit game' }).click()
  await page.getByRole('heading', { name: 'Classroom Connections' }).waitFor()

  console.log('Classroom Connections UI verification passed.')
  console.log(`Landing: ${landingShot}`)
  console.log(`Light landing: ${lightLandingShot}`)
  console.log(`Library: ${libraryShot}`)
  console.log(`Pending: ${pendingShot}`)
  console.log(`Wrong: ${wrongShot}`)
  console.log(`Moving: ${movingShot}`)
  console.log(`Game: ${gameShot}`)
  console.log(`Mobile: ${mobileShot}`)
  console.log(`Completion: ${completionShot}`)

  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
