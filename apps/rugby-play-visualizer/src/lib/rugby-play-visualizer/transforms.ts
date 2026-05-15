import type {
  BallPath,
  BranchLabel,
  PassEvent,
  PlayerDefinition,
  PlayerPath,
  PlayVariation,
  Point,
  TimedPoint,
} from './types'

export function mirrorPoint(point: Point): Point {
  return {
    x: 100 - point.x,
    y: point.y,
  }
}

export function mirrorTimedPoint(point: TimedPoint): TimedPoint {
  return {
    ...point,
    ...mirrorPoint(point),
  }
}

function mirrorPlayer(player: PlayerDefinition): PlayerDefinition {
  return {
    ...player,
    start: mirrorPoint(player.start),
  }
}

function mirrorPath(path: PlayerPath): PlayerPath {
  return {
    ...path,
    waypoints: path.waypoints.map(mirrorPoint),
  }
}

function mirrorBallPath(ballPath: BallPath | undefined): BallPath | undefined {
  if (!ballPath) return undefined

  return {
    ...ballPath,
    waypoints: ballPath.waypoints.map(mirrorPoint),
  }
}

function mirrorPass(pass: PassEvent): PassEvent {
  return {
    ...pass,
    ballPath: mirrorBallPath(pass.ballPath),
    labelOffset: pass.labelOffset
      ? {
          dx: -pass.labelOffset.dx,
          dy: pass.labelOffset.dy,
        }
      : undefined,
  }
}

function mirrorBranchLabel(label: BranchLabel): BranchLabel {
  return {
    ...label,
    at: mirrorPoint(label.at),
  }
}

export function mirrorVariation(variation: PlayVariation): PlayVariation {
  return {
    ...variation,
    players: variation.players.map(mirrorPlayer),
    playerPaths: variation.playerPaths.map(mirrorPath),
    passes: variation.passes.map(mirrorPass),
    branchLabels: variation.branchLabels?.map(mirrorBranchLabel),
  }
}
