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
  SYSEX_MAX_BRIGHTNESS,
  SYSEX_LED_LIGHTING_HEADER,
  sendMIDIMessage,
  sendNoteOn,
  sendNoteOff,
  isNoteOn,
  isNoteOff,
} from '@classroom-tools/launchpad-midi'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export const midiState = $state({
  status: 'idle' as ConnectionStatus,
  statusMessage: 'On-screen play is ready. Connect a Launchpad X or Pro for hardware play.',
  inputs: [] as MIDIInput[],
  outputs: [] as MIDIOutput[],
  selectedOutput: null as MIDIOutput | null,
})

// Programmer Mode, with the top row first to match the physical Launchpad.
export const noteMapping = buildNoteMapping(PROGRAMMER_MODE_CONFIG, true)

let midiAccess: MIDIAccess | null = null
let initializationTimeout: ReturnType<typeof setTimeout> | null = null
let connectionFeedbackTimeouts: ReturnType<typeof setTimeout>[] = []
let connectionFeedbackActive = false
let connectionFeedbackAllowed = true
let idlePadFeedbackAllowed = true
let onNotePressed: ((note: number) => void) | null = null

const PREFERRED_OUTPUT_KEY = 'launchpad-whack-a-mole-midi-output'

export type LaunchpadRgb = readonly [red: number, green: number, blue: number]

export type RgbPadLighting = {
  note: number
  color: LaunchpadRgb
}

const BRIGHT_IDLE_COLORS: LaunchpadRgb[] = [
  [127, 0, 0],
  [127, 42, 0],
  [127, 105, 0],
  [0, 127, 22],
  [0, 105, 127],
  [0, 42, 127],
  [75, 0, 127],
  [127, 0, 88],
]

export function setNoteCallback(callback: ((note: number) => void) | null): void {
  onNotePressed = callback
}

export function isMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

export async function connect(): Promise<void> {
  if (midiState.status === 'connecting' || midiAccess) return
  midiState.status = 'connecting'
  midiState.statusMessage = 'Requesting MIDI access...'

  try {
    midiAccess = await requestMIDIAccess({ sysex: true })
    refreshPorts()
    midiAccess.onstatechange = handleStateChange
    midiState.status = 'connected'
    updateStatusMessage()
  } catch (error) {
    midiState.status = 'error'
    midiState.statusMessage =
      error instanceof Error ? error.message : 'The browser could not connect to MIDI.'
  }
}

export function selectOutput(outputId: string): void {
  const output = midiState.outputs.find((candidate) => candidate.id === outputId) ?? null
  const previousOutput = midiState.selectedOutput
  cancelConnectionFeedback()
  if (previousOutput && previousOutput.id !== output?.id) clearOutputPads(previousOutput)
  midiState.selectedOutput = output
  if (output) {
    rememberOutput(output)
    initializeOutput(output)
  }
  updateStatusMessage()
}

export function getOutputLabel(output: MIDIOutput): string {
  const deviceName = getDeviceLabel(output)
  const nativeName = output.name?.trim() || 'Unnamed MIDI output'
  const recommendation = isLikelyGamePort(output.name) ? ' (likely game port)' : ''
  return `${deviceName}: ${nativeName}${recommendation}`
}

export function getDeviceLabel(output: MIDIOutput | null): string {
  if (isLaunchpadXPort(output?.name ?? null)) return 'Launchpad X'
  if (isLaunchpadProMk3Port(output?.name ?? null)) return 'Launchpad Pro MK3'
  if (isLaunchpadProPort(output?.name ?? null)) return 'Launchpad Pro'
  return output ? 'MIDI controller' : 'Launchpad X or Pro'
}

export function isSelectedHardwareReady(): boolean {
  const output = midiState.selectedOutput
  return output !== null && midiState.inputs.some((input) => inputMatchesOutput(input, output))
}

export function testSelectedOutput(): void {
  const output = midiState.selectedOutput
  if (!output || !connectionFeedbackAllowed) return
  cancelConnectionFeedback()
  clearOutputPads(output)
  showConnectionFeedback(output)
}

export function lightPad(note: number, velocity: number, channel = 0): void {
  if (midiState.selectedOutput) sendNoteOn(midiState.selectedOutput, note, velocity, channel)
}

export function lightPadsRgb(pads: RgbPadLighting[]): void {
  if (midiState.selectedOutput) sendRgbPadColors(midiState.selectedOutput, pads)
}

export function turnOffPad(note: number): void {
  if (midiState.selectedOutput) sendNoteOff(midiState.selectedOutput, note)
}

export function clearAllPads(): void {
  for (const note of noteMapping) turnOffPad(note)
}

export function cancelConnectionFeedback(): void {
  const shouldClearFrame = connectionFeedbackActive
  if (initializationTimeout !== null) clearTimeout(initializationTimeout)
  initializationTimeout = null
  for (const timeout of connectionFeedbackTimeouts) clearTimeout(timeout)
  connectionFeedbackTimeouts = []
  connectionFeedbackActive = false
  if (shouldClearFrame && midiState.selectedOutput) clearOutputPads(midiState.selectedOutput)
}

export function setConnectionFeedbackAllowed(allowed: boolean): void {
  connectionFeedbackAllowed = allowed
  if (!allowed) cancelConnectionFeedback()
}

export function setIdlePadFeedbackAllowed(allowed: boolean): void {
  idlePadFeedbackAllowed = allowed
}

function switchToProgrammerMode(output: MIDIOutput): void {
  if (isLaunchpadXPort(output.name)) {
    sendMIDIMessage(output, SYSEX_PROGRAMMER_MODE)
  } else if (isLaunchpadProMk3Port(output.name)) {
    sendMIDIMessage(output, [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e, 0x0e, 0x01, 0xf7])
  } else if (isOriginalLaunchpadProPort(output.name)) {
    sendMIDIMessage(output, [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x2c, 0x03, 0xf7])
  }
}

function initializeOutput(output: MIDIOutput): void {
  switchToProgrammerMode(output)
  if (isLaunchpadXPort(output.name)) sendMIDIMessage(output, SYSEX_MAX_BRIGHTNESS)
  initializationTimeout = setTimeout(() => {
    if (midiState.selectedOutput?.id === output.id) {
      clearOutputPads(output)
      if (connectionFeedbackAllowed) showConnectionFeedback(output)
    }
    initializationTimeout = null
  }, 300)
}

function clearOutputPads(output: MIDIOutput): void {
  for (const note of noteMapping) sendNoteOff(output, note)
}

function sendRgbPads(output: MIDIOutput, notes: number[], color: LaunchpadRgb): void {
  sendRgbPadColors(
    output,
    notes.map((note) => ({ note, color })),
  )
}

function sendRgbPadColors(output: MIDIOutput, pads: RgbPadLighting[]): void {
  const message = getRgbHeader(output)
  if (!message) {
    for (const pad of pads) sendNoteOn(output, pad.note, nearestPaletteVelocity(pad.color))
    return
  }

  const usesLightingType = !isOriginalLaunchpadProPort(output.name)
  for (const pad of pads) {
    const color = rgbForOutput(output, pad.color)
    if (usesLightingType) message.push(3)
    message.push(pad.note, color[0], color[1], color[2])
  }
  message.push(0xf7)
  sendMIDIMessage(output, message)
}

function rgbForOutput(output: MIDIOutput, color: LaunchpadRgb): LaunchpadRgb {
  const maximum = isOriginalLaunchpadProPort(output.name) ? 63 : 127
  const scale = (component: number) =>
    Math.round((Math.max(0, Math.min(127, component)) / 127) * maximum)
  return [scale(color[0]), scale(color[1]), scale(color[2])]
}

function getRgbHeader(output: MIDIOutput): number[] | null {
  if (isLaunchpadXPort(output.name)) return [...SYSEX_LED_LIGHTING_HEADER]
  if (isLaunchpadProMk3Port(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e, 0x03]
  if (isOriginalLaunchpadProPort(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0b]
  return null
}

function nearestPaletteVelocity([red, green, blue]: LaunchpadRgb): number {
  if (red >= green && red >= blue) return blue > 64 ? 57 : green > 64 ? 9 : 5
  if (green >= red && green >= blue) return blue > 64 ? 29 : 21
  return red > 64 ? 53 : 45
}

function randomBrightColor(): LaunchpadRgb {
  return BRIGHT_IDLE_COLORS[Math.floor(Math.random() * BRIGHT_IDLE_COLORS.length)]
}

function scheduleConnectionFrame(callback: () => void, delay: number): void {
  connectionFeedbackTimeouts.push(setTimeout(callback, delay))
}

function showConnectionFeedback(output: MIDIOutput): void {
  // Two short full-brightness RGB pulses are immediate and do not depend on a MIDI clock.
  connectionFeedbackActive = true
  sendRgbPads(output, noteMapping, [0, 127, 24])
  scheduleConnectionFrame(() => clearOutputPads(output), 130)
  scheduleConnectionFrame(() => sendRgbPads(output, noteMapping, [0, 82, 127]), 235)
  scheduleConnectionFrame(() => {
    clearOutputPads(output)
    connectionFeedbackActive = false
    connectionFeedbackTimeouts = []
  }, 390)
}

function isLaunchpadXPort(name: string | null): boolean {
  return /(?:\blpx\b|launchpad\s*x)/i.test(name ?? '')
}

function isLaunchpadProMk3Port(name: string | null): boolean {
  return /(?:lppro\s*mk3|launchpad\s*pro\s*(?:\[?mk3\]?|mk\s*3))/i.test(name ?? '')
}

function isLaunchpadProPort(name: string | null): boolean {
  return isLaunchpadProMk3Port(name) || /launchpad\s*pro/i.test(name ?? '')
}

function isOriginalLaunchpadProPort(name: string | null): boolean {
  return isLaunchpadProPort(name) && !isLaunchpadProMk3Port(name)
}

function isLaunchpadPort(name: string | null): boolean {
  return isLaunchpadXPort(name) || isLaunchpadProPort(name)
}

function inputMatchesOutput(input: MIDIInput, output: MIDIOutput): boolean {
  if (isLaunchpadXPort(output.name)) return isLaunchpadXPort(input.name)
  if (isLaunchpadProMk3Port(output.name)) return isLaunchpadProMk3Port(input.name)
  if (isOriginalLaunchpadProPort(output.name)) return isOriginalLaunchpadProPort(input.name)
  return true
}

function isLaunchpadXGamePort(name: string | null): boolean {
  if (!isLaunchpadXPort(name)) return false
  const portName = name ?? ''

  // Windows exposes the Programmer/lighting interface as MIDIIN/MIDIOUT 2.
  // Other platforms generally distinguish it as the MIDI port rather than the DAW port.
  return (
    /midi\s*(?:in|out)\s*2\b/i.test(portName) ||
    /\bport\s*2\b/i.test(portName) ||
    (/\bmidi\s+(?:in|out)\b/i.test(portName) && !/\bdaw\b/i.test(portName))
  )
}

function isLaunchpadProMk3GamePort(name: string | null): boolean {
  if (!isLaunchpadProMk3Port(name)) return false
  const portName = name ?? ''
  return /\bmidi\b/i.test(portName) && !/\b(?:daw|din)\b/i.test(portName)
}

function isOriginalLaunchpadProGamePort(name: string | null): boolean {
  if (!isOriginalLaunchpadProPort(name)) return false
  return /\bstand\s*alone\b|midi\s*(?:in|out)\s*2\b|\bport\s*2\b/i.test(name ?? '')
}

function isLikelyGamePort(name: string | null): boolean {
  return (
    isLaunchpadXGamePort(name) ||
    isLaunchpadProMk3GamePort(name) ||
    isOriginalLaunchpadProGamePort(name)
  )
}

function preferLaunchpadPorts<T extends MIDIInput | MIDIOutput>(ports: T[]): T[] {
  const launchpadPorts = ports.filter((port) => isLaunchpadPort(port.name))
  return launchpadPorts.length > 0 ? launchpadPorts : ports
}

function outputSignature(output: MIDIOutput): string {
  return `${output.manufacturer ?? ''}\u0000${output.name ?? ''}`
}

function rememberOutput(output: MIDIOutput): void {
  try {
    localStorage.setItem(PREFERRED_OUTPUT_KEY, outputSignature(output))
  } catch {
    // Selection persistence is optional when storage is unavailable.
  }
}

function recalledOutput(outputs: MIDIOutput[]): MIDIOutput | null {
  try {
    const signature = localStorage.getItem(PREFERRED_OUTPUT_KEY)
    return outputs.find((output) => outputSignature(output) === signature) ?? null
  } catch {
    return null
  }
}

function refreshPorts(): void {
  if (!midiAccess) return

  const connectedInputs = [...midiAccess.inputs.values()].filter((input) => input.state === 'connected')
  const connectedOutputs = [...midiAccess.outputs.values()].filter((output) => output.state === 'connected')
  for (const input of midiState.inputs) input.onmidimessage = null
  midiState.inputs = preferLaunchpadPorts(connectedInputs)
  midiState.outputs = preferLaunchpadPorts(connectedOutputs)
  for (const input of midiState.inputs) {
    input.onmidimessage = (event) => handleMessage(event, input)
  }

  const currentOutput = midiState.outputs.find((output) => output.id === midiState.selectedOutput?.id)
  if (currentOutput) {
    midiState.selectedOutput = currentOutput
    return
  }

  const preferredOutput =
    recalledOutput(midiState.outputs) ??
    midiState.outputs.find((output) => isLikelyGamePort(output.name)) ??
    midiState.outputs.find((output) => isLaunchpadXPort(output.name)) ??
    midiState.outputs.find((output) => isLaunchpadProPort(output.name)) ??
    midiState.outputs[0] ??
    null
  cancelConnectionFeedback()
  midiState.selectedOutput = preferredOutput
  if (preferredOutput) initializeOutput(preferredOutput)
}

function updateStatusMessage(): void {
  const inputCount = midiState.inputs.length
  const outputCount = midiState.outputs.length
  const output = midiState.selectedOutput

  if (output && isSelectedHardwareReady()) {
    const outputWord = outputCount === 1 ? 'output' : 'outputs'
    midiState.statusMessage = `${outputCount} ${outputWord} found. Selected: ${getOutputLabel(output)}. Use "Flash selected output" to verify it.`
  } else if (inputCount === 0 && !output) {
    midiState.statusMessage = 'MIDI access granted, but no connected device was found.'
  } else if (inputCount === 0) {
    midiState.statusMessage = 'MIDI output found, but no input is available for pad presses.'
  } else if (output) {
    midiState.statusMessage = 'The selected output has no matching Launchpad input. Try another port.'
  } else {
    midiState.statusMessage = 'MIDI input found, but no output is available for pad lights.'
  }
}

function handleStateChange(_event: MIDIConnectionEvent): void {
  refreshPorts()
  updateStatusMessage()
}

function handleMessage(event: MIDIMessageEvent, input: MIDIInput): void {
  if (midiState.selectedOutput && !inputMatchesOutput(input, midiState.selectedOutput)) return
  const note = event.data?.[1]
  if (note === undefined) return

  if (isNoteOn(event.data)) {
    if (idlePadFeedbackAllowed && noteMapping.includes(note) && midiState.selectedOutput) {
      cancelConnectionFeedback()
      sendRgbPads(midiState.selectedOutput, [note], randomBrightColor())
    }
    onNotePressed?.(note)
    return
  }

  if (idlePadFeedbackAllowed && noteMapping.includes(note) && isNoteOff(event.data)) {
    turnOffPad(note)
  }
}

export function disposeMidi(): void {
  cancelConnectionFeedback()
  clearAllPads()
  for (const input of midiState.inputs) input.onmidimessage = null
  if (midiAccess) midiAccess.onstatechange = null
  midiAccess = null
  onNotePressed = null
}
