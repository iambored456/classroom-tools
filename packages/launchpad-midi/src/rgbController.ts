import {
  PROGRAMMER_MODE_CONFIG,
  SYSEX_LED_LIGHTING_HEADER,
  SYSEX_MAX_BRIGHTNESS,
  SYSEX_PROGRAMMER_MODE,
} from './constants.js'
import {
  isNoteOff,
  isNoteOn,
  requestMIDIAccess,
  sendMIDIMessage,
  sendNoteOff,
  sendNoteOn,
} from './midi.js'
import { buildNoteMapping } from './noteMapping.js'
import type {
  MIDIAccess,
  MIDIConnectionEvent,
  MIDIInput,
  MIDIMessageEvent,
  MIDIOutput,
} from './types.js'

export type LaunchpadRgb = readonly [red: number, green: number, blue: number]
export type LaunchpadConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type LaunchpadControllerState = {
  status: LaunchpadConnectionStatus
  statusMessage: string
  inputs: MIDIInput[]
  outputs: MIDIOutput[]
  selectedOutput: MIDIOutput | null
}

export type LaunchpadPadEvent = {
  index: number
  note: number
  pressed: boolean
  velocity: number
}

export type LaunchpadRgbControllerOptions = {
  storageKey: string
  idleMessage?: string
  onStateChange: (state: LaunchpadControllerState) => void
  onPadEvent: (event: LaunchpadPadEvent) => void
}

export const launchpadNoteMapping = buildNoteMapping(PROGRAMMER_MODE_CONFIG, true)

export function isWebMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
}

export function hexToLaunchpadRgb(hex: string): LaunchpadRgb {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'
  const channel = (start: number) => Math.round((Number.parseInt(normalized.slice(start, start + 2), 16) / 255) * 127)
  return [channel(1), channel(3), channel(5)]
}

export class LaunchpadRgbController {
  readonly noteMapping = launchpadNoteMapping

  private readonly options: LaunchpadRgbControllerOptions
  private midiAccess: MIDIAccess | null = null
  private initializationTimeout: ReturnType<typeof setTimeout> | null = null
  private lastFrame: LaunchpadRgb[] = Array.from({ length: 64 }, () => [0, 0, 0] as const)
  private state: LaunchpadControllerState

  constructor(options: LaunchpadRgbControllerOptions) {
    this.options = options
    this.state = {
      status: 'idle',
      statusMessage: options.idleMessage ?? 'Play on screen, or connect a Launchpad to mirror the board.',
      inputs: [],
      outputs: [],
      selectedOutput: null,
    }
    this.emitState()
  }

  get snapshot(): LaunchpadControllerState {
    return {
      ...this.state,
      inputs: [...this.state.inputs],
      outputs: [...this.state.outputs],
    }
  }

  async connect(): Promise<void> {
    if (this.state.status === 'connecting' || this.midiAccess) return
    this.state.status = 'connecting'
    this.state.statusMessage = 'Requesting MIDI access…'
    this.emitState()

    try {
      this.midiAccess = await requestMIDIAccess({ sysex: true })
      this.midiAccess.onstatechange = this.handleStateChange
      this.refreshPorts()
      this.state.status = 'connected'
      this.updateStatusMessage()
      this.emitState()
    } catch (error) {
      this.state.status = 'error'
      this.state.statusMessage = error instanceof Error
        ? error.message
        : 'The browser could not connect to MIDI.'
      this.emitState()
    }
  }

  selectOutput(outputId: string): void {
    const previous = this.state.selectedOutput
    const next = this.state.outputs.find((output) => output.id === outputId) ?? null
    if (previous && previous.id !== next?.id) this.clearOutput(previous)
    this.state.selectedOutput = next
    if (next) {
      this.rememberOutput(next)
      this.initializeOutput(next)
    }
    this.updateStatusMessage()
    this.emitState()
  }

  paintFrame(frame: LaunchpadRgb[]): void {
    this.lastFrame = Array.from({ length: 64 }, (_, index) => frame[index] ?? [0, 0, 0])
    if (this.state.selectedOutput) this.sendRgbFrame(this.state.selectedOutput, this.lastFrame)
  }

  hardwareReady(): boolean {
    const output = this.state.selectedOutput
    return output !== null && this.state.inputs.some((input) => inputMatchesOutput(input, output))
  }

  getOutputLabel(output: MIDIOutput): string {
    const name = output.name?.trim() || 'Unnamed MIDI output'
    return `${deviceLabel(output)} · ${name}${isLikelyGamePort(name) ? ' · game port' : ''}`
  }

  dispose(): void {
    if (this.initializationTimeout) clearTimeout(this.initializationTimeout)
    this.initializationTimeout = null
    if (this.state.selectedOutput) this.clearOutput(this.state.selectedOutput)
    for (const input of this.state.inputs) input.onmidimessage = null
    if (this.midiAccess) this.midiAccess.onstatechange = null
    this.midiAccess = null
    this.state = {
      status: 'idle',
      statusMessage: this.options.idleMessage ?? 'Play on screen, or connect a Launchpad to mirror the board.',
      inputs: [],
      outputs: [],
      selectedOutput: null,
    }
    this.emitState()
  }

  private readonly handleStateChange = (_event: MIDIConnectionEvent): void => {
    this.refreshPorts()
    this.updateStatusMessage()
    this.emitState()
  }

  private refreshPorts(): void {
    if (!this.midiAccess) return
    for (const input of this.state.inputs) input.onmidimessage = null

    const inputs = [...this.midiAccess.inputs.values()].filter((port) => port.state === 'connected')
    const outputs = [...this.midiAccess.outputs.values()].filter((port) => port.state === 'connected')
    this.state.inputs = preferLaunchpadPorts(inputs)
    this.state.outputs = preferLaunchpadPorts(outputs)
    for (const input of this.state.inputs) {
      input.onmidimessage = (event) => this.handleMessage(event, input)
    }

    const current = this.state.outputs.find((output) => output.id === this.state.selectedOutput?.id)
    if (current) {
      this.state.selectedOutput = current
      return
    }

    const preferred = this.recalledOutput(this.state.outputs)
      ?? this.state.outputs.find((output) => isLikelyGamePort(output.name))
      ?? this.state.outputs[0]
      ?? null
    this.state.selectedOutput = preferred
    if (preferred) this.initializeOutput(preferred)
  }

  private initializeOutput(output: MIDIOutput): void {
    if (this.initializationTimeout) clearTimeout(this.initializationTimeout)
    switchToProgrammerMode(output)
    if (isLaunchpadX(output.name)) sendMIDIMessage(output, SYSEX_MAX_BRIGHTNESS)
    this.initializationTimeout = setTimeout(() => {
      if (this.state.selectedOutput?.id === output.id) this.sendRgbFrame(output, this.lastFrame)
      this.initializationTimeout = null
    }, 300)
  }

  private sendRgbFrame(output: MIDIOutput, frame: LaunchpadRgb[]): void {
    const header = rgbHeader(output)
    if (!header) {
      frame.forEach((colour, index) => {
        if (colour[0] + colour[1] + colour[2] === 0) sendNoteOff(output, this.noteMapping[index])
        else sendNoteOn(output, this.noteMapping[index], nearestPaletteVelocity(colour))
      })
      return
    }

    const message = [...header]
    const usesLightingType = !isOriginalLaunchpadPro(output.name)
    frame.forEach((colour, index) => {
      const scaled = rgbForOutput(output, colour)
      if (usesLightingType) message.push(3)
      message.push(this.noteMapping[index], scaled[0], scaled[1], scaled[2])
    })
    message.push(0xf7)
    sendMIDIMessage(output, message)
  }

  private clearOutput(output: MIDIOutput): void {
    for (const note of this.noteMapping) sendNoteOff(output, note)
  }

  private handleMessage(event: MIDIMessageEvent, input: MIDIInput): void {
    if (this.state.selectedOutput && !inputMatchesOutput(input, this.state.selectedOutput)) return
    const note = event.data?.[1]
    if (note === undefined) return
    const index = this.noteMapping.indexOf(note)
    if (index < 0) return

    if (isNoteOn(event.data)) {
      this.options.onPadEvent({ index, note, pressed: true, velocity: event.data[2] ?? 0 })
    } else if (isNoteOff(event.data)) {
      this.options.onPadEvent({ index, note, pressed: false, velocity: 0 })
    }
  }

  private updateStatusMessage(): void {
    const output = this.state.selectedOutput
    if (output && this.hardwareReady()) {
      this.state.statusMessage = rgbHeader(output)
        ? `${deviceLabel(output)} ready. The 8 by 8 board is mirrored.`
        : `${deviceLabel(output)} ready. Colours use the closest available palette.`
    } else if (this.state.inputs.length === 0 && !output) {
      this.state.statusMessage = 'MIDI access is on, but no connected Launchpad was found.'
    } else if (!output) {
      this.state.statusMessage = 'A MIDI input was found, but there is no lighting output.'
    } else if (this.state.inputs.length === 0) {
      this.state.statusMessage = 'Lighting is connected, but no pad input is available.'
    } else {
      this.state.statusMessage = 'Choose the Launchpad game port to pair pad presses and lights.'
    }
  }

  private rememberOutput(output: MIDIOutput): void {
    try {
      localStorage.setItem(this.options.storageKey, outputSignature(output))
    } catch {
      // Output persistence is optional.
    }
  }

  private recalledOutput(outputs: MIDIOutput[]): MIDIOutput | null {
    try {
      const signature = localStorage.getItem(this.options.storageKey)
      return outputs.find((output) => outputSignature(output) === signature) ?? null
    } catch {
      return null
    }
  }

  private emitState(): void {
    this.options.onStateChange(this.snapshot)
  }
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

function rgbHeader(output: MIDIOutput): number[] | null {
  if (isLaunchpadX(output.name)) return [...SYSEX_LED_LIGHTING_HEADER]
  if (isLaunchpadProMk3(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e, 0x03]
  if (isOriginalLaunchpadPro(output.name)) return [0xf0, 0x00, 0x20, 0x29, 0x02, 0x10, 0x0b]
  return null
}

function rgbForOutput(output: MIDIOutput, colour: LaunchpadRgb): LaunchpadRgb {
  const maximum = isOriginalLaunchpadPro(output.name) ? 63 : 127
  const scale = (component: number) => Math.round((Math.max(0, Math.min(127, component)) / 127) * maximum)
  return [scale(colour[0]), scale(colour[1]), scale(colour[2])]
}

function nearestPaletteVelocity([red, green, blue]: LaunchpadRgb): number {
  if (red >= green && red >= blue) return green > 64 ? 9 : 5
  if (green >= red && green >= blue) return red > 64 ? 17 : 21
  return 45
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
  if (isLaunchpadX(value)) return /midi\s*(?:in|out)\s*2|\bport\s*2|\bmidi\s+(?:in|out)\b/i.test(value) && !/\bdaw\b/i.test(value)
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
  if (launchpadPorts.length === 0) return ports
  const gamePorts = launchpadPorts.filter((port) => isLikelyGamePort(port.name))
  return gamePorts.length > 0 ? gamePorts : launchpadPorts
}

function outputSignature(output: MIDIOutput): string {
  return `${output.manufacturer ?? ''}\u0000${output.name ?? ''}`
}
