import type { PlayVariation } from '../types'
import type { UndoState } from './editorTypes'

export function cloneVariation(variation: PlayVariation): PlayVariation {
  return structuredClone(variation)
}

export function createUndoState(): UndoState {
  return {
    past: [],
    future: [],
  }
}

export function pushUndoSnapshot(state: UndoState, variation: PlayVariation): UndoState {
  return {
    past: [...state.past, cloneVariation(variation)].slice(-80),
    future: [],
  }
}

export function undoVariation(state: UndoState, present: PlayVariation): {
  state: UndoState
  variation: PlayVariation
} | null {
  const previous = state.past.at(-1)
  if (!previous) return null

  return {
    variation: cloneVariation(previous),
    state: {
      past: state.past.slice(0, -1),
      future: [cloneVariation(present), ...state.future],
    },
  }
}

export function redoVariation(state: UndoState, present: PlayVariation): {
  state: UndoState
  variation: PlayVariation
} | null {
  const next = state.future[0]
  if (!next) return null

  return {
    variation: cloneVariation(next),
    state: {
      past: [...state.past, cloneVariation(present)],
      future: state.future.slice(1),
    },
  }
}
