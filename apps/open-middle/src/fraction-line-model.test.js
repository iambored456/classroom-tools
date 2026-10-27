import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DENOMINATORS, placeNumerator, evaluateFractionLine, linePosition, moveLinePosition } from './fraction-line-model.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`)

test('the five printed denominators stay fixed', () => {
  assert.deepEqual(DENOMINATORS, [2, 3, 4, 6, 8])
  assert.ok(Object.isFrozen(DENOMINATORS))
})

test('placing a used numerator swaps spaces without changing the old state', () => {
  const digits = [2, 3, null, 0, 4]
  assert.deepEqual(placeNumerator(digits, 2, 1), [3, 2, null, 0, 4])
  assert.deepEqual(placeNumerator(digits, 2, 2), [null, 3, 2, 0, 4])
  assert.deepEqual(placeNumerator(digits, 5, 0), [5, 3, null, 0, 4])
  assert.deepEqual(digits, [2, 3, null, 0, 4])
  assert.notEqual(placeNumerator(digits, 2, 0), digits)
})

test('numerator placement accepts zero and rejects unavailable digits or slots', () => {
  assert.deepEqual(placeNumerator([null, null, null, null, null], 0, 4), [null, null, null, null, 0])
  for (const [digit, index] of [[6, 0], [-1, 0], [1.5, 0], [1, -1], [1, 5]]) {
    assert.throws(() => placeNumerator([null, null, null, null, null], digit, index))
  }
})

test('source example allows equivalent fractions at one point, including zero', () => {
  const result = evaluateFractionLine([2, 3, 1, 0, 4], [1, 1, 0.25, 0, 0.5])
  assert.equal(result.status, 'success')
  assert.deepEqual(result.correct, [true, true, true, true, true])
})

test('improper fractions are accepted up to the largest possible value 5/2', () => {
  assert.equal(evaluateFractionLine([5, 4, 3, 2, 0], [2.5, 4 / 3, 0.75, 1 / 3, 0]).status, 'success')
})

test('correct order alone does not satisfy fraction spacing', () => {
  const result = evaluateFractionLine([1, 2, 3, 4, 5], [0.1, 0.3, 0.4, 0.3, 0.2])
  assert.equal(result.status, 'retry')
  assert.deepEqual(result.correct, [false, false, false, false, false])
})

test('placement tolerance is 1/120 of one unit', () => {
  const digits = [2, 3, 1, 0, 4], positions = [1, 1, 0.25, 0, 0.5]
  assert.equal(evaluateFractionLine(digits, positions.map((value, i) => i === 0 ? value + 1 / 120 : value)).status, 'success')
  const result = evaluateFractionLine(digits, positions.map((value, i) => i === 0 ? value + 0.009 : value))
  assert.equal(result.status, 'retry')
  assert.deepEqual(result.correct, [false, true, true, true, true])
})

test('unfinished fractions and unplaced fractions receive incomplete feedback', () => {
  assert.equal(evaluateFractionLine([2, 3, null, 0, 4], [1, 1, null, 0, 0.5]).status, 'incomplete')
  const result = evaluateFractionLine([2, 3, 1, 0, 4], [1, null, 0.25, 0, 0.5])
  assert.equal(result.status, 'incomplete')
  assert.deepEqual(result.correct, [true, false, true, true, true])
})

test('invalid digits, repeated zero, malformed state, and off-line positions are rejected', () => {
  const digits = [2, 3, 1, 0, 4], positions = [1, 1, 0.25, 0, 0.5]
  for (const values of [[2, 3, 1, 0, 0], [6, 3, 1, 0, 4], ['2', 3, 1, 0, 4], [2.5, 3, 1, 0, 4]]) {
    assert.equal(evaluateFractionLine(values, positions).status, 'invalid')
  }
  for (const position of [-0.01, 3.01, NaN, Infinity, '1']) {
    assert.equal(evaluateFractionLine(digits, [position, ...positions.slice(1)]).status, 'invalid')
  }
  assert.equal(evaluateFractionLine(digits.slice(1), positions).status, 'invalid')
  assert.equal(evaluateFractionLine(digits, null).status, 'invalid')
})

test('pointer conversion uses actual rendered bounds and clamps both line endpoints', () => {
  const rect = { left: 100, width: 600 }
  close(linePosition(300, rect), 1)
  close(linePosition(500, { left: 100, width: 1200 }), 1)
  assert.equal(linePosition(0, rect), 0)
  assert.equal(linePosition(1000, rect), 3)
  assert.equal(linePosition(250, { left: 0, width: 0 }), 0)
})

test('pointer snapping follows the selected equal subdivisions', () => {
  close(linePosition(260, { left: 0, width: 1000 }, 1, 4, true), 0.25)
  close(linePosition(260, { left: 0, width: 1000 }, 1, 4, false), 0.26)
  close(linePosition(160, { left: 0, width: 300 }, 3, 3, true), 5 / 3)
})

test('keyboard moves in 1/24 units without snapping and clamps at endpoints', () => {
  close(moveLinePosition(0.5, 'ArrowRight', 3, 4, false), 13 / 24)
  close(moveLinePosition(0.5, 'ArrowLeft', 3, 4, false), 11 / 24)
  assert.equal(moveLinePosition(0, 'ArrowLeft'), 0)
  assert.equal(moveLinePosition(3, 'ArrowRight'), 3)
  assert.equal(moveLinePosition(1.5, 'Home'), 0)
  assert.equal(moveLinePosition(1.5, 'End'), 3)
  assert.equal(moveLinePosition(1.5, 'Enter'), 1.5)
})

test('snapping arrows move to adjacent ticks from exact and between-tick positions', () => {
  close(moveLinePosition(0.5, 'ArrowRight', 3, 4, true), 0.75)
  close(moveLinePosition(0.5, 'ArrowLeft', 3, 4, true), 0.25)
  close(moveLinePosition(0.51, 'ArrowRight', 3, 4, true), 0.75)
  close(moveLinePosition(0.51, 'ArrowLeft', 3, 4, true), 0.5)
  close(moveLinePosition(1 / 3, 'ArrowRight', 3, 3, true), 2 / 3)
  close(moveLinePosition(1 / 3, 'ArrowLeft', 3, 3, true), 0)
})

test('repeated snapping crosses the whole line without getting stuck on rounded ticks', () => {
  for (const parts of [3, 6, 8, 24]) {
    let value = 0
    for (let tick = 1; tick <= parts * 3; tick++) {
      value = moveLinePosition(value, 'ArrowRight', 3, parts, true)
      close(value, tick / parts)
    }
    for (let tick = parts * 3 - 1; tick >= 0; tick--) {
      value = moveLinePosition(value, 'ArrowLeft', 3, parts, true)
      close(value, tick / parts)
    }
  }
})
