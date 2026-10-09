import {test} from 'node:test'
import assert from 'node:assert/strict'
import {diceDistribution, parseProbability, checkDice, quarterCircleArea, halfFieldRope, roundedBackpay, coinArrangement, storyIsCorrect, explorationQuestions} from './explorations.js'

test('dice probabilities count ordered outcomes, including the source targets', () => {
  for (const n of [4, 5, 6]) {
    const counts = diceDistribution(n)
    assert.equal(counts.reduce((sum, count) => sum + count, 0), n * n)
    assert.equal(counts[n + 1], n)
    for (let sum = 2; sum <= n; sum++) assert.equal(counts[sum], counts[2 * n + 2 - sum])
  }
  assert.equal(diceDistribution(4)[7], 2)
  assert.equal(diceDistribution(5)[4], 3)
})

test('probability input accepts equivalent fractions, decimals and percents without evaluation', () => {
  for (const text of ['2/16', '1 / 8', '0.125', '.125', '12.5%']) assert.equal(parseProbability(text), 0.125)
  for (const text of ['', '1/0', 'Infinity', '2/1', '-0.1', '1+1', '<script>', '%', 'NaN']) assert.equal(parseProbability(text), null)
})

test('dice checks incomplete tables, wrong sums, probability and most likely outcome', () => {
  const cells = n => Array.from({length: n * n}, (_, i) => String(Math.floor(i / n) + i % n + 2))
  assert.equal(checkDice(4, cells(4), '1/8', '5').success, true)
  assert.equal(checkDice(5, cells(5), '12%', '6').success, true)
  assert.equal(checkDice(6, cells(6)).success, true)
  assert.equal(checkDice(4, cells(4), '1/4', '5').success, false)
  assert.equal(checkDice(4, cells(4), '1/8', '7').success, false)
  const partial = cells(4); partial[0] = ''; partial[3] = '7'
  const result = checkDice(4, partial, '1/8', '5')
  assert.equal(result.correct, 14); assert.equal(result.filled, 15)
  assert.deepEqual(result.incorrect, [3]); assert.equal(result.success, false)
})

test('corner rope covers exactly half of a 20 metre square without reaching another corner', () => {
  const radius = halfFieldRope(20)
  assert.ok(radius < 20)
  assert.ok(Math.abs(radius - 15.9576912161) < 1e-8)
  assert.ok(Math.abs(quarterCircleArea(radius) - 200) < 1e-10)
  assert.equal(quarterCircleArea(0), 0)
})

test('backpay follows rounding each pay stub before subtracting', () => {
  assert.equal(roundedBackpay(), 700)
  // Rounding the difference can be a different operation.
  assert.equal(roundedBackpay(1049, 1551), 600)
  assert.equal(Math.round((1551 - 1049) / 100) * 100, 500)
})

test('grid and staggered arrangements fit whole circles without overlap or overhang', () => {
  const grid = coinArrangement(8, 8)
  const staggered = coinArrangement(10, 8, 'staggered')
  assert.equal(grid.count, 64); assert.equal(grid.fits, true)
  assert.equal(staggered.count, 80); assert.equal(staggered.fits, true)
  assert.equal(coinArrangement(9, 8).fits, false)
  assert.equal(coinArrangement(10, 9, 'staggered').fits, false)
  for (const arrangement of [grid, staggered]) {
    for (let i = 0; i < arrangement.coins.length; i++) for (let j = i + 1; j < arrangement.coins.length; j++) {
      const a = arrangement.coins[i], b = arrangement.coins[j]
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 1.8 - 1e-9)
    }
    assert.ok(arrangement.width <= 16 && arrangement.height <= 16)
  }
})

test('apple stories preserve more and less and allow the valid zero boundary', () => {
  assert.equal(storyIsCorrect('9', '0', 'more'), true)
  assert.equal(storyIsCorrect('0', '9', 'less'), true)
  assert.equal(storyIsCorrect('21', '12', 'more'), true)
  assert.equal(storyIsCorrect('12', '21', 'less'), true)
  for (const values of [['', '', 'more'], ['9', '0', 'less'], ['-1', '8', 'less'], ['9.5', '0.5', 'more'], ['9', '0', '']]) assert.equal(storyIsCorrect(...values), false)
})

test('every supplied exploration worksheet has a distinct registered question and source', () => {
  assert.equal(explorationQuestions.length, 6)
  assert.equal(new Set(explorationQuestions.map(question => question.id)).size, 6)
  assert.ok(explorationQuestions.every(question => question.sourceFiles.length && question.layout === 'exploration'))
  assert.deepEqual(explorationQuestions.find(question => question.id === 'qf-dice-4-5').sides, [4, 5])
})
