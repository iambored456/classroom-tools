import {
  type MIDIAccess,
  type MIDIInput,
  type MIDIMessageEvent,
  requestMIDIAccess,
  buildNoteMapping,
  LIVE_MODE_CONFIG,
  isNoteOn,
  isNoteOff,
} from '@classroom-tools/launchpad-midi'
import { getOrCreateAudio } from './audio.svelte.ts'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

// Single reactive state object — Svelte 5 requires property mutation, not variable reassignment
export const midiState = $state({
  activePads: new Set<number>(),
  status: 'idle' as ConnectionStatus,
  statusMessage: 'Not connected',
  inputs: [] as MIDIInput[],
})

// Live Mode: row 0 at top, row 7 at bottom — matches original Controller app layout
export const noteMapping = buildNoteMapping(LIVE_MODE_CONFIG, false)

let midiAccess: MIDIAccess | null = null

export async function connect(): Promise<void> {
  midiState.status = 'connecting'
  midiState.statusMessage = 'Requesting MIDI access…'
  try {
    midiAccess = await requestMIDIAccess({ sysex: false })
    attachInputListeners(midiAccess)
    updateInputList(midiAccess)
    midiAccess.onstatechange = (e) => {
      if (!e.port) return
      if (e.port.type === 'input' && e.port.state === 'connected') {
        const port = e.port as MIDIInput
        port.onmidimessage = handleMessage
        updateInputList(midiAccess!)
      }
    }
    midiState.status = 'connected'
    midiState.statusMessage = `Connected — ${midiState.inputs.length} input(s) found`
  } catch (err) {
    midiState.status = 'error'
    midiState.statusMessage = err instanceof Error ? err.message : 'Unknown error'
  }
}

function attachInputListeners(access: MIDIAccess): void {
  for (const input of access.inputs.values()) {
    input.onmidimessage = handleMessage
  }
}

function updateInputList(access: MIDIAccess): void {
  midiState.inputs = [...access.inputs.values()]
}

function handleMessage(event: MIDIMessageEvent): void {
  const { data } = event
  const note = data[1]
  const audio = getOrCreateAudio()
  if (isNoteOn(data)) {
    midiState.activePads.add(note)
    audio.start(note)
  } else if (isNoteOff(data)) {
    midiState.activePads.delete(note)
    audio.stop(note)
  }
}
