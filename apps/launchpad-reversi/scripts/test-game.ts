import assert from 'node:assert/strict'
import { chooseAiMove } from '../src/lib/ai.ts'
import { colourDistance, hexToLaunchpadRgb } from '../src/lib/colours.ts'
import {
  aiMoveFlashSteps,
  createScoreDisplayBoard,
  endgameSteps,
  shouldShowLegalMoves,
} from '../src/lib/presentation.ts'
import {
  applyMove,
  countDiscs,
  createInitialBoard,
  getFlips,
  getLegalMoves,
  resolveTurn,
  winner,
  type Board,
} from '../src/lib/reversi.ts'

const opening = createInitialBoard()
assert.deepEqual(countDiscs(opening), { playerOne: 2, playerTwo: 2, empty: 60 })
assert.deepEqual(getLegalMoves(opening, 1), [19, 26, 37, 44])
assert.deepEqual(getFlips(opening, 1, 19), [27])
assert.equal(getFlips(opening, 1, 27).length, 0)

const openingSnapshot = [...opening]
const afterFirstMove = applyMove(opening, 1, 19)
assert.deepEqual(opening, openingSnapshot)
assert.deepEqual(countDiscs(afterFirstMove), { playerOne: 4, playerTwo: 1, empty: 59 })
assert.equal(afterFirstMove[27], 1)
assert.deepEqual(resolveTurn(afterFirstMove, 1), { nextPlayer: 2, passedPlayer: null, gameOver: false })

assert.throws(() => applyMove(opening, 1, 0), /not a legal move/)

const fullBoard = Array.from({ length: 64 }, (_, index) => (index < 40 ? 1 : 2)) as Board
assert.equal(resolveTurn(fullBoard, 1).gameOver, true)
assert.equal(winner(fullBoard), 1)

const forcedPassBoard = Array<0 | 1 | 2>(64).fill(1)
forcedPassBoard[0] = 0
forcedPassBoard[1] = 2
assert.deepEqual(getLegalMoves(forcedPassBoard, 2), [])
assert.deepEqual(getLegalMoves(forcedPassBoard, 1), [0])
assert.deepEqual(resolveTurn(forcedPassBoard, 1), { nextPlayer: 1, passedPlayer: 2, gameOver: false })
assert.equal(chooseAiMove(forcedPassBoard, 2, 'hard'), null)

const unfinishedTerminalBoard = Array<0 | 1 | 2>(64).fill(1)
unfinishedTerminalBoard[0] = 0
assert.deepEqual(resolveTurn(unfinishedTerminalBoard, 2), { nextPlayer: 1, passedPlayer: null, gameOver: true })

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  const move = chooseAiMove(opening, 1, difficulty, () => 0)
  assert.ok(move !== null && getLegalMoves(opening, 1).includes(move))
}

const cornerBoard = Array<0 | 1 | 2>(64).fill(0)
cornerBoard[1] = 1
cornerBoard[2] = 2
assert.equal(chooseAiMove(cornerBoard, 2, 'medium'), 0)
assert.equal(chooseAiMove(cornerBoard, 2, 'hard'), 0)

assert.deepEqual(hexToLaunchpadRgb('#ff0000'), [127, 0, 0])
assert.deepEqual(hexToLaunchpadRgb('#ffffff'), [127, 127, 127])
assert.ok(colourDistance('#000000', '#ffffff') > 400)

assert.equal(shouldShowLegalMoves(false, 'local', 1), true)
assert.equal(shouldShowLegalMoves(false, 'local', 2), true)
assert.equal(shouldShowLegalMoves(false, 'computer', 1), true)
assert.equal(shouldShowLegalMoves(false, 'computer', 2), false)
assert.equal(shouldShowLegalMoves(true, 'local', 1), false)
assert.equal(aiMoveFlashSteps.filter((step) => step.hidden).length, 2)
assert.equal(aiMoveFlashSteps.at(-1)?.hidden, false)

const eightToFiftySix = createScoreDisplayBoard({ playerOne: 8, playerTwo: 56, empty: 0 })
assert.deepEqual(eightToFiftySix.slice(0, 8), Array(8).fill(1))
assert.deepEqual(eightToFiftySix.slice(8), Array(56).fill(2))

const unfinishedScore = createScoreDisplayBoard({ playerOne: 23, playerTwo: 37, empty: 4 })
assert.deepEqual(countDiscs(unfinishedScore), { playerOne: 23, playerTwo: 37, empty: 4 })
assert.deepEqual(unfinishedScore.slice(23, 27), Array(4).fill(0))
assert.equal(endgameSteps.filter((step) => step.phase === 'flash-off').length, 3)
assert.equal(endgameSteps.at(-1)?.phase, 'score')

console.log('Launchpad Reversi rules, AI, and colour mapping passed.')
