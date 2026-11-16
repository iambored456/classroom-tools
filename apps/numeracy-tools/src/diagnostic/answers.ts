import type { AnswerField, AnswerSpec } from './types'

interface Rational {
  numerator: bigint
  denominator: bigint
}

export type AnswerCheck =
  | { valid: true; correct: boolean }
  | { valid: false; message: string; field: number }

// The answer grammar contains numbers, with an optional fraction bar and unit.
// Algebraic method steps use coefficient fields or written choices.
const decimal = '[+-]?\\s*(?:\\d+(?:\\.\\d*)?|\\.\\d+)'
const numericSource = `${decimal}(?:\\s*\\/\\s*${decimal})?`
const numberPattern = new RegExp(`^${numericSource}$`)
const quantityPattern = new RegExp(`^(${numericSource})\\s*([a-zA-Zµμ°].*)$`)

function normalizeNumber(input: string) {
  return input.trim().replace(/[−–—]/g, '-').replace(/[⁄∕]/g, '/')
}

function parseDecimal(input: string): Rational {
  const normalized = input.replace(/\s+/g, '')
  const [integer, fraction = ''] = normalized.split('.')
  const sign = normalized.startsWith('-') ? -1n : 1n
  const digits = (integer.replace(/^[+-]/, '') + fraction) || '0'
  return { numerator: sign * BigInt(digits), denominator: 10n ** BigInt(fraction.length) }
}

function parseNumber(input: string): Rational | undefined {
  const normalized = normalizeNumber(input)
  if (normalized.length > 100 || !numberPattern.test(normalized)) return
  const [numeratorText, denominatorText] = normalized.split('/')
  const numerator = parseDecimal(numeratorText)
  if (denominatorText === undefined) return numerator
  const denominator = parseDecimal(denominatorText)
  if (denominator.numerator === 0n) return
  const sign = denominator.numerator < 0n ? -1n : 1n
  return {
    numerator: sign * numerator.numerator * denominator.denominator,
    denominator: sign * numerator.denominator * denominator.numerator,
  }
}

function sameValue(a: Rational, b: Rational) {
  return a.numerator * b.denominator === b.numerator * a.denominator
}

function rounded(value: Rational, digits: number): Rational {
  const scale = 10n ** BigInt(digits)
  const sign = value.numerator < 0n ? -1n : 1n
  const scaled = sign * value.numerator * scale
  const remainder = scaled % value.denominator
  const absolute = scaled / value.denominator + (2n * remainder >= value.denominator ? 1n : 0n)
  return { numerator: sign * absolute, denominator: scale }
}

function normalizeUnit(input: string) {
  return input.replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, '').trim()
}

function checkField(field: AnswerField, raw: string, index: number): AnswerCheck {
  let input = normalizeNumber(raw)
  let unitMatches = true
  if (field.unit) {
    const quantity = input.match(quantityPattern)
    if (!quantity) {
      return { valid: false, message: 'Enter a number followed by its unit.', field: index }
    }
    input = quantity[1]
    unitMatches = normalizeUnit(field.unit) === normalizeUnit(quantity[2])
  }
  const response = parseNumber(input)
  if (!response) {
    return { valid: false, message: 'Enter a number, decimal, or fraction with a nonzero denominator.', field: index }
  }
  const expected = parseNumber(field.expected)
  if (!expected) throw new Error('A numeric item has an invalid expected answer.')
  const target = field.format === 'rounded' ? rounded(expected, field.digits ?? 0) : expected
  return { valid: true, correct: unitMatches && sameValue(response, target) }
}

function checkRoots(expected: string[], raw: string, index: number): AnswerCheck {
  const roots = parseValues(raw.split(','))
  if (!roots) {
    return { valid: false, message: 'Enter each value as a number or fraction, with commas between values.', field: index }
  }
  const expectedRoots = parseValues(expected)
  if (!expectedRoots) throw new Error('An item has an invalid expected root.')
  return {
    valid: true,
    correct: roots.every((root) => expectedRoots.some((target) => sameValue(root, target)))
      && expectedRoots.every((target) => roots.some((root) => sameValue(root, target))),
  }
}

function parseValues(values: string[]) {
  const parsed: Rational[] = []
  for (const value of values) {
    const number = parseNumber(value)
    if (!number) return
    parsed.push(number)
  }
  return parsed
}

export function checkAnswer(spec: AnswerSpec, raw: string[]): AnswerCheck {
  if (spec.kind === 'choice') {
    if (raw.length !== 1 || !spec.options.some((option) => option.id === raw[0])) {
      return { valid: false, message: 'Choose an answer to submit.', field: 0 }
    }
    return { valid: true, correct: raw[0] === spec.correct }
  }
  if (raw.some((answer) => answer.length > 250)) {
    return { valid: false, message: 'Enter a shorter answer.', field: raw.findIndex((answer) => answer.length > 250) }
  }
  const fieldCount = spec.kind === 'roots' ? 1 : spec.fields.length + (spec.roots ? 1 : 0)
  if (raw.length > fieldCount) return { valid: false, message: 'Check the answer fields.', field: 0 }
  if (spec.kind === 'roots') return checkRoots(spec.expected, raw[0] ?? '', 0)

  let correct = true
  for (const [index, field] of spec.fields.entries()) {
    const result = checkField(field, raw[index] ?? '', index)
    if (!result.valid) return result
    correct = correct && result.correct
  }
  if (spec.roots) {
    const index = spec.fields.length
    const result = checkRoots(spec.roots.expected, raw[index] ?? '', index)
    if (!result.valid) return result
    correct = correct && result.correct
  }
  return { valid: true, correct }
}

export function validAnswerSpec(spec: AnswerSpec): boolean {
  const validRoots = (expected: string[]) => expected.length > 0 && expected.every((value) => parseNumber(value))
  if (spec.kind === 'roots') return validRoots(spec.expected)
  if (spec.kind === 'choice') {
    const ids = spec.options.map((option) => option.id)
    return ids.length >= 2 && ids.every(Boolean) && new Set(ids).size === ids.length && ids.includes(spec.correct)
  }
  return spec.fields.length > 0 && spec.fields.every((field) => field.label && parseNumber(field.expected)
    && (field.format !== 'rounded' || (Number.isInteger(field.digits) && field.digits! >= 0 && field.digits! <= 12))
    && (field.unit === undefined || /^[a-zA-Zµμ°]/.test(field.unit)))
    && (!spec.roots || validRoots(spec.roots.expected))
}
