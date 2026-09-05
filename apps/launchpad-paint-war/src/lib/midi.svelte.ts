import {
  LaunchpadRgbController,
  isWebMidiSupported,
  type LaunchpadControllerState,
  type LaunchpadPadEvent,
  type LaunchpadRgb,
  type MIDIOutput,
} from '@classroom-tools/launchpad-midi'

export type { LaunchpadPadEvent, LaunchpadRgb }

export const midiState = $state<LaunchpadControllerState>({
  status: 'idle',
  statusMessage: 'Play on screen, or connect a Launchpad to mirror the paint field.',
  inputs: [],
  outputs: [],
  selectedOutput: null,
})

let padEventCallback: ((event: LaunchpadPadEvent) => void) | null = null

const controller = new LaunchpadRgbController({
  storageKey: 'launchpad-paint-war-midi-output',
  idleMessage: 'Play on screen, or connect a Launchpad to mirror the paint field.',
  onStateChange: (state) => Object.assign(midiState, state),
  onPadEvent: (event) => padEventCallback?.(event),
})

export const noteMapping = controller.noteMapping
export const isMidiSupported = isWebMidiSupported
export const connect = () => controller.connect()
export const selectOutput = (outputId: string) => controller.selectOutput(outputId)
export const paintFrame = (frame: LaunchpadRgb[]) => controller.paintFrame(frame)
export const getOutputLabel = (output: MIDIOutput) => controller.getOutputLabel(output)
export const disposeMidi = () => controller.dispose()

export function hardwareReady(): boolean {
  void midiState.inputs.length
  void midiState.selectedOutput
  return controller.hardwareReady()
}

export function setPadEventCallback(callback: ((event: LaunchpadPadEvent) => void) | null): void {
  padEventCallback = callback
}
