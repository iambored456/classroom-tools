import type { NoteMappingConfig, PadColor } from './types.js'

// Programmer Mode — Launchpad X (notes 11–88, row increment 10)
export const PROGRAMMER_MODE_CONFIG: NoteMappingConfig = {
  mode: 'programmer',
  startingNote: 11,
  rowIncrement: 10,
  gridSize: 8,
}

// SysEx command to switch the Launchpad X into Programmer Mode
export const SYSEX_PROGRAMMER_MODE: number[] = [
  0xf0, 0x00, 0x20, 0x29, 0x02, 0x0c, 0x0e, 0x01, 0xf7,
]

// Launchpad X global LED brightness at its maximum value (127).
export const SYSEX_MAX_BRIGHTNESS: number[] = [
  0xf0, 0x00, 0x20, 0x29, 0x02, 0x0c, 0x08, 0x7f, 0xf7,
]

// Prefix for bulk RGB LED messages. Append colour specs and the terminating 0xf7 byte.
export const SYSEX_LED_LIGHTING_HEADER: number[] = [
  0xf0, 0x00, 0x20, 0x29, 0x02, 0x0c, 0x03,
]

// 12-color palette used for the Whack-a-Mole game, keyed by MIDI velocity
export const COLOR_PALETTE: PadColor[] = [
  { hex: '#f090ae', velocity: 61 },
  { hex: '#f59383', velocity: 5 },
  { hex: '#ea9e5e', velocity: 9 },
  { hex: '#d0ae4e', velocity: 13 },
  { hex: '#a8bd61', velocity: 17 },
  { hex: '#76c788', velocity: 21 },
  { hex: '#41cbb5', velocity: 29 },
  { hex: '#33c6dc', velocity: 37 },
  { hex: '#62bbf7', velocity: 41 },
  { hex: '#94adff', velocity: 45 },
  { hex: '#bea0f3', velocity: 53 },
  { hex: '#dd95d6', velocity: 57 },
]
