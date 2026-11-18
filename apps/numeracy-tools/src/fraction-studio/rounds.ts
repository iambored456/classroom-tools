import { forms, format, shuffle, type Form } from './math'
export const kinds = { mixed: 'Mixed practice', build: 'Build it', convert: 'Convert it', match: 'Match it', money: 'Shop discounts' }
export type Kind = keyof typeof kinds
export type Round = { kind: Exclude<Kind, 'mixed'>; count: number; source: Form; output: Form; whole: number; choices: string[] }
const benchmark = [5, 10, 20, 25, 40, 50, 60, 75, 80, 90]
export function makeRounds(kind: Kind, difficulty: string, total: number, pair: string): Round[] {
  const pool = difficulty === 'benchmarks' ? benchmark : Array.from({ length: 99 }, (_, i) => i + 1)
  const targets = shuffle(pool)
  const allowed = pair === 'all' ? [...forms] : forms.filter(f => pair.split('-').includes(f))
  const mixed = shuffle(['build', 'convert', 'match', 'money'] as const)
  return Array.from({ length: total }, (_, i) => {
    const k = kind === 'mixed' ? mixed[i % mixed.length] : kind
    const [source, output] = shuffle(allowed)
    const count = targets[i % targets.length]
    const whole = k === 'money' ? [20, 40, 50, 80][i % 4] : 1
    const incorrect = shuffle([...new Set([100 - count, Math.floor(count / 10), count * 10, count + 10, count - 10, count + 1, count - 1])].filter(n => n >= 0 && n <= 100 && n !== count)).slice(0, 3)
    return { kind: k, source, output, count, whole, choices: shuffle([count, ...incorrect]).map(n => format(n, output)) }
  })
}

