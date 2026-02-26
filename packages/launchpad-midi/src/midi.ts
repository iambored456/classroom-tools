import type { MIDIAccess, MIDIOutput } from './types.js'

export interface MIDIAccessOptions {
  sysex?: boolean
}

/** Prompts the browser for MIDI access. Rejects with a descriptive error message. */
export async function requestMIDIAccess(options: MIDIAccessOptions = {}): Promise<MIDIAccess> {
  if (!navigator.requestMIDIAccess) {
    throw new Error('Web MIDI API is not supported in this browser.')
  }
  return navigator.requestMIDIAccess(options) as unknown as Promise<MIDIAccess>
}

/** Sends a raw MIDI message to the given output. */
export function sendMIDIMessage(output: MIDIOutput, message: number[]): void {
  try {
    output.send(new Uint8Array(message))
  } catch (error) {
    console.error('Failed to send MIDI message:', error)
  }
}

/** Sends a Note On message on the given channel (0-indexed, default 0). */
export function sendNoteOn(output: MIDIOutput, note: number, velocity: number, channel = 0): void {
  sendMIDIMessage(output, [0x90 | (channel & 0x0f), note, velocity])
}

/** Sends a Note Off message. */
export function sendNoteOff(output: MIDIOutput, note: number): void {
  sendMIDIMessage(output, [0x80, note, 0])
}

/** Returns true if the MIDI data represents a Note On event (velocity > 0). */
export function isNoteOn(data: Uint8Array): boolean {
  return (data[0] & 0xf0) === 0x90 && data[2] > 0
}

/** Returns true if the MIDI data represents a Note Off event. */
export function isNoteOff(data: Uint8Array): boolean {
  return (data[0] & 0xf0) === 0x80 || ((data[0] & 0xf0) === 0x90 && data[2] === 0)
}
