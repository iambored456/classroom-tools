import type { Point, TimedPoint } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function interpolateNumber(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

export function interpolatePoint(start: Point, end: Point, progress: number): Point {
  const normalizedProgress = clamp(progress, 0, 1)

  return {
    x: interpolateNumber(start.x, end.x, normalizedProgress),
    y: interpolateNumber(start.y, end.y, normalizedProgress),
  }
}

export function getPositionAtTimedPoints(points: TimedPoint[], t: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  const orderedPoints = [...points].sort((a, b) => a.t - b.t)
  const firstPoint = orderedPoints[0]
  const finalPoint = orderedPoints[orderedPoints.length - 1]

  if (t <= firstPoint.t) {
    return { x: firstPoint.x, y: firstPoint.y }
  }

  if (t >= finalPoint.t) {
    return { x: finalPoint.x, y: finalPoint.y }
  }

  for (let index = 0; index < orderedPoints.length - 1; index += 1) {
    const current = orderedPoints[index]
    const next = orderedPoints[index + 1]

    if (t >= current.t && t <= next.t) {
      const segmentDuration = next.t - current.t
      const progress = segmentDuration === 0 ? 1 : (t - current.t) / segmentDuration
      return interpolatePoint(current, next, progress)
    }
  }

  return { x: finalPoint.x, y: finalPoint.y }
}
