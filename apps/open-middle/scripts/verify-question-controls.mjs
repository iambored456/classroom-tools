import assert from 'node:assert/strict'
import {chromium} from 'playwright'

const base = process.env.OPEN_MIDDLE_URL ?? 'http://localhost:5194/open-middle/'
const published = 'https://iambored456.github.io/classroom-tools/open-middle/'
const browser = await chromium.launch({headless:true})
const context = await browser.newContext({viewport:{width:1440,height:1000}})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
 await page.goto(base)
 const ids = await page.locator('.problem-link').evaluateAll(links => links.map(link => link.hash.slice(1)))
 assert.ok(ids.includes('34') && ids.includes('109-comparing-fractions'))
 await page.locator('#qr-share').click()
 assert.equal(await page.locator('.qr-share-url').getAttribute('href'), published)
 await page.getByRole('button',{name:'Close QR code',exact:true}).click()
 for (const id of ids) {
  await page.goto(`${base}#${id}`)
  assert.deepEqual(await page.locator('.corner-tools > button').evaluateAll(buttons => buttons.map(button => button.id).slice(-3)), ['help','qr-share','fullscreen'], `#${id}: control order`)
  assert.equal(await page.locator('#settings, #settings-dialog').count(),0)
  await page.locator('#help').click()
  assert.equal(await page.locator('#help-dialog .help-settings #spacing').isVisible(),true)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#help').evaluate(el => el === document.activeElement),true)
  await page.locator('#qr-share').click()
  assert.equal(await page.locator('.qr-share-url').getAttribute('href'), `${published}#${id}`)
  assert.equal(await page.locator('.qr-code svg').count(),1)
  assert.equal(await page.locator('#qr-share-title').textContent(), await page.locator('#qr-share').getAttribute('aria-label').then(label => label.replace('Show QR code for ','')))
  await page.getByRole('button',{name:'Close QR code',exact:true}).click()
  assert.equal(await page.locator('#qr-share').evaluate(el => el === document.activeElement),true)
 }
 console.log(`All ${ids.length} questions: Help settings, no gear, QR order and direct URL, close and focus restoration passed`)

 await page.goto(`${base}#34`)
 await page.locator('#help').click()
 await page.locator('#spacing').check()
 await page.locator('#drag-assist').check()
 await page.keyboard.press('Escape')
 await page.reload()
 await page.locator('#help').click()
 assert.equal(await page.locator('#spacing').isChecked(),true)
 assert.equal(await page.locator('#drag-assist').isChecked(),true)
 await page.keyboard.press('Escape')
 await page.locator('#fullscreen').click()
 await page.waitForFunction(() => Boolean(document.fullscreenElement))
 await page.locator('#fullscreen').click()
 await page.waitForFunction(() => !document.fullscreenElement)
 assert.deepEqual(await page.locator('.corner-tools > button').evaluateAll(buttons => buttons.map(button => button.id)), ['refresh','help','qr-share','fullscreen'])
 await page.locator('#refresh').click()
 await page.locator('#qr-share').click()
 assert.equal(await page.locator('.qr-share-url').getAttribute('href'), `${published}#34`)
 await page.keyboard.press('Escape')

 await page.goto(`${base}#47`)
 await page.locator('[data-nslot="0"]').focus()
 await page.keyboard.type('123456')
 await page.locator('#help').click()
 await page.locator('[data-naction="save"]').click()
 assert.equal(await page.locator('#help-dialog[open]').count(),1, 'Saving must not submit the Help form')
 assert.equal(await page.locator('.nm-attempts li').count(),1)
 await page.reload()
 await page.locator('#help').click()
 assert.equal(await page.locator('.nm-attempts li').count(),1)
 assert.equal(await page.locator('#spacing').isChecked(),true)
 await page.locator('[data-naction="clear-history"]').click()
 assert.equal(await page.locator('.nm-attempts li').count(),0)
 await page.keyboard.press('Escape')
 console.log('Preferences survive reload/navigation; saved attempts work inside Help; fullscreen and reset retain QR control')

 for (const width of [320,390]) {
  await page.setViewportSize({width,height:844})
  for (const id of ['34','47','59','20']) {
   await page.goto(`${base}#${id}`)
   const home = await page.locator('.home-controls').boundingBox()
   const tools = await page.locator('.corner-tools').boundingBox()
   assert.ok(home.x + home.width <= tools.x, `#${id} at ${width}: header controls overlap`)
   assert.ok(tools.x >= 0 && tools.x + tools.width <= width)
   for (const control of ['#help','#qr-share']) {
    await page.locator(control).click()
    const dialog = page.locator('dialog[open]')
    const bounds = await dialog.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 845)
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true, `${control} horizontal overflow at ${width}`)
    await page.keyboard.press('Escape')
   }
  }
 }
 assert.deepEqual(errors,[])
 console.log('320px/390px layouts: header spacing and Help/QR dialogs fit; no browser errors')
} finally {
 await browser.close()
}
