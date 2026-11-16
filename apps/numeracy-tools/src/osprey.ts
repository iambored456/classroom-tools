import type { graphGeometry, Quadratic } from './zeros-cannonball'

export type AnimationMode = 'cannonball' | 'osprey' | 'rollercoaster'
export function equationForAnimation(equation: Quadratic, mode: AnimationMode): Quadratic {
  const sign = mode === 'osprey' && equation.a < 0 ? -1 : 1
  return { a: sign * equation.a, b: sign * equation.b || 0, c: sign * equation.c || 0 }
}

// All poses use the same timeline, including when paused, scrubbed, or replayed.
export function ospreyPose(graph: ReturnType<typeof graphGeometry>, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const phase = t < .16 ? 'approach' : t < .48 ? 'dive' : t < .56 ? 'catch' : t < .84 ? 'swim' : 'fly-away'
  const curveProgress = t < .16 ? 0 : t < .48 ? (t - .16) / .32 * .5 : t < .56 ? .5 : t < .84 ? .5 + (t - .56) / .28 * .5 : 1
  const position = graph.point(curveProgress)
  const before = graph.point(Math.max(0, curveProgress - .001))
  const after = graph.point(Math.min(1, curveProgress + .001))
  let angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI
  let x = position.x, y = position.y
  if (phase === 'approach') {
    const approach = t / .16
    x -= 40 * (1 - approach)
    y -= 30 * (1 - approach)
    angle = 37 + (angle - 37) * approach
  }
  if (phase === 'fly-away') {
    const depart = (t - .84) / .16
    x += 105 * depart
    y -= 105 * depart
    angle += (-25 - angle) * depart
  }
  const carryingFish = t >= .52
  const wing = phase === 'dive' ? 55 : phase === 'catch' ? 30 : Math.sin(t * Math.PI * 36) * (phase === 'swim' ? 22 : 35)
  const splash = (at: number) => Math.max(0, 1 - Math.abs(t - at) / .055)
  return { x, y, angle, phase, curveProgress, carryingFish, wing, opacity: Math.min(1, (1 - t) / .04), entrySplash: splash(.16), exitSplash: splash(.84) }
}
