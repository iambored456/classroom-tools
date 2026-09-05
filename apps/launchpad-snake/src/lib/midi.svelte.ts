import {
  type MIDIAccess,
  type MIDIConnectionEvent,
  type MIDIInput,
  type MIDIMessageEvent,
  type MIDIOutput,
  PROGRAMMER_MODE_CONFIG,
  SYSEX_LED_LIGHTING_HEADER,
  SYSEX_MAX_BRIGHTNESS,
  SYSEX_PROGRAMMER_MODE,
  buildNoteMapping,
  isNoteOn,
  requestMIDIAccess,
  sendMIDIMessage,
  sendNoteOff,
  sendNoteOn,
} from '@classroom-tools/launchpad-midi'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type LaunchpadRgb = readonly [red: number, green: number, blue: number]

export const noteMapping = buildNoteMapping(PROGRAMMER_MODE_CONFIG, true)

export const midiState = $state({
  status: 'idle' as ConnectionStatus,
  statusMessage: 'Play on screen, or connect a Launchpad for the full 8×8 experience.',
  inputs: [] as MIDIInput[],
  outputs: [] as MIDIOutput[],
  selectedOutput: null as MIDIOutput | null,
})

let midiAccess: MIDIAccess | null = null
let padPressCallback: ((note: number) => void) | null = null
let lastFrame: LaunchpadRgb[] = Array.from({ length: 64 }, () => [0, 0, 0] as const)
let initializationTimeout: ReturnType<typeof setTimeout> | null = null
const preferredOutputKey = 'launchpad-snake-midi-output'

export function isMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

export function setPadPressCallback(callback: ((note: number) => void) | null): void {
  padPressCallback = callback
}

export async function connect(): Promise<void> {
  if (midiState.status === 'connecting' || midiAccess) return
  midiState.status = 'connecting'
  midiState.statusMessage = 'Requesting MIDI access…'

  try {
    midiAccess = await requestMIDIAccess({ sysex: true })
    midiAccess.onstatechange = handleStateChange
    refreshPorts()
    midiState.status = 'connected'
    updateStatusMessage()
  } catch (error) {
    midiState.status = 'error'
    midiState.statusMessage =
      error instanceof Error ? error.message : 'The browser could not connect to MIDI.'
  }
}

export function selectOutput(outputId: string): void {
  const previousOutput = midiState.selectedOutput
  const nextOutput = midiState.outputs.find((output) => output.id === outputId) ?? null
  if (previousOutput && previousOutput.id !== nextOutput?.id) clearOutput(previousOutput)
  midiState.selectedOutput = nextOutput

  if (nextOutput) {
    rememberOutput(nextOutput)
    initializeOutput(nextOutput)
  }
  updateStatusMessage()
}

export function paintFrame(frame: LaunchpadRgb[]): void {
  lastFrame = frame.slice(0, noteMapping.length)
  const output = midiState.selectedOutput
  if (output) sendRgbFrame(output, lastFrame)
}

export function getOutputLabel(output: MIDIOutput): string {
  const name = output.name?.trim() || 'Unnamed MIDI output'
  return `${deviceLabel(output)} · ${name}${isLikelyGamePort(name) ? ' · game port' : ''}`
}

export function hardwareReady(): boolean {
  const output = midiState.selectedOutput
  return output !== null && midiState.inputs.some((input) => inputMatchesOutput(input, output))
}

export function disposeMidi(): void {
  if (initializationTimeout) clearTimeout(initializationTimeout)
  initializationTimeout = null
  if (midiState.selectedOutput) clearOutput(midiState.selectedOutput)
  for (const input of midiState.inputs) input.onmidimessage = null
  if (midiAccess) midiAccess.onstatechange = null
  midiAccess = null
  padPressCallback = null
}

function refreshPorts(): void {
  if (!midiAccess) return
  for (const input of midiState.inputs) input.onmidimessage = null

  const connectedInputs = [...midiAccess.inputs.values()].filter((port) => port.state === 'connected')
  const connectedOutputs = [...midiAccess.outputs.values()].filter((port) => port.state === 'connected')
  midiState.inputs = preferLaunchpadPorts(connectedInputs)
  midiState.outputs = preferLaunchpadPorts(connectedOutputs)

  for (const input of midiState.inputs) {
    input.onmidimessage = (event) => handleMessage(event, input)
  }

  const stillConnected = midiState.outputs.find((output) => output.id === midiState.selectedOutput?.id)
  if (stillConnected) {
    midiState.selectedOutput = stillConnected
    return
  }

  const preferred =
    recalledOutput(midiState.outputs) ??
    midiState.outputs.find((output) => isLikelyGamePort(output.name)) ??
    midiState.outputs[0] ??
    null
  midiState.selectedOutput = preferred
  if (preferred) initializeOutput(preferred)
}

function initializeOutput(output: MIDIOutput): void {
  if (initializationTimeout) clearTimeout(initializationTimeout)
  switchToProgrammerMode(output)
  if (isLaunchpadX(output.name)) sendMIDIMessage(output, SYSEX_MAX_BRIGHTNESS)
  initializationTimeout = setTimeout(() => {
    if (midiState.selectedOutput?.id === output.id) sendRgbFrame(output, lastFrame)
    initializationTimeout = null
  }, 300)
}

function switchToProgrammerMode(output: MIDIOutput): void {
  if (isLaunchpadX(output.name)) {
    sendMIDIMessage(output, SYSEX_PROGRAMMER_MODE)
  } else if (isLaunchpadProMk3(output.name)) {
    sendMIDIMessage(output, [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e, 0x0e, 0x01, 0xf7])
  } else if (isOriginalLaunchpadPro(output.name)) {
    sendMIDIMessage(output, [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x2c, 0x03, 0xf7])
  }
}

function sendRgbFrame(output: MIDIOutput, frame: LaunchpadRgb[]): void {
  const header = rgbHeader(output)
  if (!header) {
    frame.forEach((color, index) => {
      if (color[0] + color[1] + color[2] === 0) sendNoteOff(output, noteMapping[index])
      else sendNoteOn(output, noteMapping[index], nearestPaletteVelocity(color))
    })
    return
  }

  const message = [...header]
  const usesLightingType = !isOriginalLaunchpadPro(output.name)
  frame.forEach((color, index) => {
    const scaled = rgbForOutput(output, color)
    if (usesLightingType) message.push(3)
    message.push(noteMapping[index], scaled[0], scaled[1], scaled[2])
  })
  message.push(0xf7)
  sendMIDIMessage(output, message)
}

function clearOutput(output: MIDIOutput): void {
  for (const note of noteMapping) sendNoteOff(output, note)
}

function rgbHeader(output: MIDIOutput): number[] | null {
  if (isLaunchpadX(output.name)) return [...SYSEX_LED_LIGHTING_HEADER]
  if (isLaunchpadProMk3(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e, 0x03]
  if (isOriginalLaunchpadPro(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0b]
  return null
}

function rgbForOutput(output: MIDIOutput, color: LaunchpadRgb): LaunchpadRgb {
  const maximum = isOriginalLaunchpadPro(output.name) ? 63 : 127
  const scale = (component: number) => Math.round((Math.max(0, Math.min(127, component)) / 127) * maximum)
  return [scale(color[0]), scale(color[1]), scale(color[2])]
}

function nearestPaletteVelocity([red, green, blue]: LaunchpadRgb): number {
  if (red >= green && red >= blue) return green > 64 ? 9 : 5
  if (green >= red && green >= blue) return red > 64 ? 17 : 21
  return 45
}

function handleMessage(event: MIDIMessageEvent, input: MIDIInput): void {
  if (midiState.selectedOutput && !inputMatchesOutput(input, midiState.selectedOutput)) return
  const note = event.data?.[1]
  if (note !== undefined && noteMapping.includes(note) && isNoteOn(event.data)) padPressCallback?.(note)
}

function handleStateChange(_event: MIDIConnectionEvent): void {
  refreshPorts()
  updateStatusMessage()
}

function updateStatusMessage(): void {
  const output = midiState.selectedOutput
  if (output && hardwareReady()) {
    midiState.statusMessage = `${deviceLabel(output)} ready. The hardware grid now mirrors the browser.`
  } else if (midiState.inputs.length === 0 && !output) {
    midiState.statusMessage = 'MIDI access is on, but no connected Launchpad was found.'
  } else if (!output) {
    midiState.statusMessage = 'A MIDI input was found, but there is no lighting output.'
  } else if (midiState.inputs.length === 0) {
    midiState.statusMessage = 'Lighting is connected, but no pad input is available.'
  } else {
    midiState.statusMessage = 'Choose the Launchpad game port to pair pad presses and lights.'
  }
}

function deviceLabel(output: MIDIOutput): string {
  if (isLaunchpadX(output.name)) return 'Launchpad X'
  if (isLaunchpadProMk3(output.name)) return 'Launchpad Pro MK3'
  if (isOriginalLaunchpadPro(output.name)) return 'Launchpad Pro'
  return 'MIDI controller'
}

function isLaunchpadX(name: string | null): boolean {
  return /(?:\blpx\b|launchpad\s*x)/i.test(name ?? '')
}

function isLaunchpadProMk3(name: string | null): boolean {
  return /(?:lppro\s*mk3|launchpad\s*pro\s*(?:\[?mk3\]?|mk\s*3))/i.test(name ?? '')
}

function isOriginalLaunchpadPro(name: string | null): boolean {
  return /launchpad\s*pro/i.test(name ?? '') && !isLaunchpadProMk3(name)
}

function isLaunchpad(name: string | null): boolean {
  return isLaunchpadX(name) || isLaunchpadProMk3(name) || isOriginalLaunchpadPro(name)
}

function isLikelyGamePort(name: string | null): boolean {
  const value = name ?? ''
  if (isLaunchpadX(value)) {
    return /midi\s*(?:in|out)\s*2\b|\bport\s*2\b|\bmidi\s+(?:in|out)\b/i.test(value) && !/\bdaw\b/i.test(value)
  }
  if (isLaunchpadProMk3(value)) return /\bmidi\b/i.test(value) && !/\b(?:daw|din)\b/i.test(value)
  if (isOriginalLaunchpadPro(value)) return /stand\s*alone|midi\s*(?:in|out)\s*2|port\s*2/i.test(value)
  return false
}

function inputMatchesOutput(input: MIDIInput, output: MIDIOutput): boolean {
  if (isLaunchpadX(output.name)) return isLaunchpadX(input.name)
  if (isLaunchpadProMk3(output.name)) return isLaunchpadProMk3(input.name)
  if (isOriginalLaunchpadPro(output.name)) return isOriginalLaunchpadPro(input.name)
  return true
}

function preferLaunchpadPorts<T extends MIDIInput | MIDIOutput>(ports: T[]): T[] {
  const launchpadPorts = ports.filter((port) => isLaunchpad(port.name))
  return launchpadPorts.length > 0 ? launchpadPorts : ports
}

function outputSignature(output: MIDIOutput): string {
  return `${output.manufacturer ?? ''}\u0000${output.name ?? ''}`
}

function rememberOutput(output: MIDIOutput): void {
  try {
    localStorage.setItem(preferredOutputKey, outputSignature(output))
  } catch {
    // Persistence is optional when browser storage is unavailable.
  }
}

function recalledOutput(outputs: MIDIOutput[]): MIDIOutput | null {
  try {
    const signature = localStorage.getItem(preferredOutputKey)
    return outputs.find((output) => outputSignature(output) === signature) ?? null
  } catch {
    return null
  }
}
