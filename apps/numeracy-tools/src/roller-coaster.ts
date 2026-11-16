import type { graphGeometry } from './zeros-cannonball'

export function coasterPose(graph: ReturnType<typeof graphGeometry>, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const point = graph.point(t)
  const start = graph.point(0), middle = graph.point(.5), end = graph.point(1)
  // Exact tangent of the quadratic in screen coordinates. The car stays above
  // the track for either opening direction instead of turning upside down.
  const dx = end.x - start.x
  const dy = 4 * (middle.y - start.y) * (1 - 2 * t)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  // Approximate distance travelled for wheel rotation, independent of frame rate.
  let distance = 0, previous = start
  for (let i = 1; i <= 40; i++) {
    const next = graph.point(t * i / 40)
    distance += Math.hypot(next.x - previous.x, next.y - previous.y)
    previous = next
  }
  return { ...point, angle, wheelAngle: distance / 6 * 180 / Math.PI }
}
