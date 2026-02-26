import type { NoteMappingConfig } from './types.js'

/**
 * Builds a flat 64-element array of MIDI note numbers for an 8×8 grid.
 *
 * @param config  - Note mapping configuration (mode, startingNote, rowIncrement)
 * @param reverseRows - When true, row 7 is rendered first (top of grid = highest notes).
 *                     Used by Programmer Mode (WAM). Default false = row 0 first (Controller).
 */
export function buildNoteMapping(config: NoteMappingConfig, reverseRows = false): number[] {
  const { startingNote, rowIncrement, gridSize } = config
  const notes: number[] = []
  const rows = reverseRows
    ? Array.from({ length: gridSize }, (_, i) => gridSize - 1 - i)
    : Array.from({ length: gridSize }, (_, i) => i)

  for (const row of rows) {
    for (let col = 0; col < gridSize; col++) {
      notes.push(startingNote + row * rowIncrement + col)
    }
  }
  return notes
}

/** Returns the MIDI note for a given [row, col] pair (0-indexed, top-left origin). */
export function noteAt(row: number, col: number, config: NoteMappingConfig): number {
  return config.startingNote + row * config.rowIncrement + col
}
