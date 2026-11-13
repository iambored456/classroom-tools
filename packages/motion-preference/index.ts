export type MotionPreference = 'system' | 'full' | 'reduced'
export interface MotionState {
  preference: MotionPreference
  systemReducedMotion: boolean
  reducedMotion: boolean
}

export const motionStorageKey = 'classroom-tools.motion-preference'
const changeEvent = 'classroom-tools:motion-change'
const browser = typeof window === 'undefined' ? undefined : window
const media = browser?.matchMedia?.('(prefers-reduced-motion: reduce)')
const listeners = new Set<(state: MotionState) => void>()

const validPreference = (value: unknown): value is MotionPreference =>
  value === 'system' || value === 'full' || value === 'reduced'

function readStoredPreference(fallback: MotionPreference = 'system'): MotionPreference {
  try {
    const value = browser?.localStorage.getItem(motionStorageKey)
    return validPreference(value) ? value : 'system'
  } catch {
    return fallback
  }
}

let preference = readStoredPreference()

export function getMotionState(): MotionState {
  const systemReducedMotion = media?.matches ?? false
  return {
    preference,
    systemReducedMotion,
    reducedMotion: preference === 'system' ? systemReducedMotion : preference === 'reduced',
  }
}

export const shouldReduceMotion = () => getMotionState().reducedMotion

function publish() {
  const state = getMotionState()
  if (browser) {
    browser.document.documentElement.dataset.motionPreference = state.preference
    browser.document.documentElement.dataset.reducedMotion = String(state.reducedMotion)
    browser.dispatchEvent(new CustomEvent(changeEvent, { detail: state }))
  }
  listeners.forEach(listener => listener(state))
}

/** Apply immediately; false means this browser could not persist the choice. */
export function setMotionPreference(next: MotionPreference): boolean {
  if (!validPreference(next)) throw new Error('Unknown motion preference')
  preference = next
  let saved = false
  try {
    if (browser) {
      browser.localStorage.setItem(motionStorageKey, next)
      saved = true
    }
  } catch {
    // Keep the choice for this page and let the settings UI explain the limitation.
  }
  publish()
  return saved
}

/** Notify immediately, then on hub, other-tab, and device preference changes. */
export function watchMotionPreference(listener: (state: MotionState) => void): () => void {
  listeners.add(listener)
  listener(getMotionState())
  return () => { listeners.delete(listener) }
}

// One instance per app: importing this module also initializes the CSS preference.
// No browser APIs are replaced; apps explicitly use the resolved preference.
if (browser) {
  publish()
  media?.addEventListener('change', publish)
  browser.addEventListener('storage', event => {
    if (event.key !== motionStorageKey && event.key !== null) return
    preference = readStoredPreference(preference)
    publish()
  })
  browser.addEventListener('pageshow', () => {
    preference = readStoredPreference(preference)
    publish()
  })
}
