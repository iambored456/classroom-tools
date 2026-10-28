import assert from 'node:assert/strict'
import test from 'node:test'
import { CardTransition, createTransitionQueue } from '../src/transitions.ts'
import type { ManagedAnimation } from '../src/transitions.ts'
import { createSession, nextCard, previousCard, chooseAnotherCard } from '../src/deck.ts'

function fakeAnimation() {
  let settle!: () => void
  let finishes = 0
  const animation: ManagedAnimation = {
    finished: new Promise<void>(resolve => { settle = resolve }),
    finish() { finishes += 1; settle() },
    cancel() { settle() },
  }
  return { animation, settle: () => settle(), get finishes() { return finishes } }
}

test('a repeat press finishes the active animation and applies each Next exactly once', async () => {
  let session = createSession(4, () => 0.5)
  const animations: ReturnType<typeof fakeAnimation>[] = []
  const busy: boolean[] = []
  const queue = createTransitionQueue(async (_: 'next', transition) => {
    await transition.play(() => {
      const fake = fakeAnimation()
      animations.push(fake)
      return fake.animation
    })
    if (!transition.cancelled) session = nextCard(session)
  }, value => busy.push(value), error => { throw error })
  queue.enqueue('next')
  queue.enqueue('next')
  queue.enqueue('next')
  // All intermediate work settles immediately; only the latest move gets an animation.
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(session.position, 2)
  assert.equal(animations.length, 2)
  assert.ok(animations[0].finishes >= 1)
  animations[1].settle()
  await queue.whenIdle()
  assert.equal(session.position, 3)
  assert.deepEqual(busy, [true, false])
})

test('presses during DOM setup skip animation phases that have not started', async () => {
  let release!: () => void
  const setup = new Promise<void>(resolve => { release = resolve })
  let draws = 0
  let animations = 0
  const queue = createTransitionQueue(async (action: 'reshuffle', transition) => {
    if (draws === 0) await setup
    await transition.play(() => {
      animations += 1
      return { finished: Promise.resolve(), finish() {}, cancel() {} }
    })
    if (!transition.cancelled) draws += 1
  }, () => {}, error => { throw error })
  queue.enqueue('reshuffle')
  queue.enqueue('reshuffle')
  release()
  await queue.whenIdle()
  assert.equal(draws, 2)
  assert.equal(animations, 1)
})

test('mixed forward, reshuffle, and reverse presses use the committed session in order', async () => {
  let session = createSession(5, () => 0.5)
  const original = [...session.order]
  const seen: string[] = []
  const queue = createTransitionQueue(async (action: 'next' | 'reshuffle' | 'back', transition) => {
    await transition.play(() => ({ finished: Promise.resolve(), finish() {}, cancel() {} }))
    if (transition.cancelled) return
    session = action === 'next' ? nextCard(session) : action === 'back' ? previousCard(session) : chooseAnotherCard(session, () => 0)
    seen.push(action)
  }, () => {}, error => { throw error })
  queue.enqueue('next')
  queue.enqueue('reshuffle')
  queue.enqueue('next')
  queue.enqueue('back')
  await queue.whenIdle()
  assert.deepEqual(seen, ['next', 'reshuffle', 'next', 'back'])
  assert.equal(session.position, 1)
  assert.equal(session.order[1], original[2])
})

test('leaving a set cancels its animation and queued moves without committing progress', async () => {
  let completed = 0
  const animation = fakeAnimation()
  const queue = createTransitionQueue(async (_: 'next', transition) => {
    await transition.play(() => animation.animation)
    if (!transition.cancelled) completed += 1
  }, () => {}, error => { throw error })
  queue.enqueue('next')
  queue.enqueue('next')
  queue.cancel()
  await queue.whenIdle()
  assert.equal(completed, 0)
})

test('interrupting a flip also skips the second half of the flip', async () => {
  const transition = new CardTransition()
  const first = fakeAnimation()
  const phase = transition.play(() => first.animation)
  transition.finish()
  await phase
  const second = await transition.play(() => { throw new Error('The second phase should be skipped') })
  assert.equal(second, null)
  transition.cleanup()
})
