export const forms = ['fraction', 'decimal', 'percent', 'money'] as const
export type Form = typeof forms[number]
export const labels: Record<Form, string> = { fraction: 'Fraction', decimal: 'Decimal', percent: 'Percent', money: 'Money' }
export const colours = [
  { name: 'Empty', hex: '#dbe1dd' }, { name: 'Jade', hex: '#39a58b' },
  { name: 'Apricot', hex: '#f1a664' }, { name: 'Iris', hex: '#a194d6' },
] as const
export const money = (amount: number) => '$' + amount.toFixed(2)
export const boardOf = (count: number) => Array.from({ length: 100 }, (_, i) => Number(i < count))
export function fraction(n: number, simplify = false) {
  if (!simplify) return n + '/100'
  let a = n, b = 100
  while (b) [a, b] = [b, a % b]
  return (n / a) + '/' + (100 / a)
}
export function format(n: number, form: Form, whole = 1, simplify = false) {
  switch (form) {
    case 'fraction': return fraction(n, simplify)
    case 'decimal': return String(n / 100)
    case 'percent': return n + '%'
    case 'money': return money(n * whole / 100)
  }
}
// Compare integer ratios so that a nearby decimal never silently rounds to a tile.
export function readTiles(input: string, form: Form, whole = 1): number | string {
  let s = input.trim()
  if (form === 'money') s = s.replace(/^\$\s*/, '')
  if (form === 'percent') s = s.replace(/\s*%$/, '')
  let top: number, bottom: number
  if (form === 'fraction') {
    const match = /^(\d{1,7})\s*\/\s*(\d{1,7})$/.exec(s)
    if (!match && s !== '0' && s !== '1') return 'Write a fraction such as 3/4.'
    top = match ? Number(match[1]) : Number(s)
    bottom = match ? Number(match[2]) : 1
    if (!bottom) return 'A denominator must be greater than zero.'
  } else {
    if (!/^(?:\d{1,7}(?:\.\d{0,7})?|\.\d{1,7})$/.test(s)) return 'Enter a number in the indicated form.'
    const places = (s.split('.')[1] ?? '').length
    top = Number(s.replace('.', ''))
    bottom = 10 ** places
  }
  if (form === 'money') bottom *= whole
  if (form !== 'percent') top *= 100
  if (top > 100 * bottom) return 'The grid represents up to one whole.'
  if (top % bottom !== 0) return 'This value falls between tiles. Each tile is one hundredth of the whole.'
  return top / bottom
}
export function resizeColour(board: number[], colour: number, count: number) {
  const result = [...board]
  let current = result.filter(c => c === colour).length
  for (let i = 99; current > count; i--) {
    if (result[i] === colour) { result[i] = 0; current-- }
  }
  for (const blanksOnly of [true, false]) {
    for (let i = 0; current < count && i < 100; i++) {
      if (result[i] === colour || (blanksOnly && result[i] !== 0)) continue
      result[i] = colour
      current++
    }
  }
  return result
}
export function shuffle<T>(items: readonly T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

