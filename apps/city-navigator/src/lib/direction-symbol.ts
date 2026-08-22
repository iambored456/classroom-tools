import type { Command } from './types'

export interface CombinedDirectionSymbol {
  path: string
  pathTransform?: string
  letter: string
  letterX: number
  letterY: number
}

const STRAIGHT_ARROW = 'M9.5 30 V15 H2.5 L16 1.5 L29.5 15 H22.5 V30 Z'
// A broad, sweeping turn arrow keeps the letter inside the arrow body at small sizes.
const TURN_ARROW = 'M1.5 16 L11 3 V9.5 C21.5 10.5 28 17 30 29 C24.5 24 18.5 21.5 11 21.5 V29 Z'
const UTURN_ARROW = 'M29 29 H18 V16 C18 11.5 17 9 14 9 C11 9 10 11.5 10 16 V19 H15 L7 29 L-1 19 H4 V16 C4 7.5 8.5 3 15 3 C23.5 3 29 8 29 16 Z'

const LETTERS: Record<Command, string> = {
  forward: 'F',
  left: 'L',
  right: 'R',
  uturn: 'U',
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',
}

export function combinedDirectionSymbol(command: Command): CombinedDirectionSymbol {
  if (command === 'left') {
    return { path: TURN_ARROW, letter: LETTERS[command], letterX: 11.5, letterY: 16.5 }
  }
  if (command === 'right') {
    return {
      path: TURN_ARROW,
      pathTransform: 'translate(32 0) scale(-1 1)',
      letter: LETTERS[command],
      letterX: 20.5,
      letterY: 16.5,
    }
  }
  if (command === 'uturn') {
    return { path: UTURN_ARROW, letter: LETTERS[command], letterX: 23.5, letterY: 24.5 }
  }

  const rotation = command === 'east' ? 90 : command === 'south' ? 180 : command === 'west' ? 270 : 0
  const letterPosition = command === 'east'
    ? { x: 9.5, y: 16 }
    : command === 'south'
      ? { x: 16, y: 9.5 }
      : command === 'west'
        ? { x: 22.5, y: 16 }
        : { x: 16, y: 22.5 }

  return {
    path: STRAIGHT_ARROW,
    pathTransform: rotation ? `rotate(${rotation} 16 16)` : undefined,
    letter: LETTERS[command],
    letterX: letterPosition.x,
    letterY: letterPosition.y,
  }
}
