import assert from 'node:assert/strict'
import {
  addTarget,
  chooseNextTarget,
  countTargets,
  createEmptyTargets,
  targetLimit,
} from '../src/lib/game.ts'

const empty = createEmptyTargets()
assert.deepEqual(countTargets(empty), { playerOne: 0, playerTwo: 0 })
assert.equal(targetLimit('one'), 5)
assert.equal(targetLimit('two'), 10)

const first = chooseNextTarget(empty, 'local', 1, 5, () => 0)
assert.deepEqual(first, { index: 0, player: 1, nextPlayer: 2 })
const afterFirst = addTarget(empty, first!)
assert.equal(afterFirst[0], 1)
assert.equal(empty[0], 0)

const second = chooseNextTarget(afterFirst, 'local', first!.nextPlayer, 5, () => 0)
assert.deepEqual(second, { index: 1, player: 2, nextPlayer: 1 })

const playerOneFull = Array<0 | 1 | 2>(64).fill(0)
playerOneFull.fill(1, 0, 5)
const skipFullPlayer = chooseNextTarget(playerOneFull, 'local', 1, 5, () => 0)
assert.equal(skipFullPlayer?.player, 2)

const bothFull = [...playerOneFull]
bothFull.fill(2, 5, 10)
assert.equal(chooseNextTarget(bothFull, 'local', 1, 5), null)

const soloFull = Array<0 | 1 | 2>(64).fill(0)
soloFull.fill(1, 0, 10)
assert.equal(chooseNextTarget(soloFull, 'solo', 1, 10), null)
assert.throws(() => chooseNextTarget(empty, 'solo', 1, 11), /between 1 and 10/)

console.log('Launchpad Finger Twister game tests passed.')
