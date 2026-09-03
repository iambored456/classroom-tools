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
  await useWordButton.click()
  await page.getByText('Type in a word before continuing.').waitFor()
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

  await page.keyboard.type('aaa')
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

  await page.keyboard.type('tzz')
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

  await page.keyboard.type('cat')
  await page.keyboard.press('Enter')
  const scoreboard = page.getByRole('dialog', { name: 'Scoreboard' })
  await scoreboard.waitFor()
  assert.equal(await scoreboard.locator('tbody tr').count(), 1)
  assert.match(await scoreboard.locator('tbody tr').first().innerText(), /3\s+3 \/ 6\s+Solved/)
  assert.equal(await scoreboard.getByRole('button', { name: 'Clear History' }).count(), 1)
  const completedGridBox = await page.locator('.word-grid').boundingBox()
  const newWordBox = await page.getByRole('button', { name: 'New word' }).boundingBox()
  const changeSetupBox = await page.getByRole('button', { name: 'Change setup' }).boundingBox()
  assert.ok(completedGridBox && newWordBox && changeSetupBox)
  assert.ok(newWordBox.x > completedGridBox.x + completedGridBox.width)
  assert.ok(newWordBox.y < changeSetupBox.y)
  await scoreboard.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'New word' }).click()
  await page.getByRole('dialog', { name: /Choose this round/ }).waitFor()
  await page.getByRole('button', { name: 'Close word chooser' }).click()
  await page.getByRole('button', { name: 'Change setup' }).click()
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
  for (let guess = 0; guess < 3; guess += 1) {
    await page.keyboard.type('qqqqq')
    await page.keyboard.press('Enter')
  }
  assert.equal(await page.locator('.letter-tile.evaluated').count(), 15)
  await page.getByRole('button', { name: 'New word' }).waitFor()
  await scoreboard.waitFor()
  assert.equal(await scoreboard.locator('tbody tr').count(), 2)
  assert.match(await scoreboard.locator('tbody tr').first().innerText(), /5\s+3 \/ 3\s+Not solved/)
  await scoreboard.getByRole('button', { name: 'Clear History' }).click()
  await scoreboard.getByText('No saved games yet.').waitFor()
  await scoreboard.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Change setup' }).click()
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

  console.log('Classroom Wordle UI verification passed.')
  console.log(`Setup: ${setupShot}`)
  console.log(`Word chooser: ${chooserShot}`)
  console.log(`Game: ${gameShot}`)
  console.log(`Mobile setup: ${mobileSetupShot}`)
  console.log(`Mobile library: ${mobileShot}`)

  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
