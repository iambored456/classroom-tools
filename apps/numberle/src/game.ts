export type Mark = 'correct' | 'present' | 'absent'
export type Operator = '+' | '-' | '*' | '/'
export type Settings = {
  length: number
  operators: Operator[]
  hard: boolean
  daily: boolean
  dark: boolean
  contrast: boolean
  swap: boolean
}
export type Game = { answer: string; guesses: string[]; draft: string; id: string; day: string; custom: boolean }
export const defaults: Settings = { length: 8, operators: ['+', '-', '*', '/'], hard: false, daily: false, dark: false, contrast: false, swap: false }
export const normalize = (value: string) => value.replace(/\s/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
export const display = (value: string) => value.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')

// Exact rational arithmetic, with multiplication/division before addition/subtraction.
// No eval, floating-point equality, or execution of user-entered expressions.
export function evaluate(expression: string): [bigint, bigint] | null {
  if (!/^(0|[1-9]\d*)([+*/-](0|[1-9]\d*))+$/.test(expression)) return null
  const tokens = expression.match(/\d+|[+*/-]/g)!
  let totalN = 0n, totalD = 1n, n = BigInt(tokens[0]), d = 1n, sign = 1n
  for (let i = 1; i <= tokens.length; i += 2) {
    const op = tokens[i]
    if (op === '*' || op === '/') {
      const next = BigInt(tokens[i + 1])
      if (op === '*') n *= next
      else { if (next === 0n) return null; d *= next }
    } else {
      totalN = totalN * d + sign * n * totalD
      totalD *= d
      if (op) { n = BigInt(tokens[i + 1]); d = 1n; sign = op === '-' ? -1n : 1n }
    }
  }
  return [totalN, totalD]
}

export function validate(raw: string, length?: number): string | null {
  const equation = normalize(raw)
  if (length !== undefined && equation.length !== length) return `Use all ${length} tiles before pressing Enter.`
  if (equation.length < 5 || equation.length > 12) return 'Use an equation with 5–12 symbols.'
  if (!/^[\d+*/=-]+$/.test(equation)) return 'Use digits and + − × ÷ = only.'
  if (equation.split('=').length !== 2) return 'Include exactly one equals sign.'
  const [left, right] = equation.split('=')
  if (!/^(0|[1-9]\d*)$/.test(right)) return 'Put a whole, non-negative number after =, without leading zeros.'
  const result = evaluate(left)
  if (!result) return 'Use numbers separated by operators. No leading zeros or division by zero.'
  if (result[0] !== BigInt(right) * result[1]) return 'The equation must balance. Multiply and divide before adding or subtracting.'
  return null
}

export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(guess.length).fill('absent')
  const remaining = new Map<string, number>()
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = 'correct'
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1)
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] !== 'correct' && (remaining.get(guess[i]) ?? 0) > 0) {
      marks[i] = 'present'
      remaining.set(guess[i], remaining.get(guess[i])! - 1)
    }
  }
  return marks
}

export function hardError(guess: string, previous: string[], answer: string): string | null {
  for (const prior of previous) {
    const marks = score(prior, answer)
    const required = new Map<string, number>()
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] === 'correct' && guess[i] !== prior[i]) return `Keep ${display(prior[i])} in tile ${i + 1}.`
      if (marks[i] !== 'absent') required.set(prior[i], (required.get(prior[i]) ?? 0) + 1)
    }
    for (const [symbol, count] of required) {
      if ([...guess].filter(c => c === symbol).length < count) return `Include ${count > 1 ? `${count} copies of ` : ''}${display(symbol)} from your clues.`
    }
  }
  return null
}

export function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => { state += 0x6D2B79F5; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

const fallback: Record<Operator, string[]> = {
  '+': ['1+1=2', '1+9=10', '10+1=11', '1+99=100', '100+1=101', '1+999=1000', '1000+1=1001', '1+9999=10000'],
  '-': ['2-1=1', '10-1=9', '11-1=10', '100-1=99', '101-1=100', '1000-1=999', '1001-1=1000', '10000-1=9999'],
  '*': ['1*2=2', '2*5=10', '2*10=20', '2*50=100', '10*10=100', '2*500=1000', '10*100=1000', '2*5000=10000'],
  '/': ['2/1=2', '10/2=5', '20/2=10', '100/2=50', '100/10=10', '1000/2=500', '1000/10=100', '10000/2=5000'],
}

export function generate(length: number, operators: Operator[], random = Math.random): string {
  if (length < 5 || length > 12 || !Number.isInteger(length) || !operators.length) throw new Error('Choose a length from 5–12 and at least one operator.')
  const pick = () => operators[Math.floor(random() * operators.length)]
  const number = () => {
    const digits = 1 + Math.floor(random() * Math.min(5, Math.ceil(length / 2)))
    return 1 + Math.floor(random() * (10 ** digits - 1))
  }
  for (let attempt = 0; attempt < 6000; attempt++) {
    let left = `${number()}${pick()}${number()}`
    if (length >= 7 && random() < 0.5) left += `${pick()}${number()}`
    if (left.length > length - 2) continue
    const value = evaluate(left)
    if (!value || value[0] < 0n || value[0] % value[1] !== 0n) continue
    const equation = `${left}=${value[0] / value[1]}`
    if (equation.length === length) return equation
  }
  return fallback[pick()][length - 5]
}

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function newGame(settings: Settings, day = localDay()): Game {
  const id = settings.daily ? `daily:${day}:${settings.length}:${[...settings.operators].sort().join('')}` : `free:${Date.now()}:${Math.random()}`
  return { answer: generate(settings.length, [...settings.operators].sort(), settings.daily ? seededRandom(id) : Math.random), guesses: [], draft: '', id, day, custom: false }
}
export const outcome = (game: Game) => game.guesses.includes(game.answer) ? 'won' : game.guesses.length >= 6 ? 'lost' : 'playing'

export function restoreGame(value: unknown): Game | null {
  if (!value || typeof value !== 'object') return null
  const g = value as Game
  if (typeof g.answer !== 'string' || validate(g.answer) || !Array.isArray(g.guesses) || g.guesses.length > 6 ||
    !g.guesses.every((s, i) => typeof s === 'string' && !validate(s, g.answer.length) && !g.guesses.slice(0, i).includes(g.answer)) ||
    typeof g.draft !== 'string' || g.draft.length > g.answer.length || !/^[\d+*/=-]*$/.test(g.draft) ||
    typeof g.id !== 'string' || typeof g.day !== 'string' || typeof g.custom !== 'boolean') return null
  return g
}
