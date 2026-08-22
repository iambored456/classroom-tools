import { validateLibrary } from './domain'
import type { DirectionMode, LibraryData, RepresentationMode } from './types'

const DB_NAME = 'city-routes-classroom'
const STORE_NAME = 'content'
const LIBRARY_KEY = 'library-v1'
const PREFS_KEY = 'city-routes-preferences-v1'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadLibrary(): Promise<LibraryData | null> {
  try {
    const db = await openDatabase()
    return await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(LIBRARY_KEY)
      request.onsuccess = () => resolve(validateLibrary(request.result) ? request.result : null)
      request.onerror = () => resolve(null)
      transaction.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

export async function saveLibrary(data: LibraryData): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(data, LIBRARY_KEY)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

export function loadPreferences(): {
  directionMode: DirectionMode
  representation: RepresentationMode
} {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, unknown>
    return {
      directionMode: parsed.directionMode === 'relative' ? 'relative' : 'cardinal',
      representation:
        parsed.representation === 'arrows' || parsed.representation === 'letters-arrows'
          ? parsed.representation
          : 'letters',
    }
  } catch {
    return { directionMode: 'cardinal', representation: 'letters' }
  }
}

export function savePreferences(
  directionMode: DirectionMode,
  representation: RepresentationMode,
): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ directionMode, representation }))
}

export function downloadLibrary(data: LibraryData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `city-routes-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}
