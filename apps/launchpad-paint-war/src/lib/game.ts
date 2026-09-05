export const CELL_COUNT = 64

export type PaintCell = 0 | 1 | 2
export type Player = 1 | 2
export type PaintBoard = PaintCell[]
export type GameMode = 'local' | 'computer'
export type Difficulty = 'easy' | 'medium' | 'hard'

export const computerPaceMs: Record<Difficulty, number> = {
  easy: 850,
  medium: 525,
  hard: 300,
}

export function createEmptyBoard(): PaintBoard {
  return Array<PaintCell>(CELL_COUNT).fill(0)
}

export function createBalancedRevealOwners(random: () => number = Math.random): Player[] {
  const owners = Array.from({ length: CELL_COUNT }, (_, index) => (index < CELL_COUNT / 2 ? 1 : 2) as Player)
  for (let index = owners.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(random() * (index + 1)))
    ;[owners[index], owners[swapIndex]] = [owners[swapIndex], owners[index]]
  }
  return owners
}

export function pressLocalPad(board: PaintBoard, revealOwners: Player[], index: number): PaintBoard {
  assertIndex(index)
  if (revealOwners.length !== CELL_COUNT) throw new Error('Local reveal map must contain 64 colours.')
  const next = [...board]
  next[index] = board[index] === 0 ? revealOwners[index] : opposite(board[index] as Player)
  return next
}

export function pressHumanPad(board: PaintBoard, index: number): PaintBoard {
  assertIndex(index)
  const next = [...board]
  next[index] = board[index] === 0 ? 1 : opposite(board[index] as Player)
  return next
}

export function applyComputerPaint(
  board: PaintBoard,
  random: () => number = Math.random,
): { board: PaintBoard; index: number | null } {
  const candidates = board.flatMap((cell, index) => cell === 2 ? [] : [index])
  if (candidates.length === 0) return { board, index: null }
  const candidateIndex = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  const index = candidates[candidateIndex]
  const next = [...board]
  next[index] = 2
  return { board: next, index }
}

export function countPaint(board: PaintBoard): { playerOne: number; playerTwo: number; empty: number } {
  let playerOne = 0
  let playerTwo = 0
  for (const cell of board) {
    if (cell === 1) playerOne += 1
    if (cell === 2) playerTwo += 1
  }
  return { playerOne, playerTwo, empty: CELL_COUNT - playerOne - playerTwo }
}

export function winningPlayer(board: PaintBoard): Player | null {
  const counts = countPaint(board)
  if (counts.playerOne === counts.playerTwo) return null
  return counts.playerOne > counts.playerTwo ? 1 : 2
}

function opposite(player: Player): Player {
  return player === 1 ? 2 : 1
}

function assertIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
    throw new Error('Pad index must be between 0 and 63.')
  }
}
