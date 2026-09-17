export type Person = { id: string; name: string; photos: string[] }
export type FaceSet = { version: 1; id: string; title: string; people: Person[] }
export type Direction = 'face' | 'name'
export type Mode = Direction | 'mixed'
export type RecordEntry = { signature: string; face: number; name: number; missedFace: boolean; missedName: boolean; lastSeen: number }
export type Progress = { version: 1; turn: number; lastPerson: string | null; records: Record<string, RecordEntry> }
export type Question = { personId: string; direction: Direction; choices: { personId: string; photo: string }[]; photo: string }

export const MAX_PACKAGE_BYTES = 50 * 1024 * 1024
export const validId = (id: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)
export const normalizeName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
export const newSet = (): FaceSet => ({ version: 1, id: crypto.randomUUID(), title: '', people: [] })
export const directions = (mode: Mode): Direction[] => mode === 'mixed' ? ['face', 'name'] : [mode]

export function setErrors(set: FaceSet): string[] {
  const errors: string[] = []
  if (!set.title.trim()) errors.push('Give your set a title.')
  if (set.people.length < 4) errors.push('Add at least four people to practice or export a published set.')
  const names = new Set<string>()
  for (const person of set.people) {
    const normalized = normalizeName(person.name)
    if (!normalized) errors.push('Every person needs a preferred name.')
    else if (names.has(normalized)) errors.push(`“${person.name.trim()}” is already used. Give each person a unique name.`)
    names.add(normalized)
    if (person.photos.length < 1 || person.photos.length > 3) errors.push(`${person.name || 'Each person'} needs one to three photos.`)
  }
  return [...new Set(errors)]
}

// Restrict imported photos to embedded raster data. No remote requests or executable SVG.
export function parseSet(value: unknown, requireReady = true): FaceSet {
  if (!value || typeof value !== 'object') throw new Error('This is not a Face to Name set.')
  const set = value as FaceSet
  if (set.version !== 1 || typeof set.id !== 'string' || !validId(set.id) || typeof set.title !== 'string' || set.title.length > 160 || !Array.isArray(set.people) || set.people.length > 500) throw new Error('Invalid set format or unsupported version.')
  const ids = new Set<string>()
  const people = set.people.map((person): Person => {
    if (!person || typeof person.id !== 'string' || !validId(person.id) || ids.has(person.id) || typeof person.name !== 'string' || person.name.length > 100 || !Array.isArray(person.photos) || person.photos.length > 3) throw new Error('A person in this set has invalid or duplicate details.')
    ids.add(person.id)
    if (person.photos.some(photo => typeof photo !== 'string' || photo.length > 3_000_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) throw new Error('Photos must be embedded JPEG, PNG, or WebP images.')
    return { id: person.id, name: person.name, photos: [...person.photos] }
  })
  const result: FaceSet = { version: 1, id: set.id, title: set.title, people }
  if (requireReady && setErrors(result).length) throw new Error(setErrors(result).join(' '))
  return result
}

function signature(person: Person): string {
  // Two independent 32-bit hashes keep photo signatures small in localStorage.
  let a = 2166136261, b = 5381
  const text = JSON.stringify([person.name, person.photos])
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ text.charCodeAt(i)
  }
  return `${a >>> 0}:${b >>> 0}`
}

export function reconcileProgress(set: FaceSet, saved?: unknown): Progress {
  const source = saved as Partial<Progress> | undefined
  const usable = source?.version === 1 && source.records && typeof source.records === 'object'
  const records: Progress['records'] = Object.create(null)
  for (const person of set.people) {
    const sig = signature(person)
    const old = usable && Object.hasOwn(source.records!, person.id) ? source.records![person.id] : undefined
    const keep = old?.signature === sig
    const count = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 2 ? n : 0
    records[person.id] = {
      signature: sig, face: keep ? count(old.face) : 0, name: keep ? count(old.name) : 0,
      missedFace: keep && old.missedFace === true, missedName: keep && old.missedName === true,
      lastSeen: keep && Number.isSafeInteger(old.lastSeen) ? old.lastSeen : -100,
    }
  }
  return { version: 1, records, turn: usable && Number.isSafeInteger(source.turn) && source.turn! >= 0 ? source.turn! : 0, lastPerson: usable && typeof source.lastPerson === 'string' ? source.lastPerson : null }
}

export const mastered = (progress: Progress, id: string, mode: Mode) => directions(mode).every(d => progress.records[id][d] >= 2)
export const completedPeople = (set: FaceSet, progress: Progress, mode: Mode) => set.people.filter(p => mastered(progress, p.id, mode)).length

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function nextQuestion(set: FaceSet, progress: Progress, mode: Mode, random = Math.random): Question | null {
  if (set.people.length < 4) return null
  let candidates = set.people.flatMap(person => directions(mode).filter(d => progress.records[person.id][d] < 2).map(direction => ({ person, direction })))
  if (!candidates.length) return null
  // Leave at least two intervening questions when there are other people to review.
  const spaced = candidates.filter(c => progress.turn - progress.records[c.person.id].lastSeen >= 2)
  const different = candidates.filter(c => c.person.id !== progress.lastPerson)
  if (spaced.length) candidates = spaced
  else if (different.length) candidates = different
  const weighted = candidates.flatMap(c => {
    const record = progress.records[c.person.id]
    return Array.from({ length: record[c.direction === 'face' ? 'missedFace' : 'missedName'] ? 3 : 1 }, () => c)
  })
  const chosen = weighted[Math.floor(random() * weighted.length)]
  const photo = (p: Person) => p.photos[Math.floor(random() * p.photos.length)]
  const choices = shuffle([chosen.person, ...shuffle(set.people.filter(p => p.id !== chosen.person.id), random).slice(0, 3)], random)
  return { personId: chosen.person.id, direction: chosen.direction, photo: photo(chosen.person), choices: choices.map(p => ({ personId: p.id, photo: photo(p) })) }
}

export function answerQuestion(progress: Progress, question: Question, selectedId: string): Progress {
  if (!question.choices.some(c => c.personId === selectedId)) throw new Error('Choose one of the four answers.')
  const record = { ...progress.records[question.personId] }
  const correct = selectedId === question.personId
  record[question.direction] = correct ? Math.min(2, record[question.direction] + 1) : 0
  record[question.direction === 'face' ? 'missedFace' : 'missedName'] = !correct || (record[question.direction] < 2 && record[question.direction === 'face' ? 'missedFace' : 'missedName'])
  record.lastSeen = progress.turn + 1
  return { ...progress, turn: progress.turn + 1, lastPerson: question.personId, records: { ...progress.records, [question.personId]: record } }
}
