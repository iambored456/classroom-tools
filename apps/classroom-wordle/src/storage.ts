import { WORD_LENGTHS, type GameSettings, type WordLength, type WordLibrary, type WordSet } from './types'
import { createStarterLibrary, createStarterSets } from './words'

const LIBRARY_KEY = 'classroom-wordle-library-v2'
const SETTINGS_KEY = 'classroom-wordle-settings-v1'

const isWordLength = (value: unknown): value is WordLength =>
  typeof value === 'number' && WORD_LENGTHS.includes(value as WordLength)

const cleanSets = (value: unknown, length: WordLength): WordSet[] | null => {
  if (!Array.isArray(value)) return null

  const sets: WordSet[] = []
  let enabledSetFound = false
  for (const [index, candidate] of value.entries()) {
    if (!candidate || typeof candidate !== 'object') continue
    const raw = candidate as Partial<WordSet>
    if (typeof raw.text !== 'string') continue
    const requestedEnabled = raw.enabled === true
    const enabled = requestedEnabled && !enabledSetFound
    if (enabled) enabledSetFound = true
    sets.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : `saved-${length}-${index}`,
      label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : `Set ${String.fromCharCode(65 + index)}`,
      text: raw.text,
      enabled,
      starter: raw.starter === true,
    })
  }
  return sets.length > 0 ? sets : null
}

export const loadLibrary = (): WordLibrary => {
  const fallback = createStarterLibrary()
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? 'null') as Record<string, unknown> | null
    if (!parsed) return fallback
    return {
      3: cleanSets(parsed[3], 3) ?? fallback[3],
      4: cleanSets(parsed[4], 4) ?? fallback[4],
      5: cleanSets(parsed[5], 5) ?? fallback[5],
      6: cleanSets(parsed[6], 6) ?? fallback[6],
    }
  } catch {
    return fallback
  }
}

export const saveLibrary = (library: WordLibrary) => {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  } catch {
    // The game remains usable when browser storage is unavailable.
  }
}

export const resetBank = (library: WordLibrary, length: WordLength): WordLibrary => ({
  ...library,
  [length]: createStarterSets(length),
})

export const loadSettings = (): GameSettings => {
  const fallback: GameSettings = { wordLength: 5, guessLimit: 6, colorblindMode: true }
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<GameSettings> | null
    return {
      wordLength: isWordLength(parsed?.wordLength) ? parsed.wordLength : fallback.wordLength,
      guessLimit:
        typeof parsed?.guessLimit === 'number' && parsed.guessLimit >= 3 && parsed.guessLimit <= 10
          ? Math.round(parsed.guessLimit)
          : fallback.guessLimit,
      colorblindMode:
        typeof parsed?.colorblindMode === 'boolean'
          ? parsed.colorblindMode
          : fallback.colorblindMode,
    }
  } catch {
    return fallback
  }
}

export const saveSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // The default settings still work without storage.
  }
}
