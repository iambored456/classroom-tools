import {
  applyMove,
  countDiscs,
  getLegalMoves,
  opponent,
  type Board,
  type Player,
} from './reversi.ts'

export type AiDifficulty = 'easy' | 'medium' | 'hard'

const positionalWeights = [
  120, -28, 18, 8, 8, 18, -28, 120,
  -28, -45, -6, -4, -4, -6, -45, -28,
  18, -6, 10, 2, 2, 10, -6, 18,
  8, -4, 2, 1, 1, 2, -4, 8,
  8, -4, 2, 1, 1, 2, -4, 8,
  18, -6, 10, 2, 2, 10, -6, 18,
  -28, -45, -6, -4, -4, -6, -45, -28,
  120, -28, 18, 8, 8, 18, -28, 120,
]

const corners = new Set([0, 7, 56, 63])
const searchTimedOut = Symbol('search-timed-out')

export function chooseAiMove(
  board: Board,
  player: Player,
  difficulty: AiDifficulty,
  random: () => number = Math.random,
): number | null {
  const legalMoves = getLegalMoves(board, player)
  if (legalMoves.length === 0) return null
  if (difficulty === 'easy') {
    return legalMoves[Math.min(legalMoves.length - 1, Math.floor(random() * legalMoves.length))]
  }

  const orderedMoves = orderMoves(legalMoves)
  if (difficulty === 'medium') return bestMoveAtDepth(board, player, orderedMoves, 3, Infinity)

  let bestMove = orderedMoves[0]
  const deadline = Date.now() + 450
  for (const depth of [3, 4, 5, 6]) {
    try {
      bestMove = bestMoveAtDepth(board, player, orderedMoves, depth, deadline)
    } catch (error) {
      if (error !== searchTimedOut) throw error
      break
    }
  }
  return bestMove
}

function bestMoveAtDepth(
  board: Board,
  player: Player,
  moves: number[],
  depth: number,
  deadline: number,
): number {
  let bestMove = moves[0]
  let bestScore = -Infinity

  for (const move of moves) {
    checkDeadline(deadline)
    const score = minimax(
      applyMove(board, player, move),
      opponent(player),
      player,
      depth - 1,
      -Infinity,
      Infinity,
      deadline,
    )
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }
  return bestMove
}

function minimax(
  board: Board,
  currentPlayer: Player,
  rootPlayer: Player,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
): number {
  checkDeadline(deadline)
  const moves = getLegalMoves(board, currentPlayer)
  const otherMoves = moves.length === 0 ? getLegalMoves(board, opponent(currentPlayer)) : []
  const gameOver = moves.length === 0 && otherMoves.length === 0

  if (gameOver) return terminalScore(board, rootPlayer)
  if (depth <= 0) return evaluateBoard(board, rootPlayer)
  if (moves.length === 0) {
    return minimax(board, opponent(currentPlayer), rootPlayer, depth, alpha, beta, deadline)
  }

  const maximizing = currentPlayer === rootPlayer
  let value = maximizing ? -Infinity : Infinity
  for (const move of orderMoves(moves)) {
    const childValue = minimax(
      applyMove(board, currentPlayer, move),
      opponent(currentPlayer),
      rootPlayer,
      depth - 1,
      alpha,
      beta,
      deadline,
    )
    if (maximizing) {
      value = Math.max(value, childValue)
      alpha = Math.max(alpha, value)
    } else {
      value = Math.min(value, childValue)
      beta = Math.min(beta, value)
    }
    if (beta <= alpha) break
  }
  return value
}

function evaluateBoard(board: Board, player: Player): number {
  const other = opponent(player)
  const counts = countDiscs(board)
  const ownDiscs = player === 1 ? counts.playerOne : counts.playerTwo
  const otherDiscs = player === 1 ? counts.playerTwo : counts.playerOne
  const discWeight = counts.empty > 40 ? -1 : counts.empty > 16 ? 3 : 14
  const mobility = getLegalMoves(board, player).length - getLegalMoves(board, other).length
  let positional = 0
  let cornerScore = 0

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === player) {
      positional += positionalWeights[index]
      if (corners.has(index)) cornerScore += 1
    } else if (board[index] === other) {
      positional -= positionalWeights[index]
      if (corners.has(index)) cornerScore -= 1
    }
  }

  return cornerScore * 80 + mobility * 10 + positional * 2 + (ownDiscs - otherDiscs) * discWeight
}

function terminalScore(board: Board, player: Player): number {
  const counts = countDiscs(board)
  const difference = player === 1
    ? counts.playerOne - counts.playerTwo
    : counts.playerTwo - counts.playerOne
  if (difference === 0) return 0
  return Math.sign(difference) * 1_000_000 + difference
}

function orderMoves(moves: number[]): number[] {
  return [...moves].sort((a, b) => positionalWeights[b] - positionalWeights[a])
}

function checkDeadline(deadline: number): void {
  if (Date.now() > deadline) throw searchTimedOut
}
