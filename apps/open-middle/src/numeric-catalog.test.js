import {test} from 'node:test'
import assert from 'node:assert/strict'
import {numericQuestions, evaluateNumeric, placeNumeric, diceWays} from './numeric-catalog.js'

const question = id => {
  const q = numericQuestions.find(q => q.id === id)
  assert.ok(q, `Missing question ${id}`)
  return q
}
const evaluate = (id, values, mode) => evaluateNumeric(question(id), values, mode)
const examples = [
  ['13-blanks', [1,9,2,8,3,7,4,6,5,5], [1,8,2,8,3,7,4,6,5,5]],
  [16, [2,3,5], [2,5,3]],
  [22, [0,9,1,8,2,7,3,6,4,5], [0,8,1,9,2,7,3,6,4,5]],
  [33, [3,1,2,9], [9,8,1,2], 'smallest'],
  [43, [3,0,1,2,9,8], [3,0,2,1,9,8]],
  [44, [5,2,1,3], [5,1,2,3]],
  [47, [1,3,2,8,5,9], [9,3,2,8,5,1]],
  [53, [8,7,9], [9,7,8]],
  [58, [1,3,2,6], [1,2,3,4], 'both'],
  [69, [2,3,5,4,9], [2,3,4,5,9], 'any'],
  [71, [8,7,5,6,0], [8,7,6,5,0], 'greater'],
  [94, [4,5,7,9,1,2,3,6], [7,9,4,5,1,2,3,6]],
  [109, [1,4,2,8,9,3,6], [1,4,2,8,9,6,3]],
  ['109-comparing-fractions', [1,4,8,9], [8,9,1,4]],
  [113, [1,2,3,6,7,8], [3,2,1,6,7,8]],
  [114, [1,2,3,4,6,5], [6,2,3,4,1,5]],
  [116, [1,2,0,5], [1,2,5,0]],
  [119, [1,2,3,5,0], [1,2,6,3,0]],
  [180, [6,1,8,2], [6,1,2,8]],
  [219, [1,9,0,8], [1,0,9,8], '60'],
  [278, [1,7,2,5,6,8], [1,7,2,5,8,6]],
  [279, [2,0,6,5,1,3], [2,0,6,5,3,1], 'unique'],
  [353, [1,3,8,2,4], [1,3,8,4,2]],
  [357, [2,3,5,6], [3,2,5,6]],
]

test('every numeric source has a verified successful example and an unsuccessful attempt', () => {
  assert.equal(new Set(numericQuestions.map(q => q.id)).size, numericQuestions.length)
  assert.deepEqual(new Set(examples.map(([id]) => id)), new Set(numericQuestions.map(q => q.id)))
  for (const [id, valid, wrong, mode] of examples) {
    assert.equal(evaluate(id, valid, mode).state, 'success', `Question ${id}: valid example`)
    assert.equal(evaluate(id, wrong, mode).state, 'progress', `Question ${id}: wrong math or nonoptimal attempt`)
    const unfinished = [...valid]
    unfinished[0] = null
    assert.equal(evaluate(id, unfinished, mode).state, 'incomplete', `Question ${id}: unfinished`)
    const outsideBank = [...valid]
    outsideBank[0] = 10
    assert.equal(evaluate(id, outsideBank, mode).state, 'invalid', `Question ${id}: outside digit bank`)
    if (question(id).unique || mode === 'unique') {
      const repeated = [...valid]
      repeated[0] = repeated[1]
      assert.equal(evaluate(id, repeated, mode).state, 'invalid', `Question ${id}: repeated digit`)
    }
  }
})

test('all diagram spaces appear exactly once and match their declared digit counts', () => {
  const collect = node => {
    if (Array.isArray(node)) return node.flatMap(collect)
    if (typeof node !== 'object' || node === null) return []
    if (node.type === 'slots') return node.indices
    if (node.type === 'fraction') return [...collect(node.top), ...collect(node.bottom)]
    if (node.type === 'group') return collect(node.parts)
    return []
  }
  for (const q of numericQuestions) {
    assert.deepEqual(collect(q.rows).sort((a,b) => a-b), Array.from({length:q.slotCount}, (_,i) => i), `Question ${q.id}`)
  }
})

test('digits swap in unique tasks and may repeat in the source tasks that permit them', () => {
  assert.deepEqual(placeNumeric([2,3,5], 2, 1, question(16)), [3,2,5])
  assert.deepEqual(placeNumeric([2,null,5], 2, 1, question(16)), [null,2,5])
  assert.deepEqual(placeNumeric([2,0,6,5,1,3], 2, 1, question(279), 'free'), [2,2,6,5,1,3])
  assert.deepEqual(placeNumeric([2,0,6,5,1,3], 2, 1, question(279), 'unique'), [0,2,6,5,1,3])
  assert.throws(() => placeNumeric([null,null,null], 10, 0, question(16)))
  assert.throws(() => placeNumeric([null,null,null], 2, 3, question(16)))
  assert.equal(evaluate(279, [5,0,2,0,1,0], 'free').state, 'success')
  assert.equal(evaluate(279, [5,0,2,0,1,0], 'unique').state, 'invalid')
})

test('Comparing Fractions uses strict half comparisons and accepts improper fractions', () => {
  const id = '109-comparing-fractions'
  assert.deepEqual(question(id).digits, [1,2,3,4,5,6,7,8,9])
  // Printed benchmark digits do not consume the movable 1 and 2.
  assert.equal(evaluate(id, [1,4,5,2]).state, 'success')
  assert.equal(evaluate(id, [2,5,3,4]).state, 'success')
  assert.equal(evaluate(id, [1,2,8,9]).state, 'progress')
  assert.match(evaluate(id, [1,2,8,9]).message, /1\/2 is equal to 1\/2/)
  assert.equal(evaluate(id, [1,5,2,4]).state, 'progress')
  assert.equal(evaluate(id, [1,4,2,5]).state, 'progress')
  assert.equal(evaluate(id, [3,4,8,9]).state, 'progress')
  assert.equal(evaluate(id, [1,4,3,4]).state, 'invalid')
  assert.equal(evaluate(id, [1,0,8,9]).state, 'invalid')
  assert.deepEqual(placeNumeric([1,4,8,9], 1, 2, question(id)), [8,4,1,9])
})

test('each mode applies its own mathematical goal', () => {
  assert.equal(evaluate(33, [9,8,1,2], 'largest').state, 'success')
  assert.equal(evaluate(33, [3,1,2,9], 'largest').state, 'progress')
  for (const mode of ['both','perimeter','area']) assert.equal(evaluate(58, [1,3,2,6], mode).state, 'success')
  assert.equal(evaluate(58, [1,2,5,4], 'area').state, 'progress')
  assert.equal(evaluate(58, [1,4,3,7], 'perimeter').state, 'success')
  assert.equal(evaluate(58, [1,4,3,7], 'both').state, 'progress')
  assert.equal(evaluate(69, [4,8,9,6,3], 'greater').state, 'success')
  assert.equal(evaluate(69, [2,3,5,4,9], 'less').state, 'success')
  assert.equal(evaluate(69, [2,3,5,4,9], 'greater').state, 'progress')
  assert.equal(evaluate(71, [9,3,2,7,0], 'less').state, 'success')
  assert.equal(evaluate(71, [9,3,2,7,0], 'greater').state, 'progress')
  for (const mode of ['20','40','60']) assert.equal(evaluate(219, [1,9,0,8], mode).state, 'success')
  assert.equal(evaluate(219, [1,5,0,8], '40').state, 'success')
  assert.equal(evaluate(219, [1,5,0,8], '60').state, 'progress')
})

test('undefined quantities, impossible dice outcomes, and leading zero numbers are rejected', () => {
  assert.equal(evaluate(33, [1,2,9,8]).state, 'invalid')
  assert.equal(evaluate(43, [0,3,1,2,9,8]).state, 'invalid')
  assert.equal(evaluate(53, [8,7,0]).state, 'invalid')
  assert.equal(evaluate(58, [0,3,2,6]).state, 'invalid')
  assert.equal(evaluate(109, [1,0,2,8,9,3,6]).state, 'invalid')
  assert.equal(evaluate(116, [1,0,2,5]).state, 'invalid')
  assert.equal(evaluate(278, [0,7,2,5,6,8]).state, 'invalid')
  assert.equal(evaluate(279, [0,5,2,0,0,1], 'free').state, 'invalid')
  assert.equal(evaluate(357, [2,1,5,6]).state, 'invalid')
  assert.equal(evaluate(357, [1,3,5,6]).state, 'invalid')
  assert.equal(evaluate(357, [9,3,5,6]).state, 'invalid')
})

function visitPermutations(pool, count, visit, prefix = [], used = new Set()) {
  if (prefix.length === count) { visit(prefix); return }
  for (const digit of pool) if (!used.has(digit)) {
    prefix.push(digit); used.add(digit)
    visitPermutations(pool, count, visit, prefix, used)
    used.delete(digit); prefix.pop()
  }
}

test('exhaustive two-digit and three-digit subtraction proves the source correction and extrema', () => {
  for (const [id,size,expectedMin,expectedMax] of [[33,2,2,86],[43,3,3,885]]) {
    let minimum = Infinity, maximum = -Infinity
    const winners = []
    visitPermutations(question(id).digits, size*2, a => {
      if (!a[0] || !a[size]) return
      const number = list => list.reduce((value,digit) => value*10+digit, 0)
      const difference = number(a.slice(0,size))-number(a.slice(size))
      if (difference <= 0) return
      minimum = Math.min(minimum,difference); maximum = Math.max(maximum,difference)
      if (difference === expectedMin) winners.push([...a])
    })
    assert.equal(minimum, expectedMin, `${id} minimum`)
    assert.equal(maximum, expectedMax, `${id} maximum`)
    for (const winner of winners) assert.equal(evaluate(id, winner, 'smallest').state, 'success')
  }
})

test('exhaustive rectangle search proves 87 by 9 has the greatest area with unique digits', () => {
  let largest = -Infinity
  const winners = []
  visitPermutations(question(53).digits, 3, a => {
    if (!a[0] || !a[2]) return
    const area = (a[0]*10+a[1])*a[2]
    if (area > largest) {largest = area; winners.length = 0}
    if (area === largest) winners.push([...a])
  })
  assert.equal(largest, 783)
  assert.deepEqual(winners, [[8,7,9]])
  assert.equal(evaluate(53, winners[0]).state, 'success')
})

test('exhaustive decimal products find both sides of 50 without floating point comparisons', () => {
  let closest = Infinity
  const winners = []
  visitPermutations(question(180).digits, 4, a => {
    const distance = Math.abs((a[0]*10+a[1])*(a[2]*10+a[3])-5000)
    if (distance < closest) { closest = distance; winners.length = 0 }
    if (distance === closest) winners.push([...a])
  })
  assert.equal(closest, 2)
  assert.equal(winners.length, 4)
  assert.deepEqual(new Set(winners.map(a => (a[0]*10+a[1])*(a[2]*10+a[3]))), new Set([4998,5002]))
  for (const winner of winners) assert.equal(evaluate(180, winner).state, 'success')
})

test('the fraction and decimal puzzle has 21 exact solutions rather than the printed 22', () => {
  let count = 0
  visitPermutations(question(116).digits, 4, a => {
    const isSolution = a[1] !== 0 && a[0]*10 === a[1]*(10*a[2]+a[3])
    assert.equal(evaluate(116, a).state === 'success', isSolution)
    if (isSolution) count++
  })
  assert.equal(count, 21)
})

test('percent scaling and multiplication division use exact equations instead of erroneous teacher lists', () => {
  let percentCount = 0
  visitPermutations(question(279).digits, 6, a => {
    if (!a[0] || !a[2] || !a[4]) return
    const exact = (10*a[0]+a[1])*(10*a[2]+a[3]) === 100*(10*a[4]+a[5])
    if (exact) { percentCount++; assert.equal(evaluate(279, a, 'unique').state, 'success') }
  })
  assert.equal(percentCount, 58)
  assert.equal(evaluate(279, [4,3,6,0,2,5], 'unique').state, 'progress')
  let all = 0, greater = 0, less = 0
  visitPermutations(question(69).digits, 5, a => {
    if (a[0]*a[1]*a[4] !== a[2]*10+a[3]) return
    all++
    if (a[0]*a[1] > 30) greater++
    if (a[0]*a[1] < 30) less++
  })
  assert.deepEqual([all,greater,less], [30,4,26])
})

test('dice probability counts match explicit pairs for every supported die and sum', () => {
  for (let sides=2;sides<=9;sides++) for (let sum=1;sum<=19;sum++) {
    let pairs = 0
    for (let first=1;first<=sides;first++) for (let second=1;second<=sides;second++) if (first+second===sum) pairs++
    assert.equal(diceWays(sum,sides), pairs, `${sides}-sided dice sum ${sum}`)
  }
})
