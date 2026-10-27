import assert from 'node:assert/strict'
import {chromium} from 'playwright'

const base = process.env.OPEN_MIDDLE_URL || 'http://localhost:5194/open-middle/'
const browser = await chromium.launch({headless: true})
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, hasTouch: true})
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
const config = id => id === 495
  ? {bank: '.mp-digit[data-digit="7"]', slot: i => `[data-slot="${i}"]`}
  : [34, 38, 40].includes(id)
    ? {bank: '.bank [data-digit="7"]', slot: i => `[data-slot="${i}"]`}
    : {bank: '[data-nbank="7"]', slot: i => `[data-nslot="${i}"]`}
async function open(id, enabled = true) {
  await page.goto(`${base}#${id}`)
  await page.evaluate(enabled => { localStorage.clear(); localStorage.setItem('open-middle-drag-assist', String(enabled)) }, enabled)
  await page.reload()
  await page.locator(config(id).bank).waitFor()
  // Allow the app's measured layout to settle before collecting coordinates.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function point(selector) {
  const b = await page.locator(selector).boundingBox()
  assert.ok(b, `Missing element: ${selector}`)
  return {x: b.x + b.width / 2, y: b.y + b.height / 2}
}
async function value(selector) {
  return page.locator(selector).evaluate(element => 'value' in element && element.tagName === 'INPUT' ? element.value : element.textContent.trim())
}
async function waitValue(selector, expected) {
  await page.waitForFunction(({selector, expected}) => {
    const element = document.querySelector(selector)
    return element && (element.tagName === 'INPUT' ? element.value : element.textContent.trim()) === expected
  }, {selector, expected}, {timeout: 2000})
}
async function pointer(type, at, id, extra = {}) {
  await page.evaluate(({type, at, id, extra}) => {
    const element = document.elementFromPoint(at.x, at.y) || document
    element.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true,
      pointerId: id, pointerType: 'touch', isPrimary: true, button: 0,
      buttons: type === 'pointerup' || type === 'pointercancel' || type === 'click' ? 0 : 1,
      clientX: at.x, clientY: at.y, ...extra}))
  }, {type, at, id, extra})
}
async function mouseDrag(from, to) {
  const start = typeof from === 'string' ? await point(from) : from
  const end = typeof to === 'string' ? await point(to) : to
  await page.mouse.move(start.x, start.y); await page.mouse.down()
  await page.mouse.move(end.x, end.y, {steps: 6}); await page.mouse.up()
}

try {
  if (!process.env.DRAG_ASSIST_EXTRA_ONLY) {
  for (const id of [34, 38, 40, 47, 279, 495]) {
    await open(id)
    const c = config(id), start = await point(c.bank), first = await point(c.slot(0)), final = await point(c.slot(1))
    await pointer('pointerdown', start, 101); await pointer('pointermove', first, 101)
    await pointer('pointerup', first, 101)
    assert.equal(await value(c.slot(0)), '', `#${id}: interruption must not place early`)
    assert.equal(await page.locator('.om-drag-ghost.drag-paused').count(), 1)
    await pointer('click', first, 101, {detail: 1})
    await pointer('pointerdown', {x: first.x + 1, y: first.y}, 102)
    await pointer('pointermove', final, 102); await pointer('pointerup', final, 102)
    await pointer('click', final, 102, {detail: 1})
    await waitValue(c.slot(1), '7')
    assert.equal(await value(c.slot(0)), '')
    assert.equal(await page.locator('.om-drag-ghost').count(), 0)
    console.log(`#${id}: interruption, new contact, one final placement, click suppression passed`)
  }

  // Real browser input verifies native capture and the browser-generated click.
  for (const id of [38, 47, 495]) {
    await open(id, false)
    const c = config(id)
    await mouseDrag(c.bank, c.slot(0)); await waitValue(c.slot(0), '7')
    assert.equal(await page.locator('.om-drag-ghost').count(), 0)
    console.log(`#${id}: real mouse drag with immediate release passed`)
  }

  await open(38)
  let c = config(38), first = await point(c.slot(0))
  await mouseDrag(c.bank, c.slot(0))
  assert.equal(await value(c.slot(0)), '')
  await waitValue(c.slot(0), '7')
  await mouseDrag(c.slot(0), c.slot(1)); await waitValue(c.slot(1), '7')
  await page.locator(c.slot(0)).focus(); await page.keyboard.press('8')
  await mouseDrag(c.slot(1), c.slot(0)); await waitValue(c.slot(0), '7')
  assert.equal(await value(c.slot(1)), '8', 'unique digits still swap')
  await mouseDrag(c.slot(0), '.bank'); await waitValue(c.slot(0), '')
  await page.touchscreen.tap(...Object.values(await point(c.bank)))
  await page.touchscreen.tap(...Object.values(await point(c.slot(2))))
  await waitValue(c.slot(2), '7')
  await page.locator(c.slot(2)).focus(); await page.keyboard.press('Delete')
  assert.equal(await value(c.slot(2)), '')
  console.log('Enabled real mouse drag, swapping, return to bank, real touch taps, and keyboard passed')

  await open(279)
  c = config(279)
  await mouseDrag(c.bank, c.slot(0)); await waitValue(c.slot(0), '7')
  await mouseDrag(c.bank, c.slot(1)); await waitValue(c.slot(1), '7')
  await mouseDrag(c.slot(1), c.slot(2)); await waitValue(c.slot(2), '7')
  assert.equal(await value(c.slot(0)), '7'); assert.equal(await value(c.slot(1)), '')
  console.log('Repeatable digits retain the bank and move the correct instance')

  for (const action of ['reset', 'navigate', 'modal', 'escape', 'cancel', 'outside', 'blur', 'hidden', 'disable']) {
    await open(38)
    c = config(38)
    const start = await point(c.bank), end = await point(c.slot(0))
    await pointer('pointerdown', start, 201); await pointer('pointermove', end, 201)
    await pointer(action === 'cancel' ? 'pointercancel' : 'pointerup', end, 201)
    if (action === 'reset') await page.locator('#refresh').click()
    if (action === 'navigate') await page.evaluate(() => { location.hash = '47' })
    if (action === 'modal') await page.evaluate(() => document.querySelector('#help-dialog').showModal())
    if (action === 'escape') await page.keyboard.press('Escape')
    if (action === 'outside') {
      await open(38)
      await mouseDrag(c.bank, {x: 2, y: 500})
    }
    if (action === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    if (action === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true})
      document.dispatchEvent(new Event('visibilitychange'))
    })
    if (action === 'disable') await page.evaluate(() => {
      const input = document.querySelector('#drag-assist'); input.checked = false
      input.dispatchEvent(new Event('change', {bubbles: true}))
    })
    await page.waitForTimeout(350)
    const selector = config(action === 'navigate' ? 47 : 38).slot(0)
    assert.equal(await value(selector), '', `${action}: no pending placement`)
    assert.equal(await page.locator('.om-drag-ghost').count(), 0)
    console.log(`${action}: pending gesture cleanup passed`)
  }

  await open(38)
  c = config(38)
  const start = await point(c.bank), end = await point(c.slot(0))
  await pointer('pointerdown', start, 301); await pointer('pointermove', end, 301)
  await pointer('pointerdown', await point(c.slot(1)), 302, {isPrimary: false})
  await pointer('pointerup', await point(c.slot(1)), 302, {isPrimary: false})
  await pointer('click', await point(c.slot(1)), 302, {detail: 1})
  assert.equal(await page.locator('.om-drag-ghost').count(), 1)
  await pointer('pointerup', end, 301); await waitValue(c.slot(0), '7')
  assert.equal(await value(c.slot(1)), '')
  console.log('Second contact cannot hijack or clear the active digit')

  await open(38, false)
  await page.locator('#settings').click(); await page.locator('#drag-assist').check()
  await page.locator('#settings-dialog .close').click(); await page.reload()
  await page.locator('#settings').click(); assert.equal(await page.locator('#drag-assist').isChecked(), true)
  await page.goto(`${base}#20`); assert.equal(await page.locator('#drag-assist').count(), 0)
  console.log('Saved setting survives reload and is hidden for domino activities')

  await page.setViewportSize({width: 390, height: 844})
  await open(47)
  c = config(47)
  await mouseDrag(c.bank, c.slot(0)); await waitValue(c.slot(0), '7')
  console.log('Fitted small viewport placement passed')
  }

  await page.setViewportSize({width: 1440, height: 1000})
  const cdp = await context.newCDPSession(page)
  for (const id of [38, 47, 495]) {
    await open(id)
    const c = config(id), start = await point(c.bank), first = await point(c.slot(0)), end = await point(c.slot(1))
    const touch = (type, at) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: at ? [{x: at.x, y: at.y, id: 1}] : [],
    })
    await touch('touchStart', start); await touch('touchMove', first); await touch('touchEnd')
    assert.equal(await page.locator('.om-drag-ghost.drag-paused').count(), 1)
    await touch('touchStart', {x: first.x + 1, y: first.y})
    await touch('touchMove', end); await touch('touchEnd')
    await waitValue(c.slot(1), '7')
    assert.equal(await value(c.slot(0)), '')
    console.log(`#${id}: native browser touch stream reconnects without scrolling or duplicate clicks`)
  }

  // A far fresh action can render a new legacy controller during pointerdown.
  for (const id of [38, 47]) {
    await open(id)
    const c = config(id), start = await point(c.bank), first = await point(c.slot(0)), end = await point(c.slot(1))
    const bank8 = await point(id === 38 ? '.bank [data-digit="8"]' : '[data-nbank="8"]')
    await pointer('pointerdown', start, 401); await pointer('pointermove', first, 401); await pointer('pointerup', first, 401)
    await pointer('pointerdown', bank8, 402)
    assert.equal(await value(c.slot(0)), '7', 'far contact settles prior release')
    await pointer('pointermove', end, 402); await pointer('pointerup', end, 402)
    await waitValue(c.slot(1), '8')
    console.log(`#${id}: far fresh contact settles the old move and starts the next one`)
  }

  const restricted = await context.newPage()
  restricted.on('pageerror', error => errors.push(error.message))
  await restricted.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked') }
    Storage.prototype.setItem = () => { throw new Error('Storage blocked') }
  })
  await restricted.goto(`${base}#38`)
  await restricted.locator('#settings').click(); await restricted.locator('#drag-assist').check()
  assert.equal(await restricted.locator('#drag-assist').isChecked(), true)
  await restricted.locator('#settings-dialog .close').click()
  const a = await restricted.locator('.bank [data-digit="7"]').boundingBox(), b = await restricted.locator('[data-slot="0"]').boundingBox()
  await restricted.mouse.move(a.x+a.width/2,a.y+a.height/2); await restricted.mouse.down()
  await restricted.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:5}); await restricted.mouse.up()
  await restricted.waitForFunction(() => document.querySelector('[data-slot="0"]').textContent.trim() === '7')
  await restricted.close()
  console.log('Storage-blocked browser can enable and use assistance for the session')

  await open(38)
  {
    const c = config(38), a = await point(c.bank), b = await point(c.slot(0)), outside = {x: 2, y: 500}
    await pointer('pointerdown', a, 501); await pointer('pointermove', b, 501)
    await pointer('pointerdown', outside, 502, {isPrimary: false})
    await pointer('pointerup', outside, 502, {isPrimary: false})
    await pointer('click', outside, 502, {detail: 0})
    assert.equal(await page.locator('.om-drag-ghost').count(), 1)
    await pointer('pointerup', b, 501)
    await pointer('click', b, 501, {detail: 0})
    await waitValue(c.slot(0), '7')
    console.log('Secondary contact outside the board and zero-detail pointer clicks cannot interfere')
  }
  assert.deepEqual(errors, [], 'No uncaught browser exceptions')
  console.log('Drag Assist browser verification passed')
} finally { await browser.close() }
