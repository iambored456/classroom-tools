import { createStarterGroups } from './groups'
import { DIFFICULTIES, type WordGroup } from './types'

const STORAGE_KEY = 'classroom-connections:library:v1'
const SESSION_PLAYED_GROUPS_KEY = 'classroom-connections:played-groups:v1'

const isWordGroup = (value: unknown): value is WordGroup => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WordGroup>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.words) &&
    candidate.words.length === 4 &&
    candidate.words.every((word) => typeof word === 'string') &&
    DIFFICULTIES.includes(candidate.difficulty as (typeof DIFFICULTIES)[number]) &&
    typeof candidate.enabled === 'boolean' &&
    typeof candidate.custom === 'boolean'
  )
}

export const loadGroups = (): WordGroup[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createStarterGroups()

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isWordGroup)) return createStarterGroups()
    const savedGroups = parsed.map((group) => ({ ...group, words: [...group.words] }))
    const savedGroupIds = new Set(savedGroups.map((group) => group.id))
    const newStarterGroups = createStarterGroups().filter((group) => !savedGroupIds.has(group.id))
    const mergedGroups = [...savedGroups, ...newStarterGroups]

    if (newStarterGroups.length > 0) saveGroups(mergedGroups)
    return mergedGroups
  } catch {
    return createStarterGroups()
  }
}

export const saveGroups = (groups: WordGroup[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // The game still works for this session when storage is unavailable.
  }
}

export const loadSessionPlayedGroupIds = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(SESSION_PLAYED_GROUPS_KEY)
    if (!raw) return new Set()

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) return new Set()
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

export const saveSessionPlayedGroupIds = (groupIds: Set<string>): void => {
  try {
    sessionStorage.setItem(SESSION_PLAYED_GROUPS_KEY, JSON.stringify([...groupIds]))
  } catch {
    // The rotation still works until this page is closed when session storage is unavailable.
  }
}

export const resetGroups = (): WordGroup[] => {
  const groups = createStarterGroups()
  saveGroups(groups)
  return groups
}
