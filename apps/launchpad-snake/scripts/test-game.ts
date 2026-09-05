import assert from 'node:assert/strict'
import {
  createGame,
  directionForEdge,
  requestDirection,
  stepGame,
  tickDuration,
  type SnakeGame,
} from '../src/lib/snake.ts'

const initial = createGame('playing', 'right', () => 0)
assert.equal(initial.snake.length, 3)
assert.equal(initial.direction, 'right')
assert.ok(initial.food)

assert.equal(directionForEdge(0, 4), 'up')
assert.equal(directionForEdge(7, 4), 'down')
assert.equal(directionForEdge(4, 0), 'left')
assert.equal(directionForEdge(4, 7), 'right')
assert.equal(directionForEdge(3, 3), null)
assert.equal(directionForEdge(0, 0), 'up')

const forbiddenReverse = requestDirection(initial, 'left')
assert.equal(forbiddenReverse.queuedDirection, 'right')
const legalTurn = requestDirection(initial, 'up')
assert.equal(legalTurn.queuedDirection, 'up')

const moved = stepGame({ ...initial, food: { row: 0, column: 0 } }, () => 0)
assert.deepEqual(moved.snake[0], { row: 4, column: 5 })
assert.equal(moved.snake.length, 3)

const ate = stepGame({ ...initial, food: { row: 4, column: 5 } }, () => 0)
assert.equal(ate.score, 1)
assert.equal(ate.snake.length, 4)

const atWall: SnakeGame = {
  snake: [{ row: 0, column: 3 }, { row: 1, column: 3 }, { row: 2, column: 3 }],
  food: { row: 7, column: 7 },
  direction: 'up',
  queuedDirection: 'up',
  phase: 'playing',
  score: 2,
}
assert.equal(stepGame(atWall).phase, 'over')

const selfCollision: SnakeGame = {
  snake: [
    { row: 3, column: 3 },
    { row: 3, column: 2 },
    { row: 2, column: 2 },
    { row: 2, column: 3 },
    { row: 1, column: 3 },
  ],
  food: { row: 7, column: 7 },
  direction: 'up',
  queuedDirection: 'up',
  phase: 'playing',
  score: 4,
}
assert.equal(stepGame(selfCollision).phase, 'over')

assert.equal(tickDuration(0, 'hard'), 225)
assert.equal(tickDuration(0, 'medium'), 300)
assert.equal(tickDuration(0, 'easy'), 400)
assert.ok(tickDuration(12, 'easy') > tickDuration(12, 'medium'))
assert.ok(tickDuration(12, 'medium') > tickDuration(12, 'hard'))
assert.equal(tickDuration(100, 'easy'), 160)
assert.equal(tickDuration(100, 'medium'), 110)
assert.equal(tickDuration(100, 'hard'), 78)

console.log('Launchpad Snake game rules passed.')
