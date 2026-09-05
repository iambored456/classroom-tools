export const GRID_SIZE = 8

export type Direction = 'up' | 'down' | 'left' | 'right'
export type GamePhase = 'idle' | 'playing' | 'paused' | 'over' | 'won'
export type Difficulty = 'easy' | 'medium' | 'hard'

export type Point = {
  row: number
  column: number
}

export type SnakeGame = {
  snake: Point[]
  food: Point | null
  direction: Direction
  queuedDirection: Direction
  phase: GamePhase
  score: number
}

const vectors: Record<Direction, Point> = {
  up: { row: -1, column: 0 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
}

const opposites: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export function pointKey(point: Point): string {
  return `${point.row}:${point.column}`
}

export function isSamePoint(a: Point, b: Point): boolean {
  return a.row === b.row && a.column === b.column
}

export function createGame(
  phase: GamePhase = 'idle',
  direction: Direction = 'right',
  random: () => number = Math.random,
): SnakeGame {
  const head = { row: 4, column: 4 }
  const vector = vectors[direction]
  const snake = [
    head,
    { row: head.row - vector.row, column: head.column - vector.column },
    { row: head.row - vector.row * 2, column: head.column - vector.column * 2 },
  ]

  return {
    snake,
    food: chooseFood(snake, random),
    direction,
    queuedDirection: direction,
    phase,
    score: 0,
  }
}

export function requestDirection(game: SnakeGame, direction: Direction): SnakeGame {
  if (opposites[game.direction] === direction) return game
  return { ...game, queuedDirection: direction }
}

export function directionForEdge(
  row: number,
  column: number,
): Direction | null {
  const onVerticalEdge = row === 0 || row === GRID_SIZE - 1
  const onHorizontalEdge = column === 0 || column === GRID_SIZE - 1

  if (!onVerticalEdge && !onHorizontalEdge) return null

  // At corners the top/bottom row wins, preserving the "any top/bottom pad" rule.
  if (row === 0) return 'up'
  if (row === GRID_SIZE - 1) return 'down'
  if (column === 0) return 'left'
  return 'right'
}

export function stepGame(game: SnakeGame, random: () => number = Math.random): SnakeGame {
  if (game.phase !== 'playing') return game

  const direction = game.queuedDirection
  const vector = vectors[direction]
  const head = game.snake[0]
  const nextHead = { row: head.row + vector.row, column: head.column + vector.column }
  const hitWall =
    nextHead.row < 0 ||
    nextHead.row >= GRID_SIZE ||
    nextHead.column < 0 ||
    nextHead.column >= GRID_SIZE
  const ateFood = game.food !== null && isSamePoint(nextHead, game.food)
  const collisionBody = ateFood ? game.snake : game.snake.slice(0, -1)
  const hitSelf = collisionBody.some((point) => isSamePoint(point, nextHead))

  if (hitWall || hitSelf) {
    return { ...game, direction, queuedDirection: direction, phase: 'over' }
  }

  const snake = [nextHead, ...game.snake]
  if (!ateFood) snake.pop()

  if (!ateFood) {
    return { ...game, snake, direction, queuedDirection: direction }
  }

  const food = chooseFood(snake, random)
  return {
    ...game,
    snake,
    food,
    direction,
    queuedDirection: direction,
    phase: food === null ? 'won' : 'playing',
    score: game.score + 1,
  }
}

const speedSettings: Record<Difficulty, { startingDuration: number; acceleration: number; minimumDuration: number }> = {
  easy: { startingDuration: 400, acceleration: 5, minimumDuration: 160 },
  medium: { startingDuration: 300, acceleration: 6, minimumDuration: 110 },
  hard: { startingDuration: 225, acceleration: 7, minimumDuration: 78 },
}

export function tickDuration(score: number, difficulty: Difficulty = 'hard'): number {
  const settings = speedSettings[difficulty]
  return Math.max(
    settings.minimumDuration,
    settings.startingDuration - score * settings.acceleration,
  )
}

function chooseFood(snake: Point[], random: () => number): Point | null {
  const occupied = new Set(snake.map(pointKey))
  const free: Point[] = []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const point = { row, column }
      if (!occupied.has(pointKey(point))) free.push(point)
    }
  }

  if (free.length === 0) return null
  const index = Math.min(free.length - 1, Math.floor(random() * free.length))
  return free[index]
}
