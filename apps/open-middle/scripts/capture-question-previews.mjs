import {mkdir} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {preview} from 'vite'
import {questions} from '../src/questions/index.js'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(appDir, 'public', 'question-previews')
await mkdir(outputDir, {recursive: true})
const server = await preview({
  root: appDir,
  configFile: false,
  base: '/',
  preview: {host: '127.0.0.1', port: 5296, strictPort: true},
})
let browser
try {
  browser = await chromium.launch({headless: true})
  const context = await browser.newContext({viewport: {width: 1200, height: 900}, deviceScaleFactor: 1})
  await context.addInitScript(() => localStorage.clear())
  const page = await context.newPage()
  for (const question of questions) {
    await page.goto(`http://127.0.0.1:5296/#${question.id}`)
    await page.locator('.workspace').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({content: '#home,.corner-tools{visibility:hidden!important}.workspace{padding-top:24px!important}'})
    await page.screenshot({
      path: join(outputDir, `${question.id}.jpg`),
      type: 'jpeg', quality: 80,
      clip: {x: 0, y: 0, width: 1200, height: 840},
      animations: 'disabled', caret: 'hide',
    })
  }
  console.log(`Captured ${questions.length} question previews without navigation controls.`)
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
