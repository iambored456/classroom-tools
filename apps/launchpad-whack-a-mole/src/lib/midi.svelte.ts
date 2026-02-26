import {
  type MIDIAccess,
  type MIDIInput,
  type MIDIOutput,
  type MIDIMessageEvent,
  type MIDIConnectionEvent,
  requestMIDIAccess,
  buildNoteMapping,
  PROGRAMMER_MODE_CONFIG,
  SYSEX_PROGRAMMER_MODE,
  sendMIDIMessage,
  sendNoteOn,
  sendNoteOff,
  isNoteOn,
} from '@classroom-tools/launchpad-midi'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

// Single reactive state object — Svelte 5 requires property mutation, not variable reassignment
export const midiState = $state({
  status: 'idle' as ConnectionStatus,
  statusMessage: 'Status: Not Connected',
  outputs: [] as MIDIOutput[],
  selectedOutput: null as MIDIOutput | null,
})

// Programmer Mode: row 7 first (top of grid = highest notes), matching original layout
export const noteMapping = buildNoteMapping(PROGRAMMER_MODE_CONFIG, true)

let midiAccess: MIDIAccess | null = null

// Registered by App.svelte after both modules are initialized
let onNotePressed: ((note: number) => void) | null = null

export function setNoteCallback(cb: (note: number) => void): void {
  onNotePressed = cb
}

export async function connect(): Promise<void> {
  midiState.status = 'connecting'
  midiState.statusMessage = 'Requesting MIDI access…'
  try {
    midiAccess = await requestMIDIAccess({ sysex: true })
    populateOutputs(midiAccess)
    attachInputListeners(midiAccess)
    midiAccess.onstatechange = (e: MIDIConnectionEvent) => {
      if (!e.port) return
      if (e.port.type === 'input' && e.port.state === 'connected') {
        ;(e.port as MIDIInput).onmidimessage = handleMessage
      }
      if (e.port.type === 'output') {
        populateOutputs(midiAccess!)
      }
    }
    midiState.status = 'connected'
  } catch (err) {
    midiState.status = 'error'
    midiState.statusMessage = err instanceof Error ? err.message : 'Unknown error'
  }
}

export function selectOutput(index: number): void {
  if (!midiAccess) return
  const all = [...midiAccess.outputs.values()]
  if (index >= 0 && index < all.length) {
    midiState.selectedOutput = all[index]
    midiState.statusMessage = `Connected to: ${midiState.selectedOutput.name}`
    switchToProgrammerMode()
    setTimeout(() => {
      clearAllPads()
    }, 500)
  } else {
    midiState.selectedOutput = null
    midiState.statusMessage = 'Selected MIDI output not found.'
  }
}

export function lightPad(note: number, velocity: number, channel = 0): void {
  if (!midiState.selectedOutput) return
  sendNoteOn(midiState.selectedOutput, note, velocity, channel)
}

export function turnOffPad(note: number): void {
  if (!midiState.selectedOutput) return
  sendNoteOff(midiState.selectedOutput, note)
}

export function clearAllPads(): void {
  for (const note of noteMapping) {
    turnOffPad(note)
  }
}

export function switchToProgrammerMode(): void {
  if (!midiState.selectedOutput) return
  sendMIDIMessage(midiState.selectedOutput, SYSEX_PROGRAMMER_MODE)
}

function populateOutputs(access: MIDIAccess): void {
  const all = [...access.outputs.values()]
  midiState.outputs = all
  if (all.length > 0 && !midiState.selectedOutput) {
    midiState.selectedOutput = all[0]
    midiState.statusMessage = `Connected to: ${midiState.selectedOutput.name}`
    switchToProgrammerMode()
    setTimeout(() => {
      clearAllPads()
    }, 500)
  } else if (all.length === 0) {
    midiState.statusMessage = 'No MIDI output devices found.'
  }
}

function attachInputListeners(access: MIDIAccess): void {
  for (const input of access.inputs.values()) {
    input.onmidimessage = handleMessage
  }
}

function handleMessage(event: MIDIMessageEvent): void {
  if (!event.data) return
  const { data } = event
  const note = data[1]
  if (isNoteOn(data) && note !== undefined) {
    onNotePressed?.(note)
  }
}
