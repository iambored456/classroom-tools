/**
 * Normalized rugby field coordinate system.
 *
 * The SVG field uses viewBox="0 0 100 100".
 * x: 0 is left, 100 is right.
 * y: 0 is the top try line area, 100 is the bottom try line area.
 *
 * The attacking team moves up the screen, so attacking movement generally
 * means decreasing y values.
 */
export type Point = {
  x: number
  y: number
}

export type PathPoint = Point

export type TimedPoint = Point & {
  t: number
}

export type PlayerDefinition = {
  id: string
  number: number
  label?: string
  start: Point
}

export type PlayerPath = {
  playerId: string
  waypoints: PathPoint[]
  startT: number
  pace: number
  interpolation: 'linear'
}

export type TimedPlayerPath = {
  playerId: string
  points: TimedPoint[]
}

export type BallPath = {
  waypoints: PathPoint[]
  interpolation: 'linear'
}

export type LabelOffset = {
  dx: number
  dy: number
}

export type PassEvent = {
  id: string
  from: string
  to: string
  startT: number
  endT: number
  label?: string
  branchId?: string
  ballPath?: BallPath
  labelOffset?: LabelOffset
}

export type BranchDefinition = {
  id: string
  name: string
  description: string
  enabledFromT?: number
}

export type BranchLabel = {
  id: string
  text: string
  at: Point
  t?: number
  branchId?: string
}

export type PlayVariation = {
  id: string
  name: string
  description: string
  duration: number
  branchId: string
  initialBallCarrierId: string
  players: PlayerDefinition[]
  playerPaths: PlayerPath[]
  passes: PassEvent[]
  branchLabels?: BranchLabel[]
}

export type PlayFamily = {
  id: string
  name: string
  description: string
  branches?: BranchDefinition[]
  variations: PlayVariation[]
}

export type RugbyPlayDocument = {
  schemaVersion: 1
  playFamilies: PlayFamily[]
}
