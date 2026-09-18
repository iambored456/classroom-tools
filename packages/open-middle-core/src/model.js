const defaultSides = [[0, 1], [2, 3]]

export const emptySlots = (question) => Array(question?.slotCount ?? (question?.numberCount ?? 4) * 2).fill(null)
export function placeDigit(slots, digit, target, question) {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9 || !Number.isInteger(target) || target < 0 || target >= slots.length || (question && !question.digits.includes(digit))) throw new Error('Invalid digit or space.')
  const next = [...slots], source = next.indexOf(digit)
  if (source === target) return slots
  const displaced = next[target]
  next[target] = digit
  if (source >= 0) next[source] = displaced
  return next
}
export function numberAt(slots, index) {
  const tens = slots[index*2], ones = slots[index*2+1]
  return tens === null && ones === null ? null : (tens ?? 0)*10 + (ones ?? 0)
}
export function equationState(slots, question) {
  if (slots.includes(null)) return 'incomplete'
  if (question?.lines) {
    const sums = question.lines.map(line => lineSum(slots, line.slots))
    return sums.every(sum => sum === sums[0]) ? 'equal' : 'unequal'
  }
  return sideSum(slots, 0, question) === sideSum(slots, 1, question) ? 'equal' : 'unequal'
}
export function lineSum(slots, indices) {
  return indices.some(index => slots[index] === null) ? null : indices.reduce((sum, index) => sum + slots[index], 0)
}
export function sideSum(slots, side, question) {
  const numbers = (question?.sides ?? defaultSides)[side]
  if (!numbers || numbers.some(index => slots[index * 2] === null || slots[index * 2 + 1] === null)) return null
  return numbers.reduce((sum, index) => sum + numberAt(slots, index), 0)
}
export function numberWords(n) {
  if (n >= 100) return numberWords(Math.floor(n / 100)) + ' hundred' + (n % 100 ? ' and ' + numberWords(n % 100) : '')
  const small = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  return n < 20 ? small[n] : tens[Math.floor(n/10)] + (n%10 ? '-' + small[n%10] : '')
}
