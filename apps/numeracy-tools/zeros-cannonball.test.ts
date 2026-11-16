import assert from 'node:assert/strict'
import test from 'node:test'
import { examples, factorQuadratic, flightPoint, graphGeometry } from './src/zeros-cannonball'

test('factoring preserves coefficients and solves exact integer and rational zeros', () => {
  for (const config of [...examples, { a: 6, b: 1, c: -2 }, { a: 2, b: -7, c: 3 }, { a: 1, b: 0, c: -9 }]) {
    const lesson = factorQuadratic(config)
    const { common, p, q, r, s } = lesson
    assert.deepEqual([common * p * r, common * (p * s + q * r), common * q * s].map(n => n || 0), [config.a, config.b, config.c])
    assert.ok(lesson.left < lesson.right)
    for (const { root } of lesson.factors) assert.ok(Math.abs(config.a * root * root + config.b * root + config.c) < 1e-10)
  }
  assert.deepEqual(factorQuadratic({ a: 6, b: 1, c: -2 }).factors.map(f => f.rootLabel), ['−2/3', '1/2'])
})

test('invalid, irrational, non-real, and repeated zeros cannot start a flight', () => {
  for (const config of [{ a: 0, b: 2, c: 1 }, { a: 1, b: 0, c: 1 }, { a: 1, b: -2, c: 1 }, { a: 1, b: 0, c: -2 }, { a: NaN, b: 1, c: 1 }, { a: 1.5, b: 2, c: 1 }]) {
    assert.throws(() => factorQuadratic(config))
  }
})

test('flight stops exactly at the right zero and reflects across the x-axis', () => {
  const down = factorQuadratic(examples[0]), up = factorQuadratic(examples[1])
  for (const t of [0, .1, .25, .5, .75, .9, 1, 2]) {
    const above = flightPoint(down, t), below = flightPoint(up, t)
    assert.equal(above.x, below.x)
    assert.equal(above.y + below.y, 0)
    assert.ok(above.y >= 0 && below.y <= 0)
  }
  assert.deepEqual(flightPoint(down, 2), { x: down.right, y: 0 })
  assert.equal(flightPoint(down, .5).y, 9)
  const graph = graphGeometry(down)
  assert.equal(graph.point(0).y, graph.yPixel(0))
  assert.equal(graph.point(1).x, graph.xPixel(down.right))
  assert.ok(graph.point(.5).y < graph.point(0).y)
  assert.ok(graphGeometry(up).point(.5).y > graphGeometry(up).point(0).y)
})
