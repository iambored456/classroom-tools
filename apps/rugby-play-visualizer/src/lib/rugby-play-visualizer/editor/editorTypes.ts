import type { Point, PlayVariation } from '../types'

export type Mode = 'view' | 'editor'

export type EditorTool =
  | 'select'
  | 'move-player'
  | 'draw-player-path'
  | 'edit-player-path'
  | 'add-pass'
  | 'edit-ball-path'
  | 'erase'

export type SelectedItem =
  | { type: 'player'; playerId: string }
  | { type: 'player-waypoint'; playerId: string; waypointIndex: number }
  | { type: 'pass'; passId: string }
  | { type: 'ball-waypoint'; passId: string; waypointIndex: number }
  | null

export type DraftPlayerPath = {
  playerId: string
  waypoints: Point[]
}

export type DraftPass = {
  fromPlayerId: string | null
}

export type UndoState = {
  past: PlayVariation[]
  future: PlayVariation[]
}

export const PLAYER_PACE_PRESETS = {
  verySlow: 5,
  slow: 8,
  normal: 12,
  fast: 16,
  veryFast: 20,
} as const
