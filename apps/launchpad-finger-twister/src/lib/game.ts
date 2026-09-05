export const CELL_COUNT = 64

export type TwisterPlayer = 1 | 2
export type TwisterMode = 'local' | 'solo'
export type HandMode = 'one' | 'two'
export type TargetOwners = Array<0 | TwisterPlayer>

export type NextTarget = {
  index: number
  player: TwisterPlayer
  nextPlayer: TwisterPlayer
}

export function targetLimit(handMode: HandMode): number {
  return handMode === 'one' ? 5 : 10
}

export function createEmptyTargets(): TargetOwners {
  return Array<0 | TwisterPlayer>(CELL_COUNT).fill(0)
}

export function countTargets(owners: TargetOwners): { playerOne: number; playerTwo: number } {
  let playerOne = 0
  let playerTwo = 0
  for (const owner of owners) {
    if (owner === 1) playerOne += 1
    if (owner === 2) playerTwo += 1
  }
  return { playerOne, playerTwo }
}

export function chooseNextTarget(
  owners: TargetOwners,
  mode: TwisterMode,
  requestedPlayer: TwisterPlayer,
  limit: number,
  random: () => number = Math.random,
): NextTarget | null {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('Finger limit must be between 1 and 10.')
  }

  const counts = countTargets(owners)
  let player: TwisterPlayer = mode === 'solo' ? 1 : requestedPlayer

  if (mode === 'solo') {
    if (counts.playerOne >= limit) return null
  } else {
    const requestedCount = player === 1 ? counts.playerOne : counts.playerTwo
    if (requestedCount >= limit) player = player === 1 ? 2 : 1
    const fallbackCount = player === 1 ? counts.playerOne : counts.playerTwo
    if (fallbackCount >= limit) return null
  }

  const free = owners.flatMap((owner, index) => owner === 0 ? [index] : [])
  if (free.length === 0) return null
  const freeIndex = Math.min(free.length - 1, Math.floor(random() * free.length))
  return {
    index: free[freeIndex],
    player,
    nextPlayer: mode === 'solo' ? 1 : player === 1 ? 2 : 1,
  }
}

export function addTarget(owners: TargetOwners, target: NextTarget): TargetOwners {
  if (target.index < 0 || target.index >= CELL_COUNT || owners[target.index] !== 0) {
    throw new Error('New Finger Twister target must use an empty pad.')
  }
  const next = [...owners]
  next[target.index] = target.player
  return next
}
