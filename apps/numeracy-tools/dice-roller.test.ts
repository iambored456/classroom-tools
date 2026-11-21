import assert from 'node:assert/strict'
import test from 'node:test'
import { expression, faceLabel, groupOrder, makeRoll, physicalDice, uniformValue } from './src/dice-roller/roll'
import { meshes, poseFor, visibleSurface } from './src/dice-roller/geometry'

test('one record owns the grouped outcomes, physical dice, and sum', () => {
  const pool = { 4:1, 6:1, 100:1 }
  const values = [85,5,1]
  const roll = makeRoll(pool, 1, () => values.shift()!, 123)
  pool[6]++
  assert.equal(roll.timestamp, 123)
  assert.equal(expression(roll.pool), '1d100 + 1d6 + 1d4')
  assert.deepEqual(roll.outcomes.map(d => d.value), [85,5,1])
  assert.equal(roll.total, 91)
  const dice = physicalDice(roll)
  assert.deepEqual(dice.map(d => faceLabel(d)), ['80','5','5','1'])
  assert.equal(dice[0].logicalId, dice[1].logicalId)
  assert.ok(Object.isFrozen(roll) && Object.isFrozen(roll.outcomes[0]))
})

test('all percentile values decode, and pairs retain independent identities', () => {
  for (let value = 1; value <= 100; value++) {
    const values = [value, 100]
    const roll = makeRoll({100:2}, 1, () => values.shift()!)
    const [tens, units, tens2, units2] = physicalDice(roll)
    assert.match(faceLabel(tens), /^\d0$/)
    assert.match(faceLabel(units), /^\d$/)
    assert.equal((Number(faceLabel(tens)) + Number(faceLabel(units))) || 100, value)
    assert.deepEqual([faceLabel(tens2),faceLabel(units2)], ['00','0'])
    assert.notEqual(tens.logicalId, tens2.logicalId)
    assert.deepEqual([tens.pair,units.pair,tens2.pair,units2.pair], [1,1,2,2])
    assert.equal(roll.total,value+100)
  }
})

test('every final orientation presents the committed face or the upper d4 tip', () => {
  for (const sides of groupOrder) {
    for (let value = 1; value <= sides; value++) {
      for (const die of physicalDice(makeRoll({[sides]:1}, 1, () => value))) {
        const mesh = meshes[die.sides]
        assert.equal(mesh.faces.length, die.sides)
        for (const yaw of [-.16, 0, .16]) {
          const pose = poseFor(die, undefined, yaw)
          const surface = visibleSurface(die, undefined, yaw)
          if (sides === 4) {
            const vertices = mesh.vertices.map(pose)
            assert.equal(vertices[die.face-1][1], Math.max(...vertices.map(v => v[1])))
            const topLabel = surface.labels.reduce((a,b) => a.at[1] > b.at[1] ? a : b)
            assert.equal(topLabel.text, String(value))
          } else {
            const mostVisible = surface.faces.at(-1)!
            assert.equal(mostVisible.index+1, die.face, 'face for d' + sides + ' value ' + value)
            assert.equal(surface.labels.at(-1)!.text, faceLabel(die))
          }
        }
      }
    }
  }
})

test('sampling rejects the biased tail and permits independent repeated values', () => {
  const words = [0xffffffff, 0xfffffffe, 5, 5]
  const roll = makeRoll({6:2}, 1, sides => uniformValue(sides, () => words.shift()!))
  assert.equal(roll.total, 12)
  assert.deepEqual(words, [])
  for (const sides of groupOrder) {
    assert.equal(uniformValue(sides, () => 0), 1)
    assert.equal(uniformValue(sides, () => sides-1), sides)
  }
})

test('enforces valid groups, dice counts, and draws at the engine boundary', () => {
  for (const pool of [{}, {6:-1}, {6:.5}, {6:31}, {7:1}, {100:20, 4:11}]) {
    assert.throws(() => makeRoll(pool, 1), RangeError)
  }
  for (const bad of [0, 7, NaN, 2.5]) assert.throws(() => makeRoll({6:1}, 1, () => bad), RangeError)
  const full = makeRoll({100:30}, 1, () => 100)
  assert.equal(full.total, 3000)
  assert.equal(full.outcomes.length, 30)
  assert.equal(physicalDice(full).length, 60)
})
