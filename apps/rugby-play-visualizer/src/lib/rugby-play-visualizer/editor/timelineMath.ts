export const TIME_SNAP = 0.1

export function snapTime(value: number): number {
  return Math.round(value / TIME_SNAP) * TIME_SNAP
}

export function clampTime(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
