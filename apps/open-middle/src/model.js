export const emptySlots = () => Array(8).fill(null)
export function placeDigit(slots, digit, target) {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9 || !Number.isInteger(target) || target < 0 || target > 7) throw new Error('Invalid digit or space.')
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
export function equationState(slots) {
  if (slots.includes(null)) return 'incomplete'
  return numberAt(slots,0)+numberAt(slots,1) === numberAt(slots,2)+numberAt(slots,3) ? 'equal' : 'unequal'
}
export function sideSum(slots, side) {
  const start = side * 4
  if (slots.slice(start, start + 4).includes(null)) return null
  return numberAt(slots, side * 2) + numberAt(slots, side * 2 + 1)
}
export function numberWords(n) {
  if (n >= 100) return numberWords(Math.floor(n / 100)) + ' hundred' + (n % 100 ? ' and ' + numberWords(n % 100) : '')
  const small = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  return n < 20 ? small[n] : tens[Math.floor(n/10)] + (n%10 ? '-' + small[n%10] : '')
}
