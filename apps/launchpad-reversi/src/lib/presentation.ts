import {
  BOARD_CELLS,
  type Board,
  type DiscCounts,
  type Player,
} from './reversi.ts'

export type GameMode = 'local' | 'computer'
export type EndgamePhase = 'playing' | 'flash-board' | 'flash-off' | 'score'

export const endgameSteps: ReadonlyArray<{
  phase: Exclude<EndgamePhase, 'playing'>
  duration: number
}> = [
  { phase: 'flash-off', duration: 160 },
  { phase: 'flash-board', duration: 240 },
  { phase: 'flash-off', duration: 160 },
  { phase: 'flash-board', duration: 240 },
  { phase: 'flash-off', duration: 160 },
  { phase: 'flash-board', duration: 300 },
  { phase: 'score', duration: 0 },
]

export const aiMoveFlashSteps: ReadonlyArray<{
  hidden: boolean
  duration: number
}> = [
  { hidden: true, duration: 140 },
  { hidden: false, duration: 180 },
  { hidden: true, duration: 140 },
  { hidden: false, duration: 180 },
]

export function shouldShowLegalMoves(
  gameOver: boolean,
  gameMode: GameMode,
  currentPlayer: Player,
): boolean {
  return !gameOver && !(gameMode === 'computer' && currentPlayer === 2)
}

export function createScoreDisplayBoard(counts: DiscCounts): Board {
  const { playerOne, playerTwo } = counts
  const validCounts = [playerOne, playerTwo].every(
    (count) => Number.isInteger(count) && count >= 0,
  ) && playerOne + playerTwo <= BOARD_CELLS

  if (!validCounts) throw new Error('Score display counts must fit on the 8 by 8 board.')

  const display = Array<0 | 1 | 2>(BOARD_CELLS).fill(0)
  display.fill(1, 0, playerOne)
  display.fill(2, BOARD_CELLS - playerTwo)
  return display
}
