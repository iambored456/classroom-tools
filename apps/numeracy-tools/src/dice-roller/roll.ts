export const pickerOrder = [6, 4, 8, 10, 12, 20, 100] as const
export type Sides = typeof pickerOrder[number]
export const groupOrder: readonly Sides[] = [100, 6, 4, 8, 10, 12, 20]
export const poolLimit = 30
export const descriptions: Record<Sides, string> = {
  4: 'four-sided', 6: 'six-sided', 8: 'eight-sided', 10: 'ten-sided',
  12: 'twelve-sided', 20: 'twenty-sided', 100: 'percentile',
}
export type Pool = Readonly<Partial<Record<Sides, number>>>
export interface Outcome {
  readonly id: string
  readonly sides: Sides
  readonly value: number
}
export interface Roll {
  readonly id: number
  readonly timestamp: number
  readonly pool: Pool
  readonly outcomes: readonly Outcome[]
  readonly total: number
}
export interface PhysicalDie {
  readonly logicalId: string
  readonly sides: Exclude<Sides, 100>
  readonly face: number // One-based face (or d4 vertex) index into the mesh.
  readonly role: 'ordinary' | 'tens' | 'units'
  readonly pair: number
}

export function poolSize(pool: Pool) {
  return groupOrder.reduce((sum, sides) => sum + (pool[sides] ?? 0), 0)
}

export function expression(pool: Pool) {
  return groupOrder.filter(sides => pool[sides]).map(sides => pool[sides] + 'd' + sides).join(' + ')
}

export function uniformValue(sides: Sides, nextWord = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  const range = 0x100000000
  const cutoff = range - range % sides
  let word: number
  do { word = nextWord() } while (word >= cutoff)
  return 1 + word % sides
}

export function makeRoll(pool: Pool, id: number, draw: (sides: Sides) => number = uniformValue, timestamp = Date.now()): Roll {
  for (const [key, count] of Object.entries(pool)) {
    if (!groupOrder.some(sides => String(sides) === key) || !Number.isInteger(count) || count < 0) {
      throw new RangeError('Invalid dice pool')
    }
  }
  const size = poolSize(pool)
  if (!size || size > poolLimit) throw new RangeError('Choose between 1 and 30 dice')
  const snapshot = Object.freeze({ ...pool })
  const outcomes: Outcome[] = []
  for (const sides of groupOrder) {
    for (let i = 0; i < (snapshot[sides] ?? 0); i++) {
      const value = draw(sides)
      if (!Number.isInteger(value) || value < 1 || value > sides) throw new RangeError('Invalid die value')
      outcomes.push(Object.freeze({ id: id + '-' + outcomes.length, sides, value }))
    }
  }
  return Object.freeze({ id, timestamp, pool: snapshot, outcomes: Object.freeze(outcomes),
    total: outcomes.reduce((sum, die) => sum + die.value, 0) })
}

export function percentile(value: number) {
  return { tens: Math.floor(value % 100 / 10), units: value % 10 }
}

export function physicalDice(roll: Roll): PhysicalDie[] {
  const dice: PhysicalDie[] = []
  let pair = 0
  for (const { id: logicalId, sides, value } of roll.outcomes) {
    if (sides === 100) {
      const { tens, units } = percentile(value)
      pair++
      dice.push({ logicalId, sides: 10, face: tens + 1, role: 'tens', pair },
        { logicalId, sides: 10, face: units + 1, role: 'units', pair })
    } else dice.push({ logicalId, sides, face: value, role: 'ordinary', pair: 0 })
  }
  return dice
}

export function faceLabel(die: PhysicalDie, face = die.face) {
  if (die.role === 'tens') return String(face - 1) + '0'
  return String(die.role === 'units' ? face - 1 : face)
}

export function dieCaption(die: PhysicalDie) {
  return die.pair ? '#' + die.pair + ' ' + die.role : 'd' + die.sides
}
