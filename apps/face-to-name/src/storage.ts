import { parseSet, type FaceSet } from './model'

let database: Promise<IDBDatabase> | undefined
function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('face-to-name', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('sets', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(new Error('Local storage is unavailable. Export your set to keep a backup.')) }
  })
}

export async function localSets(): Promise<FaceSet[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction('sets').objectStore('sets').getAll()
    request.onsuccess = () => {
      try { resolve(request.result.map(value => parseSet(value, false))) } catch (error) { reject(error) }
    }
    request.onerror = () => reject(new Error('Could not read your local sets.'))
  })
}

export async function storeSet(set: FaceSet): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sets', 'readwrite')
    tx.objectStore('sets').put(set)
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(new Error('Could not save locally. Export a backup before leaving this page.'))
  })
}

export async function removeSet(id: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sets', 'readwrite')
    tx.objectStore('sets').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(new Error('Could not remove the local set.'))
  })
}

export async function preparePhoto(file: File): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is larger than 25 MB.`)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: choose a JPEG, PNG, or WebP photo.`)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch (error) {
    throw new Error(`${file.name}: ${error instanceof Error ? error.message : 'Could not read this photo.'}`)
  } finally { URL.revokeObjectURL(url) }
}
