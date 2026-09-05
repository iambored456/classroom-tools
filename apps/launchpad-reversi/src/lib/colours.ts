import type { LaunchpadRgb } from './midi.svelte.ts'

export const defaultPlayerColours = ['#65f5bd', '#ff725e'] as const

export function hexToLaunchpadRgb(hex: string): LaunchpadRgb {
  const normalized = normalizeHex(hex)
  return [
    toLaunchpadChannel(Number.parseInt(normalized.slice(1, 3), 16)),
    toLaunchpadChannel(Number.parseInt(normalized.slice(3, 5), 16)),
    toLaunchpadChannel(Number.parseInt(normalized.slice(5, 7), 16)),
  ]
}

export function colourDistance(first: string, second: string): number {
  const a = hexToRgb(first)
  const b = hexToRgb(second)
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function mostContrastingColour(colour: string): string {
  const candidates = [
    '#65f5bd', '#ff725e', '#63c7ff', '#c985ff', '#f7d84a', '#ff4fa3',
    '#73ff63', '#ff9c45', '#f1f4ff', '#4f67ff', '#00d7c6', '#e6ff4c',
  ]
  return candidates.reduce((best, candidate) =>
    colourDistance(colour, candidate) > colourDistance(colour, best) ? candidate : best,
  )
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = normalizeHex(hex)
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ]
}

function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'
}

function toLaunchpadChannel(channel: number): number {
  return Math.round((channel / 255) * 127)
}
