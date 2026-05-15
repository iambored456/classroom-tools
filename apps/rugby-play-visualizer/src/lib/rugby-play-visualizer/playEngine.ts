import { clamp, interpolatePoint } from './interpolation'
import type { PassEvent, PlayerPath, PlayVariation, Point, TimedPlayerPath } from './types'

export function getDistance(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

export function getPolylineLength(points: Point[]): number {
  return points.reduce((total, point, index) => {
    if (index === 0) return total
    return total + getDistance(points[index - 1], point)
  }, 0)
}

export function getPointAlongPolyline(points: Point[], progress: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  if (points.length === 1) {
    return { ...points[0] }
  }

  const normalizedProgress = clamp(progress, 0, 1)
  const totalLength = getPolylineLength(points)
  if (totalLength <= 0) {
    return { ...points[points.length - 1] }
  }

  let remainingDistance = totalLength * normalizedProgress

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    const segmentLength = getDistance(start, end)

    if (segmentLength === 0) {
      continue
    }

    if (remainingDistance <= segmentLength) {
      return interpolatePoint(start, end, remainingDistance / segmentLength)
    }

    remainingDistance -= segmentLength
  }

  return { ...points[points.length - 1] }
}

export function deriveTimedPathFromPace(path: PlayerPath): TimedPlayerPath {
  let elapsed = path.startT

  return {
    playerId: path.playerId,
    points: path.waypoints.map((point, index) => {
      if (index > 0) {
        const segmentDistance = getDistance(path.waypoints[index - 1], point)
        elapsed += segmentDistance / Math.max(path.pace, 0.001)
      }

      return {
        ...point,
        t: elapsed,
      }
    }),
  }
}

export function getPlayerPositionAtTime(path: PlayerPath, t: number): Point {
  if (path.waypoints.length === 0) {
    return { x: 0, y: 0 }
  }

  if (path.waypoints.length === 1 || t <= path.startT) {
    return { ...path.waypoints[0] }
  }

  const distanceToTravel = (t - path.startT) * Math.max(path.pace, 0)
  const totalLength = getPolylineLength(path.waypoints)

  if (totalLength <= 0 || distanceToTravel >= totalLength) {
    return { ...path.waypoints[path.waypoints.length - 1] }
  }

  return getPointAlongPolyline(path.waypoints, distanceToTravel / totalLength)
}

export function getPlayerPositionFromVariation(
  variation: PlayVariation,
  playerId: string,
  t: number,
): Point {
  const path = variation.playerPaths.find((candidate) => candidate.playerId === playerId)
  if (path) {
    return getPlayerPositionAtTime(path, t)
  }

  const player = variation.players.find((candidate) => candidate.id === playerId)
  return player?.start ?? { x: 0, y: 0 }
}

export function getAllPlayerPositionsAtTime(
  variation: PlayVariation,
  t: number,
): Record<string, Point> {
  return Object.fromEntries(
    variation.players.map((player) => [
      player.id,
      getPlayerPositionFromVariation(variation, player.id, t),
    ]),
  )
}

export function getActivePassAtTime(variation: PlayVariation, t: number): PassEvent | null {
  return (
    [...variation.passes]
      .sort((a, b) => a.startT - b.startT)
      .find((pass) => t >= pass.startT && t <= pass.endT) ?? null
  )
}

export function getBallCarrierAtTime(variation: PlayVariation, t: number): string | null {
  if (getActivePassAtTime(variation, t)) {
    return null
  }

  const orderedPasses = [...variation.passes].sort((a, b) => a.endT - b.endT)
  const completedPass = [...orderedPasses].reverse().find((pass) => pass.endT < t)

  if (completedPass) {
    return completedPass.to
  }

  return variation.initialBallCarrierId ?? orderedPasses[0]?.from ?? variation.players[0]?.id ?? null
}

export function getPassPolyline(variation: PlayVariation, pass: PassEvent): Point[] {
  const start = getPlayerPositionFromVariation(variation, pass.from, pass.startT)
  const end = getPlayerPositionFromVariation(variation, pass.to, pass.endT)
  return [start, ...(pass.ballPath?.waypoints ?? []), end]
}

export function getBallPositionAtTime(variation: PlayVariation, t: number): Point {
  const activePass = getActivePassAtTime(variation, t)

  if (activePass) {
    const progress = clamp(
      (t - activePass.startT) / Math.max(activePass.endT - activePass.startT, 0.001),
      0,
      1,
    )

    return getPointAlongPolyline(getPassPolyline(variation, activePass), progress)
  }

  const carrierId = getBallCarrierAtTime(variation, t)
  if (!carrierId) {
    return variation.players[0]?.start ?? { x: 0, y: 0 }
  }

  return getPlayerPositionFromVariation(variation, carrierId, t)
}
