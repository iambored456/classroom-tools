import type { OscillatorEntry } from './types.js'

/** Converts a MIDI note number to a frequency in Hz. */
export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12)
}

/**
 * Manages a pool of active oscillators keyed by MIDI note number.
 * Applies fade-in/fade-out to prevent audio clicks.
 */
export class OscillatorManager {
  private readonly ctx: AudioContext
  private readonly active = new Map<number, OscillatorEntry>()

  constructor(ctx: AudioContext) {
    this.ctx = ctx
  }

  start(note: number, type: OscillatorType = 'sine'): void {
    if (this.active.has(note)) return

    const oscillator = this.ctx.createOscillator()
    const gainNode = this.ctx.createGain()

    oscillator.frequency.value = midiToFrequency(note)
    oscillator.type = type
    oscillator.connect(gainNode)
    gainNode.connect(this.ctx.destination)

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.01)

    oscillator.start()
    this.active.set(note, { oscillator, gainNode })
  }

  stop(note: number): void {
    const entry = this.active.get(note)
    if (!entry) return
    entry.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.01)
    entry.oscillator.stop(this.ctx.currentTime + 0.02)
    this.active.delete(note)
  }

  stopAll(): void {
    for (const note of [...this.active.keys()]) {
      this.stop(note)
    }
  }

  resume(): void {
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
  }
}
