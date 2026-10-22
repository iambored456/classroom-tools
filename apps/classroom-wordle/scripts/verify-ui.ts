import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from '../../../scripts/lib/static-server.ts'

const rootDir = resolve(import.meta.dirname, '..')
const ROOT_BASE = '/classroom-tools/classroom-wordle/'
const setupShot = join(tmpdir(), 'classroom-wordle-setup.png')
const chooserShot = join(tmpdir(), 'classroom-wordle-word-chooser.png')
const gameShot = join(tmpdir(), 'classroom-wordle-game.png')
const mobileSetupShot = join(tmpdir(), 'classroom-wordle-mobile-setup.png')
const mobileShot = join(tmpdir(), 'classroom-wordle-mobile.png')
const successShot = join(tmpdir(), 'classroom-wordle-success.png')

const server = await startStaticServer({
  rootDir: join(rootDir, 'dist'),
  basePath: ROOT_BASE,
  host: '127.0.0.1',
})
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  const url = `${server.url}${ROOT_BASE}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })

  await page.getByRole('heading', { name: 'Classroom Wordle' }).waitFor()
  assert.match(await page.getByRole('button', { name: /Play 5-letter Wordle/ }).innerText(), /Play/)
  await page.getByText('Number of Letters').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Fewer letters' }).isEnabled(), true)
  assert.equal(await page.getByRole('button', { name: 'More letters' }).isEnabled(), true)
  assert.match(await page.getByRole('button', { name: /Word Library/ }).innerText(), /Set A/)
  assert.equal(await page.getByRole('button', { name: /Word Library/ }).locator('svg').count(), 0)
  assert.equal(await page.getByText(/possible 5-letter answers/).count(), 0)
  assert.equal(await page.locator('.stepper').getByText(/letters|guesses|answers ready/i).count(), 0)
  const colorblindToggle = page.getByRole('checkbox', { name: 'Colorblind mode' })
  const playButton = page.getByRole('button', { name: /Play 5-letter Wordle/ })
  assert.equal(await colorblindToggle.isChecked(), true)
  assert.equal(await playButton.evaluate((button) => getComputedStyle(button).backgroundImage), 'none')
  await page.locator('.preference-toggle').click()
  assert.equal(await page.locator('.landing-screen.colorblind-mode').count(), 0)
  assert.notEqual(await playButton.evaluate((button) => getComputedStyle(button).backgroundImage), 'none')
  await playButton.click()
  await page.getByRole('dialog', { name: /Choose this round/ }).waitFor()
  assert.notEqual(
    await page.getByRole('button', { name: 'Choose Random' }).evaluate((button) =>
      getComputedStyle(button).backgroundImage,
    ),
    'none',
  )
  await page.getByRole('button', { name: 'Close word chooser' }).click()
  await page.locator('.preference-toggle').click()
  assert.equal(await page.locator('.landing-screen.colorblind-mode').count(), 1)
  assert.equal(await colorblindToggle.isChecked(), true)
  await page.waitForTimeout(160)
  await page.screenshot({ path: setupShot, fullPage: false })

  await page.getByRole('button', { name: 'Fewer letters' }).click()
  await page.getByRole('button', { name: 'Fewer letters' }).click()
  await page.getByRole('button', { name: /Play 3-letter Wordle/ }).click()
  await page.getByRole('dialog', { name: 'Word Library' }).waitFor()
  assert.equal(await page.locator('.word-set-card').count(), 2)
  await page.getByText('No set is on').waitFor()

  const setAToggle = page.getByRole('checkbox', { name: 'Use Set A' })
  const setBToggle = page.getByRole('checkbox', { name: 'Use Set B' })
  await setAToggle.locator('..').click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('dialog', { name: 'Word Library' }).waitFor()
  await page.getByText('Set A is on but has no valid 3-letter words.').waitFor()
  assert.equal(await page.locator('.word-set-card.error-state').count(), 1)

  await page.getByLabel('Set A word list').fill('A: cat, CAT\n• four \\ &#x20;')
  await page.getByText('1 valid word').first().waitFor()
  assert.equal(await page.locator('.library-footer-error').count(), 0)
  await page.getByLabel('Set B word list').fill('dog')
  await setBToggle.locator('..').click()
  assert.equal(await setAToggle.isChecked(), false)
  assert.equal(await setBToggle.isChecked(), true)
  await setBToggle.locator('..').click()
  assert.equal(await page.locator('.word-set-card input:checked').count(), 0)
  await setAToggle.locator('..').click()
  await page.getByRole('button', { name: 'Add set' }).click()
  assert.equal(await page.locator('.word-set-card').count(), 3)
  await page.getByLabel('Set C word list').waitFor()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: /Play 3-letter Wordle/ }).click()
  await page.getByRole('dialog', { name: /Choose this round/ }).waitFor()
  const roundSetupDialog = page.getByRole('dialog', { name: /Choose this round/ })
  const teacherWordInput = page.getByLabel('Type in a word')
  assert.equal(await teacherWordInput.evaluate((input) => document.activeElement === input), false)
  assert.equal(await roundSetupDialog.evaluate((dialog) => document.activeElement === dialog), true)
  assert.equal(await teacherWordInput.getAttribute('placeholder'), 'Type in a word')
  assert.equal(
    await roundSetupDialog.getByRole('heading').evaluate((heading) => getComputedStyle(heading).textAlign),
    'center',
  )
  assert.equal(await teacherWordInput.getAttribute('type'), 'text')
  assert.equal(await teacherWordInput.getAttribute('autocomplete'), 'off')
  assert.equal(
    await teacherWordInput.evaluate((input) =>
      getComputedStyle(input).getPropertyValue('-webkit-text-security'),
    ),
    'disc',
  )
  const randomButton = page.getByRole('button', { name: 'Choose Random' })
  const useWordButton = page.getByRole('button', { name: 'Use this word' })
  assert.equal(await randomButton.evaluate((button) => getComputedStyle(button).backgroundImage), 'none')
  const randomBox = await randomButton.boundingBox()
  const inputBox = await teacherWordInput.boundingBox()
  const useWordBox = await useWordButton.boundingBox()
  assert.ok(randomBox && inputBox && useWordBox)
  assert.ok(randomBox.y < inputBox.y && inputBox.y < useWordBox.y)
  assert.equal(await useWordButton.isEnabled(), false)
  await teacherWordInput.fill('   ')
  assert.equal(await useWordButton.isEnabled(), false)
  await teacherWordInput.fill('d')
  assert.equal(await useWordButton.isEnabled(), true)
  await teacherWordInput.fill('')
  assert.equal(await useWordButton.isEnabled(), false)
  await teacherWordInput.fill('dog')
  await useWordButton.click()
  await page.getByText('DOG is not in Set A.').waitFor()
  await teacherWordInput.fill('cat')
  await page.screenshot({ path: chooserShot, fullPage: false })
  await page.getByRole('button', { name: 'Use this word' }).click()
  await page.locator('.word-grid').waitFor()
  assert.equal(await page.locator('.guess-row').count(), 6)
  assert.equal(await page.locator('.guess-row').first().locator('.letter-tile').count(), 3)
  const boardAreaBox = await page.locator('.game-board-area').boundingBox()
  const activeGridBox = await page.locator('.word-grid').boundingBox()
  assert.ok(boardAreaBox && activeGridBox)
  assert.ok(activeGridBox.y - boardAreaBox.y <= 16)
  assert.ok(
    boardAreaBox.y + boardAreaBox.height - (activeGridBox.y + activeGridBox.height) <= 16,
  )
  assert.ok((await page.locator('.game-home-action svg').evaluate((icon) => icon.getBoundingClientRect().width)) >= 25)

  await page.getByRole('button', { name: 'Return to home' }).click()
  await page.getByRole('dialog', { name: 'Are you sure you want to exit the game?' }).waitFor()
  await page.getByRole('button', { name: 'Stay' }).click()
  await page.locator('.word-grid').waitFor()

  await page.keyboard.type('x')
  await page.keyboard.press('Backspace')
  assert.equal(await page.locator('.guess-row').first().innerText(), '')
  await page.keyboard.press('Backspace')
  await page.locator('.word-grid').waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Classroom Wordle' }).count(), 0)
  await page.getByRole('button', { name: 'Backspace' }).click()
  await page.locator('.word-grid').waitFor()

  await page.evaluate(() => {
    const state = history.state && typeof history.state === 'object' ? history.state : {}
    history.replaceState({ ...state, classroomWordleScreen: 'home' }, '', '/classroom-tools/classroom-wordle/')
    history.pushState({ ...state, classroomWordleScreen: 'game' }, '', '/classroom-tools/classroom-wordle/')
  })
  await page.goBack()
  await page.waitForURL((url) => url.pathname === '/classroom-tools/')
  assert.equal(new URL(page.url()).pathname, '/classroom-tools/')

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Classroom Wordle' }).waitFor()
  await page.getByRole('button', { name: /Play 3-letter Wordle/ }).click()
  await page.getByLabel('Type in a word').fill('cat')
  await page.getByRole('button', { name: 'Use this word' }).click()
  await page.locator('.word-grid').waitFor()

  await page.keyboard.type('zzq')
  await page.keyboard.press('Enter')
  await page.getByRole('status').getByText('Word not recognized.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('status').isVisible(), true)
  assert.equal(await page.locator('.letter-tile.evaluated').count(), 0)
  assert.equal((await page.locator('.guess-row').first().innerText()).replace(/\s/g, ''), 'ZZQ')
  assert.equal(await page.locator('.keyboard .correct, .keyboard .present, .keyboard .absent').count(), 0)
  for (let letter = 0; letter < 3; letter += 1) await page.keyboard.press('Backspace')
  await page.keyboard.type('dad')
  await page.keyboard.press('Enter')
  const firstGuess = page.locator('.guess-row').first()
  assert.equal(await firstGuess.locator('.present').count(), 0)
  assert.equal(await firstGuess.locator('.correct').count(), 1)
  assert.equal(await firstGuess.locator('.absent').count(), 2)
  assert.equal(
    await firstGuess.locator('.correct').evaluate((tile) => getComputedStyle(tile).backgroundImage),
    'none',
  )
  assert.ok(
    Number.parseFloat(await firstGuess.locator('.correct').evaluate((tile) => getComputedStyle(tile).fontSize)) >= 40,
  )
  assert.ok(
    Number.parseFloat(
      await firstGuess.locator('.correct .tile-marker').evaluate((marker) => getComputedStyle(marker).fontSize),
    ) >= 18,
  )
  assert.equal(await firstGuess.locator('.correct .tile-marker').innerText(), '✓')
  assert.ok(
    await page
      .getByRole('button', { name: 'A', exact: true })
      .evaluate((key) => key.classList.contains('correct')),
  )
  assert.ok(
    Number.parseFloat(
      await page.getByRole('button', { name: 'A', exact: true }).evaluate((key) => getComputedStyle(key).fontSize),
    ) >= 24,
  )

  await page.keyboard.type('try')
  await page.keyboard.press('Enter')
  const secondGuess = page.locator('.guess-row').nth(1)
  assert.equal(await secondGuess.locator('.present').count(), 1)
  assert.equal(
    await secondGuess.locator('.present').evaluate((tile) => getComputedStyle(tile).backgroundImage),
    'none',
  )
  assert.equal(await secondGuess.locator('.present .tile-marker').innerText(), '?')
  assert.equal(await secondGuess.locator('.absent .tile-marker').count(), 0)
  await page.screenshot({ path: gameShot, fullPage: false })

  const gridBeforeWin = await page.locator('.word-grid').boundingBox()
  await page.keyboard.type('cat')
  await page.keyboard.press('Enter')
  const successPanel = page.getByRole('region', { name: 'success!', exact: true })
  const scoreboard = page.getByRole('dialog', { name: 'Scoreboard' })
  await successPanel.waitFor()
  assert.equal(await page.locator('dialog:modal').count(), 0)
  assert.equal(await scoreboard.count(), 0)
  assert.equal(await page.locator('.keyboard').count(), 0)
  assert.equal(await page.locator('.letter-tile.evaluated').count(), 9)
  await successPanel.getByText('You found the word in 3 guesses!').waitFor()
  const fireworksStyle = await page.locator('.success-fireworks').evaluate((overlay) => ({
    background: getComputedStyle(overlay).backgroundColor,
    filter: getComputedStyle(overlay).backdropFilter,
    pointerEvents: getComputedStyle(overlay).pointerEvents,
  }))
  assert.deepEqual(fireworksStyle, { background: 'rgba(0, 0, 0, 0)', filter: 'none', pointerEvents: 'none' })
  await page.waitForTimeout(1100)
  const gridAfterWin = await page.locator('.word-grid').boundingBox()
  assert.ok(gridBeforeWin && gridAfterWin)
  assert.ok(Math.abs(gridAfterWin.x - gridBeforeWin.x) < 1, 'Grid should stay centered when the buttons fit.')
  assert.ok(Math.abs(gridAfterWin.width - gridBeforeWin.width) < 1)
  const gridFireworks = page.locator('.word-grid .board-fireworks')
  const gridEffectsBox = await gridFireworks.boundingBox()
  assert.ok(gridEffectsBox)
  assert.ok(gridEffectsBox.x <= gridAfterWin.x && gridEffectsBox.y <= gridAfterWin.y)
  assert.ok(gridEffectsBox.x + gridEffectsBox.width >= gridAfterWin.x + gridAfterWin.width)
  assert.ok(gridEffectsBox.y + gridEffectsBox.height >= gridAfterWin.y + gridAfterWin.height)
  assert.equal(await gridFireworks.evaluate((overlay) => getComputedStyle(overlay).pointerEvents), 'none')
  await page.screenshot({ path: successShot, fullPage: false })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('.firework-spark').first().evaluate((spark) => getComputedStyle(spark).animationName), 'none')
  assert.ok(Number(await page.locator('.firework-spark').first().evaluate((spark) => getComputedStyle(spark).opacity)) > 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 320, height: 844 })
  await page.waitForTimeout(550)
  const mobileSuccess = await successPanel.boundingBox()
  const mobileGrid = await page.locator('.word-grid').boundingBox()
  const mobileActions = await page.locator('.completion-actions').boundingBox()
  assert.ok(mobileSuccess && mobileSuccess.x >= 0 && mobileSuccess.x + mobileSuccess.width <= 320)
  assert.ok(mobileGrid && mobileActions)
  assert.ok(mobileGrid.x >= mobileActions.x + mobileActions.width)
  assert.ok(mobileGrid.x + mobileGrid.width <= 320)
  assert.ok(mobileGrid.y + mobileGrid.height <= mobileSuccess.y)
  assert.ok(mobileSuccess.y + mobileSuccess.height <= 845)
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.waitForTimeout(550)
  assert.equal(await page.getByRole('button', { name: 'New Game', exact: true }).evaluate((button) => document.activeElement === button), true)
  assert.equal(await page.getByRole('button', { name: 'Change setup', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'View Scoreboard', exact: true }).click()
  await scoreboard.waitFor()
  assert.equal(await scoreboard.locator('tbody tr').count(), 1)
  assert.match(await scoreboard.locator('tbody tr').first().innerText(), /3\s+3 \/ 6\s+Solved/)
  assert.equal(await scoreboard.getByRole('button', { name: 'Clear History' }).count(), 1)
  const completedGridBox = await page.locator('.word-grid').boundingBox()
  const newGameBox = await page.getByRole('button', { name: 'New Game', exact: true }).boundingBox()
  const scoreboardBox = await page.getByRole('button', { name: 'View Scoreboard', exact: true }).boundingBox()
  assert.ok(completedGridBox && newGameBox && scoreboardBox)
  const homeBox = await page.getByRole('button', { name: 'Return to home' }).boundingBox()
  assert.ok(homeBox)
  assert.ok(newGameBox.x + newGameBox.width < completedGridBox.x)
  assert.ok(newGameBox.y >= homeBox.y + homeBox.height)
  assert.ok(newGameBox.y + newGameBox.height < scoreboardBox.y)
  await scoreboard.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'New Game', exact: true }).press('Enter')
  await page.getByRole('dialog', { name: /Choose this round/ }).waitFor()
  await page.getByRole('button', { name: 'Close word chooser' }).click()
  await page.getByRole('button', { name: 'Return to home' }).click()
  await page.getByRole('dialog', { name: 'Are you sure you want to exit the game?' }).waitFor()
  await page.getByRole('button', { name: 'Exit game' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  assert.match(await page.getByRole('button', { name: /Word Library/ }).innerText(), /Set A/)

  await page.getByRole('button', { name: 'More letters' }).click()
  await page.getByRole('button', { name: 'More letters' }).click()
  await page.getByRole('button', { name: 'Fewer guesses' }).click()
  await page.getByRole('button', { name: 'Fewer guesses' }).click()
  await page.getByRole('button', { name: 'Fewer guesses' }).click()
  await page.getByRole('button', { name: /Play 5-letter Wordle/ }).click()
  await page.getByRole('button', { name: 'Choose Random' }).click()
  assert.equal(await page.locator('.guess-row').count(), 3)
  await context.setOffline(true)
  await page.keyboard.type('qzxqz')
  await page.getByRole('button', { name: 'ENTER', exact: true }).click()
  await page.getByRole('status').getByText('Word not recognized.', { exact: true }).waitFor()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('.letter-tile.evaluated').count(), 0)
  assert.equal((await page.locator('.guess-row').first().innerText()).replace(/\s/g, ''), 'QZXQZ')
  assert.equal(await page.locator('.keyboard .correct, .keyboard .present, .keyboard .absent').count(), 0)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('classroom-wordle:score-history:v1') ?? '[]').length), 1)
  await page.screenshot({ path: join(tmpdir(), 'classroom-wordle-unrecognized.png') })
  for (let letter = 0; letter < 5; letter += 1) await page.getByRole('button', { name: 'Backspace', exact: true }).click()
  for (let guess = 0; guess < 3; guess += 1) {
    // A real word outside the starter answer set must still be accepted, offline.
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
  }
  await context.setOffline(false)
  assert.equal(await page.locator('.letter-tile.evaluated').count(), 15)
  await page.getByRole('button', { name: 'New Game', exact: true }).waitFor()
  assert.equal(await successPanel.count(), 0)
  assert.equal(await scoreboard.count(), 0)
  const keyStyles = await page.locator('.keyboard .key').evaluateAll((keys) => keys.map((key) => ({
    disabled: (key as HTMLButtonElement).disabled,
    color: getComputedStyle(key).backgroundColor,
    image: getComputedStyle(key).backgroundImage,
  })))
  assert.ok(keyStyles.length > 0 && keyStyles.every((style) => style.disabled && style.image === 'none'))
  assert.equal(new Set(keyStyles.map((style) => style.color)).size, 1)
  await page.getByRole('button', { name: 'View Scoreboard', exact: true }).click()
  await scoreboard.waitFor()
  assert.equal(await scoreboard.locator('tbody tr').count(), 2)
  assert.match(await scoreboard.locator('tbody tr').first().innerText(), /5\s+3 \/ 3\s+Not solved/)
  await scoreboard.getByRole('button', { name: 'Clear History' }).click()
  await scoreboard.getByText('No saved games yet.').waitFor()
  await scoreboard.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Return to home' }).click()
  await page.getByRole('button', { name: 'Exit game' }).click()
  for (let increase = 0; increase < 7; increase += 1) {
    await page.getByRole('button', { name: 'More guesses' }).click()
  }
  await page.getByRole('button', { name: /Play 5-letter Wordle/ }).click()
  await page.getByRole('button', { name: 'Choose Random' }).click()
  assert.equal(await page.locator('.guess-row').count(), 10)
  const keyboardBox = await page.locator('.keyboard').boundingBox()
  assert.ok(keyboardBox)
  assert.ok(keyboardBox.y + keyboardBox.height <= 901, JSON.stringify(keyboardBox))

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.waitForTimeout(100)
  const fullscreenLayout = await page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('.game-board-area')?.getBoundingClientRect()
    const grid = document.querySelector<HTMLElement>('.word-grid')?.getBoundingClientRect()
    const keyboard = document.querySelector<HTMLElement>('.keyboard')?.getBoundingClientRect()
    return {
      boardBottom: board ? board.bottom : 0,
      gridBottom: grid ? grid.bottom : 0,
      keyboardTop: keyboard ? keyboard.top : 0,
      keyboardBottom: keyboard ? keyboard.bottom : 0,
    }
  })
  assert.ok(fullscreenLayout.gridBottom <= fullscreenLayout.boardBottom + 1, JSON.stringify(fullscreenLayout))
  assert.ok(fullscreenLayout.gridBottom <= fullscreenLayout.keyboardTop + 1, JSON.stringify(fullscreenLayout))
  assert.ok(fullscreenLayout.keyboardBottom <= 1081, JSON.stringify(fullscreenLayout))

  await page.setViewportSize({ width: 320, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  const mobileSettingBoxes = await page.locator('.game-settings fieldset').evaluateAll((fieldsets) =>
    fieldsets.map((fieldset) => {
      const rect = fieldset.getBoundingClientRect()
      const stepper = fieldset.querySelector<HTMLElement>('.stepper')?.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        fieldsetCenter: rect.left + rect.width / 2,
        stepperCenter: stepper ? stepper.left + stepper.width / 2 : 0,
      }
    }),
  )
  assert.equal(mobileSettingBoxes.length, 2)
  assert.ok(Math.abs(mobileSettingBoxes[0].top - mobileSettingBoxes[1].top) <= 1)
  assert.ok(mobileSettingBoxes[0].right < mobileSettingBoxes[1].left)
  assert.ok(mobileSettingBoxes.every((box) => box.left >= 0 && box.right <= 320))
  assert.ok(mobileSettingBoxes.every((box) => Math.abs(box.fieldsetCenter - box.stepperCenter) <= 1))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  await page.screenshot({ path: mobileSetupShot, fullPage: false })
  await page.getByRole('button', { name: 'More letters' }).click()
  await page.getByRole('button', { name: /Word Library/ }).click()
  await page.getByText('No set is on').waitFor()
  assert.equal(await page.locator('.word-set-card').count(), 2)
  assert.equal(await page.locator('.length-tabs button').count(), 4)
  await page.screenshot({ path: mobileShot, fullPage: false })

  // Exercise all lengths and prove custom classroom vocabulary remains usable.
  const validationPage = await context.newPage()
  await validationPage.goto(url, { waitUntil: 'networkidle' })
  for (const [length, answer, guesses] of [
    [3, 'qzx', ['cat']],
    [4, 'qzxq', ['cats']],
    [5, 'qzxqz', ['color', 'crane']],
    [6, 'qzxqzx', ['colour', 'center', 'centre']],
  ] as const) {
    await validationPage.evaluate(({ length, answer }) => {
      localStorage.setItem('classroom-wordle-library-v2', JSON.stringify({
        [length]: [{ id: 'custom', label: 'Custom', text: answer, enabled: true }],
      }))
      localStorage.setItem('classroom-wordle-settings-v1', JSON.stringify({ wordLength: length, guessLimit: 6, colorblindMode: true }))
    }, { length, answer })
    await validationPage.reload({ waitUntil: 'networkidle' })
    await validationPage.getByRole('button', { name: new RegExp(`Play ${length}-letter Wordle`) }).click()
    await validationPage.getByLabel('Type in a word').fill(answer)
    await validationPage.getByRole('button', { name: 'Use this word' }).click()
    for (const [index, guess] of guesses.entries()) {
      await validationPage.keyboard.type(guess.toUpperCase())
      await validationPage.keyboard.press('Enter')
      assert.equal(await validationPage.locator('.letter-tile.evaluated').count(), (index + 1) * length)
    }
    await validationPage.keyboard.type(answer)
    await validationPage.keyboard.press('Enter')
    await validationPage.getByRole('region', { name: 'success!', exact: true }).waitFor()
    assert.equal(await validationPage.locator('.letter-tile.evaluated').count(), (guesses.length + 1) * length)
  }
  await validationPage.close()

  console.log('Classroom Wordle UI verification passed, including dictionary rejection, offline guesses, spelling variants, and custom answers at all lengths.')
  console.log(`Setup: ${setupShot}`)
  console.log(`Word chooser: ${chooserShot}`)
  console.log(`Game: ${gameShot}`)
  console.log(`Win celebration: ${successShot}`)
  console.log(`Mobile setup: ${mobileSetupShot}`)
  console.log(`Mobile library: ${mobileShot}`)

  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
