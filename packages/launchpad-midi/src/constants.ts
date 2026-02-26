import type { NoteMappingConfig, PadColor } from './types.js'

// Live Mode — original Controller app (start 36, row offset 16)
export const LIVE_MODE_CONFIG: NoteMappingConfig = {
  mode: 'live',
  startingNote: 36,
  rowIncrement: 16,
  gridSize: 8,
}

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

// 12-color palette used for the Whack-a-Mole game, keyed by MIDI velocity
export const COLOR_PALETTE: PadColor[] = [
  { hex: '#f090ae', velocity: 10 },
  { hex: '#f59383', velocity: 20 },
  { hex: '#ea9e5e', velocity: 30 },
  { hex: '#d0ae4e', velocity: 40 },
  { hex: '#a8bd61', velocity: 50 },
  { hex: '#76c788', velocity: 60 },
  { hex: '#41cbb5', velocity: 70 },
  { hex: '#33c6dc', velocity: 80 },
  { hex: '#62bbf7', velocity: 90 },
  { hex: '#94adff', velocity: 100 },
  { hex: '#bea0f3', velocity: 110 },
  { hex: '#dd95d6', velocity: 120 },
]
