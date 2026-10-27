export const DENOMINATORS = Object.freeze([2, 3, 4, 6, 8])

const TOLERANCE = 1 / 120
const EPSILON = 1e-12
const TICK_EPSILON = 1e-9
const isDigit = value => Number.isInteger(value) && value >= 0 && value <= 5
const isEmpty = value => value === null || value === undefined || value === ''
const clamp = (value, max) => Math.max(0, Math.min(max, value))
const clean = value => Number(value.toFixed(12))
const limit = max => Number.isFinite(max) && max > 0 ? max : 3
const divisions = parts => Number.isInteger(parts) && parts > 0 ? parts : 24

export function placeNumerator(digits, digit, index) {
  if (!Array.isArray(digits) || digits.length !== DENOMINATORS.length || !isDigit(digit) ||
      !Number.isInteger(index) || index < 0 || index >= DENOMINATORS.length) {
    throw new Error('Invalid digit or fraction space')
  }
  const next = [...digits], source = next.indexOf(digit)
  if (source === index) return next
  if (source >= 0) next[source] = next[index]
  next[index] = digit
  return next
}

export function evaluateFractionLine(digits, positions) {
  const emptyCorrect = () => DENOMINATORS.map(() => false)
  const result = (status, message, correct = emptyCorrect()) => ({ status, correct, message })
  if (!Array.isArray(digits) || !Array.isArray(positions) ||
      digits.length !== DENOMINATORS.length || positions.length !== DENOMINATORS.length) {
    return result('invalid', 'Use all five fractions and their five positions on the number line.')
  }
  const chosen = digits.filter(value => !isEmpty(value))
  if (chosen.some(value => !isDigit(value)) || new Set(chosen).size !== chosen.length) {
    return result('invalid', 'Use digits 0 to 5 at most once in the numerator spaces.')
  }
  if (positions.some(value => !isEmpty(value) && (!Number.isFinite(value) || value < 0 || value > 3))) {
    return result('invalid', 'Place fractions between 0 and 3 on the number line.')
  }
  const correct = DENOMINATORS.map((denominator, index) =>
    isDigit(digits[index]) && !isEmpty(positions[index]) &&
    Math.abs(positions[index] - digits[index] / denominator) <= TOLERANCE + EPSILON)
  if (digits.some(isEmpty)) return result('incomplete', 'Fill all five numerator spaces, then place the fractions on the number line.', correct)
  if (positions.some(isEmpty)) return result('incomplete', 'Drag all five completed fractions onto the number line.', correct)
  const count = correct.filter(Boolean).length
  return count === DENOMINATORS.length
    ? result('success', 'All five fractions have the correct order and spacing! Can you find another arrangement?', correct)
    : result('retry', `${count} of 5 fractions are correctly placed. Check their spacing; equivalent fractions share a point.`, correct)
}

export function linePosition(clientX, { left, width }, max = 3, parts = 24, snap = false) {
  const maximum = limit(max)
  if (!Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return 0
  const value = clamp((clientX - left) / width * maximum, maximum)
  return clean(snap ? clamp(Math.round(value * divisions(parts)) / divisions(parts), maximum) : value)
}

export function moveLinePosition(value, key, max = 3, parts = 24, snap = false) {
  const maximum = limit(max), current = clamp(Number.isFinite(value) ? value : 0, maximum)
  if (key === 'Home') return 0
  if (key === 'End') return maximum
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return current
  const direction = key === 'ArrowRight' ? 1 : -1
  const ticks = divisions(parts)
  const next = snap
    ? (direction > 0 ? Math.floor(current * ticks + TICK_EPSILON) + 1 : Math.ceil(current * ticks - TICK_EPSILON) - 1) / ticks
    : current + direction / 24
  return clean(clamp(next, maximum))
}
