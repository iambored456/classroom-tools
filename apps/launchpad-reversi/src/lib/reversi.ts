export const BOARD_SIZE = 8
export const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE

export type Disc = 0 | 1 | 2
export type Player = 1 | 2
export type Board = Disc[]

export type DiscCounts = {
  playerOne: number
  playerTwo: number
  empty: number
}

export type TurnResolution = {
  nextPlayer: Player
  passedPlayer: Player | null
  gameOver: boolean
}

const directions: ReadonlyArray<readonly [row: number, column: number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
]

export function opponent(player: Player): Player {
  return player === 1 ? 2 : 1
}

export function createInitialBoard(): Board {
  const board = Array<Disc>(BOARD_CELLS).fill(0)
  board[indexAt(3, 3)] = 2
  board[indexAt(3, 4)] = 1
  board[indexAt(4, 3)] = 1
  board[indexAt(4, 4)] = 2
  return board
}

export function indexAt(row: number, column: number): number {
  return row * BOARD_SIZE + column
}

export function getFlips(board: Board, player: Player, move: number): number[] {
  if (move < 0 || move >= BOARD_CELLS || board[move] !== 0) return []

  const row = Math.floor(move / BOARD_SIZE)
  const column = move % BOARD_SIZE
  const other = opponent(player)
  const flips: number[] = []

  for (const [rowDelta, columnDelta] of directions) {
    const line: number[] = []
    let nextRow = row + rowDelta
    let nextColumn = column + columnDelta

    while (isOnBoard(nextRow, nextColumn)) {
      const index = indexAt(nextRow, nextColumn)
      if (board[index] === other) {
        line.push(index)
      } else {
        if (board[index] === player && line.length > 0) flips.push(...line)
        break
      }
      nextRow += rowDelta
      nextColumn += columnDelta
    }
  }

  return flips
}

export function getLegalMoves(board: Board, player: Player): number[] {
  const moves: number[] = []
  for (let index = 0; index < BOARD_CELLS; index += 1) {
    if (board[index] === 0 && getFlips(board, player, index).length > 0) moves.push(index)
  }
  return moves
}

export function applyMove(board: Board, player: Player, move: number): Board {
  const flips = getFlips(board, player, move)
  if (flips.length === 0) throw new Error(`Square ${coordinateName(move)} is not a legal move.`)

  const nextBoard = [...board]
  nextBoard[move] = player
  for (const index of flips) nextBoard[index] = player
  return nextBoard
}

export function resolveTurn(board: Board, playerWhoMoved: Player): TurnResolution {
  const nextPlayer = opponent(playerWhoMoved)
  if (getLegalMoves(board, nextPlayer).length > 0) {
    return { nextPlayer, passedPlayer: null, gameOver: false }
  }
  if (getLegalMoves(board, playerWhoMoved).length > 0) {
    return { nextPlayer: playerWhoMoved, passedPlayer: nextPlayer, gameOver: false }
  }
  return { nextPlayer, passedPlayer: null, gameOver: true }
}

export function countDiscs(board: Board): DiscCounts {
  let playerOne = 0
  let playerTwo = 0
  for (const disc of board) {
    if (disc === 1) playerOne += 1
    if (disc === 2) playerTwo += 1
  }
  return { playerOne, playerTwo, empty: BOARD_CELLS - playerOne - playerTwo }
}

export function winner(board: Board): Player | null {
  const counts = countDiscs(board)
  if (counts.playerOne === counts.playerTwo) return null
  return counts.playerOne > counts.playerTwo ? 1 : 2
}

export function coordinateName(index: number): string {
  if (index < 0 || index >= BOARD_CELLS) return 'off-board'
  return `${String.fromCharCode(65 + (index % BOARD_SIZE))}${Math.floor(index / BOARD_SIZE) + 1}`
}

function isOnBoard(row: number, column: number): boolean {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE
}
