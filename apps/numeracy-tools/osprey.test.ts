import assert from 'node:assert/strict'
import test from 'node:test'
import { examples, factorQuadratic, graphGeometry } from './src/zeros-cannonball'
import { equationForAnimation, ospreyPose } from './src/osprey'

test('osprey reflection preserves both zeros and puts the vertex underwater', () => {
  const original = factorQuadratic(examples[0])
  const reflected = factorQuadratic(equationForAnimation(original, 'osprey'))
  assert.deepEqual([reflected.left, reflected.right], [original.left, original.right])
  assert.ok(reflected.a > 0)
  const graph = graphGeometry(reflected)
  assert.ok(graph.point(.5).y > graph.yPixel(0))
  assert.deepEqual(equationForAnimation(examples[1], 'cannonball'), { a: 1, b: -2, c: -8 })
})

test('osprey enters and exits at the zeros, catches one fish, and flies away continuously', () => {
  const graph = graphGeometry(factorQuadratic(examples[1]))
  const entry = ospreyPose(graph, .16), exit = ospreyPose(graph, .84)
  assert.deepEqual([entry.x, entry.y], Object.values(graph.point(0)))
  assert.deepEqual([exit.x, exit.y], Object.values(graph.point(1)))
  assert.equal(ospreyPose(graph, .51).carryingFish, false)
  assert.equal(ospreyPose(graph, .52).carryingFish, true)
  for (const t of [.16, .48, .52, .56, .84]) {
    const before = ospreyPose(graph, t - 1e-8), after = ospreyPose(graph, t + 1e-8)
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .001)
  }
  const final = ospreyPose(graph, 1)
  assert.ok(final.x > exit.x && final.y < exit.y)
  assert.equal(final.carryingFish, true)
  assert.equal(final.opacity, 0)
  assert.deepEqual(ospreyPose(graph, 2), final)
})
