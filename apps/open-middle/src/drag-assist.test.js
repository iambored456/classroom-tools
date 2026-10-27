import test from 'node:test'
import assert from 'node:assert/strict'
import {createDragSession, RECONNECT_MS, RECONNECT_RADIUS} from './drag-assist.js'

const event = (pointerId = 1, clientX = 100, clientY = 100, extra = {}) =>
  ({pointerId, clientX, clientY, pointerType: 'touch', isPrimary: true, buttons: 1, ...extra})
function setup(enabled = true) {
  let time = 0, next = 0, target = {index: 0}, started = 0, cleared = 0
  const timers = new Map(), commits = [], callbacks = []
  const session = createDragSession({enabled: () => enabled, now: () => time,
    schedule(fn, ms) { callbacks.push(fn); timers.set(++next, {fn, at: time + ms}); return next },
    unschedule(id) { timers.delete(id) }, resolveTarget: () => target,
    commit: (source, destination) => commits.push({source, destination}),
    started: () => started++, cleared: () => cleared++,
  })
  return {session, commits, callbacks, timers,
    get started() { return started }, get cleared() { return cleared },
    set target(value) { target = value },
    advance(ms) {
      time += ms
      for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn() }
    },
    drag() { session.begin({digit: 7, source: 2}, event()); session.move(event(1, 120)) },
  }
}

test('a tap and movement at the activation threshold never commit a drag', () => {
  const t = setup(); t.session.begin({digit: 7}, event())
  assert.equal(t.session.move(event(1, 106)), false)
  t.session.end(event(1, 106)); t.advance(1000)
  assert.equal(t.started, 0); assert.equal(t.commits.length, 0); assert.equal(t.session.gesture, null)
})

test('release is delayed, then commits the recorded destination exactly once', () => {
  const t = setup(); t.drag(); t.session.end(event(1, 130))
  t.advance(RECONNECT_MS - 1); assert.equal(t.commits.length, 0)
  t.session.end(event(1, 130), 'lost')
  t.advance(1)
  assert.deepEqual(t.commits, [{source: {digit: 7, source: 2}, destination: {index: 0}}])
  t.callbacks[0](); assert.equal(t.commits.length, 1); assert.equal(t.cleared, 1)
})

test('nearby contact with a new pointer ID resumes across repeated gaps', () => {
  const t = setup(); t.drag(); t.session.end(event(1, 130))
  t.advance(200); assert.equal(t.session.resume(event(8, 130 + RECONNECT_RADIUS)), true)
  t.session.move(event(8, 200)); t.session.end(event(8, 210))
  t.advance(200); assert.equal(t.session.resume(event(9, 211)), true)
  t.session.end(event(9, 230)); t.advance(RECONNECT_MS)
  assert.equal(t.started, 1); assert.equal(t.commits.length, 1)
})

test('a cancelled timer cannot settle a later pause in the same gesture', () => {
  const t = setup(); t.drag(); t.session.end(event(1, 130))
  t.advance(100); t.session.resume(event(2, 130)); t.session.end(event(2, 140))
  t.callbacks[0](); assert.equal(t.commits.length, 0)
  t.advance(RECONNECT_MS); assert.equal(t.commits.length, 1)
})

test('far, late, secondary, and different-device contacts cannot resume', () => {
  for (const candidate of [event(2, 130 + RECONNECT_RADIUS + .1), event(2, 130, 100, {isPrimary: false}), event(2, 130, 100, {pointerType: 'mouse'})]) {
    const t = setup(); t.drag(); t.session.end(event(1, 130))
    assert.equal(t.session.resume(candidate), false)
  }
  const t = setup(); t.drag(); t.session.end(event(1, 130)); t.advance(RECONNECT_MS)
  assert.equal(t.session.resume(event(2, 130)), false)
})

test('unrelated pointer moves and releases cannot change the drag', () => {
  const t = setup(); t.drag()
  assert.equal(t.session.move(event(99, 300)), false)
  assert.equal(t.session.end(event(99, 300)), false)
  assert.equal(t.session.gesture.x, 120)
  t.session.end(event(1, 130)); t.advance(RECONNECT_MS)
  assert.equal(t.commits.length, 1)
})

test('cancellation and unexpected capture loss never commit without recovery', () => {
  for (const reason of ['cancel', 'lost']) {
    const t = setup(); t.drag(); t.session.end(event(1, 0, 0), reason); t.advance(RECONNECT_MS)
    assert.equal(t.commits.length, 0); assert.equal(t.session.gesture, null)
  }
})

test('a cancelled stream can resume, then commit an explicit release', () => {
  const t = setup(); t.drag(); t.session.end(event(1, 0, 0), 'cancel')
  assert.equal(t.session.resume(event(2, 121)), true)
  t.session.end(event(2, 180)); t.advance(RECONNECT_MS)
  assert.equal(t.commits.length, 1)
})

test('the original held pointer may continue after unexpected capture loss', () => {
  const t = setup(); t.drag(); t.session.end(event(), 'lost')
  assert.equal(t.session.move(event(1, 150, 100, {buttons: 0})), false)
  assert.equal(t.session.move(event(1, 150)), true)
  t.session.end(event(1, 170)); t.advance(RECONNECT_MS)
  assert.equal(t.commits.length, 1)
})

test('a release outside targets and all explicit cleanup leave puzzle data untouched', () => {
  const outside = setup(); outside.target = null; outside.drag(); outside.session.end(event()); outside.advance(RECONNECT_MS)
  assert.equal(outside.commits.length, 0)
  const t = setup(); t.drag(); t.session.end(event(1, 130)); t.session.cancel(); t.session.cancel()
  t.session.begin({digit: 3}, event(5)); t.callbacks[0](); t.advance(1000)
  assert.equal(t.commits.length, 0); assert.equal(t.session.gesture.source.digit, 3)
})

test('disabled assistance keeps immediate release and immediate cancellation', () => {
  const t = setup(false); t.drag(); t.session.end(event(1, 130))
  assert.equal(t.commits.length, 1); assert.equal(t.timers.size, 0)
  const cancelled = setup(false); cancelled.drag(); cancelled.session.end(event(), 'cancel')
  assert.equal(cancelled.commits.length, 0); assert.equal(cancelled.session.gesture, null)
})
