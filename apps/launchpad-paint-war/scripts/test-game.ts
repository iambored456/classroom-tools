import assert from 'node:assert/strict'
import {
  applyComputerPaint,
  computerPaceMs,
  countPaint,
  createBalancedRevealOwners,
  createEmptyBoard,
  pressHumanPad,
  pressLocalPad,
  winningPlayer,
} from '../src/lib/game.ts'

const empty = createEmptyBoard()
assert.deepEqual(countPaint(empty), { playerOne: 0, playerTwo: 0, empty: 64 })

const reveals = createBalancedRevealOwners(() => 0.5)
assert.equal(reveals.filter((owner) => owner === 1).length, 32)
assert.equal(reveals.filter((owner) => owner === 2).length, 32)

const firstLocal = pressLocalPad(empty, reveals, 0)
assert.equal(firstLocal[0], reveals[0])
assert.equal(empty[0], 0)
const secondLocal = pressLocalPad(firstLocal, reveals, 0)
assert.notEqual(secondLocal[0], firstLocal[0])

const humanClaim = pressHumanPad(empty, 8)
assert.equal(humanClaim[8], 1)
assert.equal(pressHumanPad(humanClaim, 8)[8], 2)

const computerMove = applyComputerPaint(humanClaim, () => 0)
assert.equal(computerMove.index, 0)
assert.equal(computerMove.board[0], 2)
assert.equal(humanClaim[0], 0)

const humanBoard = Array<0 | 1 | 2>(64).fill(1)
const stolen = applyComputerPaint(humanBoard, () => 0.5)
assert.equal(stolen.board[stolen.index!], 2)
assert.equal(winningPlayer(stolen.board), 1)

const computerBoard = Array<0 | 1 | 2>(64).fill(2)
assert.equal(applyComputerPaint(computerBoard).index, null)
assert.equal(computerPaceMs.easy > computerPaceMs.medium, true)
assert.equal(computerPaceMs.medium > computerPaceMs.hard, true)
assert.deepEqual(computerPaceMs, { easy: 850, medium: 525, hard: 300 })

console.log('Launchpad Paint War game tests passed.')
