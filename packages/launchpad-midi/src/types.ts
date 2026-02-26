// Web MIDI API surface types (avoids dependency on @types/web)

export interface MIDIAccess {
  readonly inputs: Map<string, MIDIInput>
  readonly outputs: Map<string, MIDIOutput>
  onstatechange: ((event: MIDIConnectionEvent) => void) | null
  readonly sysexEnabled: boolean
}

export interface MIDIPort {
  readonly id: string
  readonly name: string | null
  readonly manufacturer: string | null
  readonly type: 'input' | 'output'
  readonly state: 'connected' | 'disconnected'
}

export interface MIDIInput extends MIDIPort {
  readonly type: 'input'
  onmidimessage: ((event: MIDIMessageEvent) => void) | null
}

export interface MIDIOutput extends MIDIPort {
  readonly type: 'output'
  send(data: Uint8Array | number[]): void
}

export interface MIDIMessageEvent {
  readonly data: Uint8Array
}

export interface MIDIConnectionEvent {
  readonly port: MIDIPort | null
}

// Domain types

export type MIDIMode = 'live' | 'programmer'

export interface NoteMappingConfig {
  mode: MIDIMode
  startingNote: number
  rowIncrement: number
  gridSize: number
}

export interface PadColor {
  hex: string
  velocity: number
}

export interface OscillatorEntry {
  oscillator: OscillatorNode
  gainNode: GainNode
}
