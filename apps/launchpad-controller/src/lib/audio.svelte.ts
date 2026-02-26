import { OscillatorManager } from '@classroom-tools/launchpad-midi'

let manager: OscillatorManager | null = null

/** Returns the shared OscillatorManager, creating it on first call. */
export function getOrCreateAudio(): OscillatorManager {
  if (!manager) {
    const ctx = new AudioContext()
    manager = new OscillatorManager(ctx)
  }
  return manager
}

/** Resumes the AudioContext after a user gesture (required by browser autoplay policy). */
export function resumeAudio(): void {
  manager?.resume()
}
