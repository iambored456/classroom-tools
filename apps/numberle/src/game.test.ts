import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaults, generate, hardError, newGame, outcome, restoreGame, score, seededRandom, validate, type Operator } from './game.ts'

test('validates arithmetic exactly and respects precedence', () => {
  for (const equation of ['4+7*5=39', '10/4*2=5', '8-6/3=6', '1/3*3=1', '0+1=1']) assert.equal(validate(equation), null, equation)
  for (const equation of ['4+7*5=55', '1/0=0', '01+1=2', '1++1=2', '1+1=1+1', '2+2==4', '1-2=-1', '1+1=02', '1/3*3=2']) assert.ok(validate(equation), equation)
  assert.ok(validate('1+1=2', 8))
})
test('duplicate clues consume only the available copies', () => {
  assert.deepEqual(score('11+11=22', '12+10=22'), ['correct', 'absent', 'correct', 'correct', 'absent', 'correct', 'correct', 'correct'])
  assert.deepEqual(score('21+10=31', '12+10=22'), ['present', 'present', 'correct', 'correct', 'correct', 'correct', 'absent', 'absent'])
})
test('hard mode retains fixed tiles and the required number of repeats', () => {
  assert.ok(hardError('20+12=32', ['11+11=22'], '12+10=22'))
  assert.ok(hardError('2+2+8=12', ['1+1+9=11'], '9+1+1=11'))
  assert.equal(hardError('12+10=22', ['11+11=22'], '12+10=22'), null)
})
test('all lengths and operator subsets produce valid equations, including bounded fallback', () => {
  const ops: Operator[] = ['+', '-', '*', '/']
  for (let mask = 1; mask < 16; mask++) {
    const selected = ops.filter((_, i) => mask & (1 << i))
    for (let length = 5; length <= 12; length++) {
      for (const random of [seededRandom(`${mask}:${length}`), () => 0]) {
        const equation = generate(length, selected, random)
        assert.equal(validate(equation, length), null, equation)
        assert.ok([...equation].filter(c => ops.includes(c as Operator)).every(c => selected.includes(c as Operator)))
      }
    }
  }
})
test('daily puzzle is repeatable, date-specific, and independent of operator selection order', () => {
  const a = newGame({ ...defaults, daily: true }, '2026-11-03')
  const b = newGame({ ...defaults, daily: true }, '2026-11-03')
  assert.equal(a.answer, b.answer)
  assert.equal(a.answer, newGame({ ...defaults, daily: true, operators: [...defaults.operators].reverse() }, '2026-11-03').answer)
  assert.notEqual(a.id, newGame({ ...defaults, daily: true }, '2026-11-04').id)
})
test('restores only valid saved games and identifies terminal states', () => {
  const game = newGame(defaults)
  assert.deepEqual(restoreGame(game), game)
  assert.equal(restoreGame({ ...game, answer: 'broken' }), null)
  assert.equal(restoreGame({ ...game, guesses: [123] }), null)
  assert.equal(outcome({ ...game, guesses: [game.answer] }), 'won')
  assert.equal(outcome({ ...game, answer: '2+2=4', guesses: Array(6).fill('1+1=2') }), 'lost')
})
