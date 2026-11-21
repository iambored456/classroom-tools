export type Student = { id: string; name: string }
export type NameDisplay = 'full' | 'first' | 'initial'
export const defaultNameDisplay: NameDisplay = 'initial'
export type Theme = 'dark' | 'light'
export type PairingRule = {
  kind: 'together' | 'apart'
  students: [string, string]
}
export type Classroom = {
  id: string
  name: string
  students: Student[]
  groupCount: number
  nameDisplay?: NameDisplay
  rules: PairingRule[]
}

const storageKey = 'class-group-shuffler:classes:v1'
const themeKey = 'class-group-shuffler:theme'

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveTheme(theme: Theme): boolean {
  try {
    localStorage.setItem(themeKey, theme)
    return true
  } catch {
    return false
  }
}

export function loadClasses(): Classroom[] {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveClasses(classes: Classroom[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(classes))
    return true
  } catch {
    return false
  }
}

export function parseNames(text: string): string[] {
  return text.split(/\r\n?|\n/).map(line => {
    const row = line.trim()
    if (row.startsWith('|') && row.endsWith('|')) {
      const cells = row.slice(1, -1).split(/(?<!\\)\|/).map(cell => cell.trim())
      if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) return ''
      return cells.filter(Boolean).join(' ').replaceAll('\\|', '|')
    }

    return row.split('\t').map(value => {
      const cell = value.trim()
      return /^"(?:[^"]|"")*"$/.test(cell) ? cell.slice(1, -1).replaceAll('""', '"').trim() : cell
    }).filter(Boolean).join(' ')
  }).filter(Boolean)
}

export function makeStudent(name: string): Student {
  return { id: crypto.randomUUID(), name }
}

export function studentLabels(students: readonly Student[], display: NameDisplay = 'full'): Map<string, string> {
  const names = students.map(({ id, name }) => {
    if (display === 'full') return { id, name }
    const parts = name.trim().split(/\s+/)
    const first = parts[0]
    const [initial] = parts[parts.length - 1].normalize('NFC')
    return { id, name: display === 'initial' && parts.length > 1 ? `${first} ${initial}.` : first }
  })

  const counts = new Map<string, number>()
  for (const { name } of names) counts.set(name, (counts.get(name) ?? 0) + 1)

  const seen = new Map<string, number>()
  return new Map(names.map(({ id, name }) => {
    const number = (seen.get(name) ?? 0) + 1
    seen.set(name, number)
    return [id, counts.get(name) === 1 ? name : `${name} (${number})`]
  }))
}
