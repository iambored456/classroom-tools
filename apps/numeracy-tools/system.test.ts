import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLesson, defaultSystem, presets, validateSystem } from './src/math/system.js'

test('preset and custom answers satisfy both original equations exactly', () => {
  const examples = [
    ...presets.map(preset => preset.config),
    { ...defaultSystem, m: -3, b: -4, a: -2, c: 5, d: 6 },
    { ...defaultSystem, variable: 'x' as const, m: 0, b: 3, a: 5, c: -2, d: -4 },
    { ...defaultSystem, a: 0, m: 3, c: -4, d: -7 },
  ]
  for (const config of examples) {
    const { x, y } = buildLesson(config)
    const [isolated, other] = config.variable === 'x' ? [x, y] : [y, x]
    const scale = isolated.d * other.d
    assert.equal(isolated.n * other.d, config.m * other.n * isolated.d + config.b * scale)
    assert.equal(config.a * other.n * isolated.d + config.c * isolated.n * other.d, config.d * scale)
    assert.ok(x.d > 0 && y.d > 0)
  }
})

test('parallel and equivalent equations are reported separately', () => {
  assert.match(validateSystem({ ...defaultSystem, a: 2 }), /no solution/)
  assert.match(validateSystem({ ...defaultSystem, a: 2, d: 7 }), /infinitely many/)
  assert.match(validateSystem({ ...defaultSystem, c: 0 }), /must not be zero/)
  assert.match(validateSystem({ ...defaultSystem, m: 1.5 }), /whole numbers/)
})
