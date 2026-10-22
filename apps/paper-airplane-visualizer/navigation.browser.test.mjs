import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { designs } from './src/designs.js'

const viewOnly = process.argv.includes('--view-only')
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, message)
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]))

async function checkViewTurn(page, reducedMotion) {
  const frames = await page.evaluate(() => {
    const probe = window.__navigation
    document.querySelector('#reset-view').click()
    const before = probe.view()
    document.querySelector('#flip-view').click()
    const afterClick = probe.view()
    const samples = []
    for (let i = 0; i < 20; i++) { probe.tick(50); samples.push(probe.view()) }
    return { before, afterClick, samples }
  })
  assert.deepEqual(frames.afterClick.position, frames.before.position, 'View other side must not jump on click')
  assert.equal(frames.afterClick.turning, true)
  assert.equal(frames.afterClick.disabled, true, 'avoid overlapping camera turns')
  const origin = frames.before.position.map((value, i) => value - frames.before.target[i])
  let previous = origin
  for (const sample of frames.samples) {
    const offset = sample.position.map((value, i) => value - sample.target[i])
    close(Math.hypot(...offset), Math.hypot(...origin), 'camera turn preserves zoom')
    close(offset[1], origin[1], 'camera turn preserves elevation')
    assert.deepEqual(sample.target, frames.before.target, 'camera turn preserves the orbit target')
    const dot = (previous[0] * offset[0] + previous[2] * offset[2]) / (Math.hypot(previous[0], previous[2]) * Math.hypot(offset[0], offset[2]))
    assert.ok(Math.acos(Math.max(-1, Math.min(1, dot))) < 0.27, 'each rendered frame advances smoothly')
    previous = offset
  }
  close(previous[0], -origin[0], 'turn reaches the opposite side')
  close(previous[2], -origin[2], 'turn completes a half orbit')
  assert.equal(frames.samples.at(-1).turning, false)
  assert.equal(frames.samples.at(-1).disabled, false, 'button is enabled after arrival')

  // A school policy or browser preference change must not finish the turn instantly.
  if (reducedMotion === 'no-preference') {
    const beforeChange = await page.evaluate(() => {
      document.querySelector('#flip-view').click()
      for (let i = 0; i < 4; i++) window.__navigation.tick(50)
      window.__motionChanged = false
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { window.__motionChanged = true }, { once: true })
      return window.__navigation.view()
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // The harness owns requestAnimationFrame; poll this browser event by timer.
    await page.waitForFunction(() => window.__motionChanged, undefined, { polling: 50 })
    const afterChange = await page.evaluate(() => window.__navigation.view())
    assert.deepEqual(afterChange.position, beforeChange.position, 'preference changes must not snap the camera')
    assert.equal(afterChange.turning, true, 'the explicit turn continues after the preference changes')
    await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__navigation.tick(50) })
    assert.equal(await page.evaluate(() => window.__navigation.view().turning), false)
  }

  const interrupted = await page.evaluate(() => {
    document.querySelector('#flip-view').click()
    window.__navigation.tick(50)
    document.querySelector('#zoom-in').click()
    const afterZoom = window.__navigation.view()
    for (let i = 0; i < 20; i++) window.__navigation.tick(50)
    return { afterZoom, settled: window.__navigation.view() }
  })
  assert.equal(interrupted.afterZoom.turning, false, 'manual zoom interrupts the turn')
  assert.equal(interrupted.afterZoom.disabled, false)
  close(distance(interrupted.afterZoom.position, interrupted.settled.position), 0, 'interrupted turns do not resume or jump later')
}

// Exercise real controls and rendered geometry with deterministic animation
// frames. The observation hook is injected by Playwright, never shipped.
const server = await createServer({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
  logLevel: 'error',
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  for (const reducedMotion of ['reduce', 'no-preference']) {
    for (const design of viewOnly ? designs.slice(0, 1) : designs) {
      const context = await browser.newContext({ reducedMotion })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(id => {
        localStorage.setItem('classroom-tools.airplane-design', id)
        window.requestAnimationFrame = callback => { window.__nextFrame = callback; return 1 }
      }, design.id)
      await page.route('**/src/main.js*', async route => {
        const response = await route.fetch()
        await route.fulfill({ response, body: `${await response.text()}
          window.__navigation = {
            state: () => ({ time, selected, selectedStep, poseStep, playing, traveling: Boolean(travel), range: selectionRange() }),
            tick: milliseconds => window.__nextFrame(last + milliseconds),
            geometry: () => meshRecords.flatMap(record => Array.from(record.geometry.attributes.position.array)),
            view: () => ({ position: camera.position.toArray(), target: controls.target.toArray(), turning: Boolean(viewTurn), disabled: $('flip-view').disabled }),
          };
        ` })
      })
      await page.goto(server.resolvedUrls.local[0])
      await page.waitForFunction(() => Boolean(window.__navigation))
      assert.equal(await page.locator('#viewport canvas').count(), 1, 'WebGL must initialize')
      assert.equal(await page.locator('#graphics-error').isVisible(), false)

      if (viewOnly) {
        await checkViewTurn(page, reducedMotion)
        assert.deepEqual(errors, [])
        console.log(`PASS camera: ${reducedMotion}; smooth half-turn, zoom/elevation, preference change, interruption`)
        await context.close()
        continue
      }

      const results = await page.evaluate(({ substeps }) => {
        const probe = window.__navigation
        const click = selector => document.querySelector(selector).click()
        const initialPlaying = probe.state().playing
        if (initialPlaying) click('#play')
        document.querySelector('#speed').value = '2'
        probe.tick(16)

        function journey(selector, frameDelay = 16) {
          const before = probe.state().time
          const geometryBefore = probe.geometry()
          click(selector)
          const afterClick = probe.state().time
          const unchangedGeometry = JSON.stringify(probe.geometry()) === JSON.stringify(geometryBefore)
          const samples = [before, afterClick]
          let geometryChanged = false
          for (let i = 0; i < 1000 && probe.state().traveling; i++) {
            probe.tick(frameDelay)
            samples.push(probe.state().time)
            if (!geometryChanged) geometryChanged = JSON.stringify(probe.geometry()) !== JSON.stringify(geometryBefore)
          }
          return { before, afterClick, unchangedGeometry, geometryChanged, samples, ...probe.state() }
        }

        const forward = journey('[data-step="4"]')
        const backward = journey('[data-step="0"]')
        const lastFold = substeps.length - 1
        const delayed = journey(`[data-fold="${lastFold}"]`, 5000)
        // Start again must unfold through the same sequence.
        const restart = journey('#next')

        // Retarget while still between folds; do not snap to either selection.
        click('[data-step="4"]')
        for (let i = 0; i < 10; i++) probe.tick(16)
        const retarget = journey('[data-step="0"]')

        // Pause during travel, then resume the actual fold under the paper.
        click('[data-step="4"]')
        for (let i = 0; i < 30; i++) probe.tick(16)
        const beforePause = probe.state().time
        click('#play')
        probe.tick(16)
        const paused = probe.state()
        click('#play')
        probe.tick(16)
        const resumed = probe.state()
        click('#play')

        // A numbered step selects the full range and loops across both folds.
        const paired = substeps.find(fold => substeps.filter(other => other.step === fold.step).length > 1)
        const combined = journey(`[data-step="${paired.step}"]`)
        const ui = {
          pressed: document.querySelector(`[data-step="${paired.step}"]`).getAttribute('aria-pressed'),
          activeFolds: document.querySelectorAll('[data-fold][aria-current="step"]').length,
          next: document.querySelector('#next').textContent,
        }
        click('#play')
        const loop = []
        for (let i = 0; i < 280; i++) { probe.tick(16); loop.push(probe.state().time) }
        click('#play')
        const input = document.querySelector('#progress')
        input.value = '750'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        probe.tick(16)
        const scrubbed = probe.state()
        const individual = journey(`[data-fold="${substeps.indexOf(paired)}"]`)
        const nextStep = journey(`[data-step="${paired.step}"]`)
        const advance = journey('#next')
        const previous = journey('#previous')
        document.querySelector('#viewport').focus()
        document.querySelector('#viewport').dispatchEvent(new KeyboardEvent('keydown', { key: String(paired.step + 2), bubbles: true }))
        for (let i = 0; i < 1000 && probe.state().traveling; i++) probe.tick(16)
        const keyboard = probe.state()
        return { initialPlaying, forward, backward, delayed, restart, retarget, beforePause, paused, resumed, combined, ui, loop, scrubbed, individual, nextStep, advance, previous, keyboard, pairedStep: paired.step }
      }, { substeps: design.substeps })

      assert.equal(results.initialPlaying, reducedMotion === 'no-preference', 'reduced motion pauses autoplay')
      const fifthStart = design.substeps.find(fold => fold.step === 4).start
      const lastStart = design.substeps.at(-1).start
      for (const [name, target] of [['forward', fifthStart], ['backward', 0], ['delayed', lastStart], ['restart', 0], ['retarget', 0]]) {
        const result = results[name]
        const label = `${design.name}, ${reducedMotion}, ${name}`
        assert.equal(result.afterClick, result.before, `${label}: selection must not jump the paper`)
        assert.equal(result.unchangedGeometry, true, `${label}: click must preserve the current geometry`)
        assert.equal(result.traveling, false, `${label}: must arrive`)
        assert.equal(result.time, target, `${label}: destination`)
        assert.equal(result.playing, false, `${label}: preserve paused playback`)
        assert.equal(result.geometryChanged, true, `${label}: intermediate paper geometry must render`)
        const direction = Math.sign(target - result.before)
        for (let i = 1; i < result.samples.length; i++) {
          const change = result.samples[i] - result.samples[i - 1]
          assert.ok(direction * change >= -1e-9, `${label}: must travel in order`)
          assert.ok(Math.abs(change) <= 0.150001, `${label}: delayed frame must not skip folds`)
        }
        for (const fold of design.substeps) {
          if (fold.start >= Math.min(result.before, target) && fold.end <= Math.max(result.before, target)) {
            assert.ok(result.samples.some(time => time > fold.start && time < fold.end), `${label}: must show fold ${fold.label}`)
          }
        }
      }
      assert.equal(results.paused.time, results.beforePause, 'pause must keep the current paper pose')
      assert.equal(results.paused.traveling, false)
      assert.equal(results.paused.playing, false)
      assert.equal(results.resumed.playing, true)
      assert.ok(Math.abs(results.resumed.time - results.paused.time) < 0.02, 'resume must not snap to a distant fold')
      assert.equal(results.combined.selectedStep, results.pairedStep)
      assert.equal(results.combined.poseStep, results.pairedStep)
      assert.equal(results.combined.range.start, results.pairedStep)
      assert.equal(results.combined.range.end, results.pairedStep + 1)
      assert.equal(results.ui.pressed, 'true')
      assert.equal(results.ui.activeFolds, 0, 'whole-step playback must not imply one individual fold is selected')
      assert.match(results.ui.next, /Next step/)
      assert.ok(results.loop.includes(results.pairedStep), 'whole-step loop returns to the beginning')
      assert.ok(results.loop.includes(results.pairedStep + 1), 'whole-step loop completes every fold')
      assert.equal(results.scrubbed.time, results.pairedStep + 0.75, 'scrubber spans the entire step')
      assert.equal(results.scrubbed.poseStep, results.pairedStep)
      assert.equal(results.individual.afterClick, results.individual.before, 'switching to an individual fold must not jump')
      assert.equal(results.individual.unchangedGeometry, true)
      assert.equal(results.individual.selectedStep, null)
      assert.equal(results.individual.poseStep, null)
      assert.equal(results.individual.time, results.pairedStep)
      assert.equal(results.advance.selectedStep, results.pairedStep + 1, 'Next advances one main step in combined mode')
      assert.equal(results.previous.selectedStep, results.pairedStep, 'Previous returns one main step in combined mode')
      assert.equal(results.keyboard.selectedStep, results.pairedStep + 1, 'number shortcuts select combined steps')
      await checkViewTurn(page, reducedMotion)
      assert.deepEqual(errors, [])
      console.log(`PASS ${design.name}: ${reducedMotion}; continuous navigation, combined loops, scrubber, individual folds, step controls, keyboard, camera turns`)
      await context.close()
    }
  }
} finally {
  await browser?.close()
  await server.close()
}
