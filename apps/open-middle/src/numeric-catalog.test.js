import {test} from 'node:test'
import assert from 'node:assert/strict'
import {numericQuestions, evaluateNumeric, placeNumeric, diceWays, subtractionDigits, evaluateNumericPairs} from './numeric-catalog.js'

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
  [29, [1,2,4,0,5,6,7,8,9,3], [1,2,4,0,7,8,5,6,9,3]],
  [33, [3,1,2,9], [9,8,1,2], 'smallest'],
  [43, [3,0,1,2,9,8], [3,0,2,1,9,8]],
  [44, [5,2,1,3], [5,1,2,3]],
  [47, [1,3,2,8,5,9], [9,3,2,8,5,1]],
  [56, [6,3,1,4,2,9], [6,3,1,4,2,8]],
  [57, [7,3,8,5,4,2,1,9,6], [7,3,8,5,4,1,2,9,6]],
  [51, [9,8,7,6,5,4], [1,2,9,4,5,3], 'greater'],
  [53, [8,7,9], [9,7,8]],
  [58, [1,3,2,6], [1,2,3,4], 'both'],
  [68, [3,2,9,9], [8,7,2,1], 'free'],
  [73, [3,2,4], [4,2,3]],
  [81, [4,6,9,5,3,2], [4,0,6,5,2,3]],
  [82, [5,4,9], [5,4,8]],
  [84, [6,4,8,3,5,7], [6,4,8,3,7,5]],
  [85, [8,7,1,5,4,2], [8,7,1,5,4,3]],
  [69, [2,3,5,4,9], [2,3,4,5,9], 'any'],
  [71, [8,7,5,6,0], [8,7,6,5,0], 'greater'],
  [86, [1,3,4,2,6,5,8], [1,3,4,2,6,8,5], 'greatest'],
  [89, [1,2,3,5,4,7], [1,2,3,7,4,5]],
  [90, [1,5,2,6,4,3], [1,2,3,5,4,7]],
  [94, [4,5,7,9,1,2,3,6], [7,9,4,5,1,2,3,6]],
  [107, [4,9,8,7,5,0,1,2], [4,9,8,7,3,0,1,2]],
  [108, [4,9,8,7,5,0,1,3], [4,9,8,6,5,0,1,3]],
  [109, [1,4,2,8,9,3,6], [1,4,2,8,9,6,3]],
  ['109-comparing-fractions', [1,4,8,9], [8,9,1,4]],
  [113, [1,2,3,6,7,8], [3,2,1,6,7,8]],
  [114, [1,2,3,4,6,5], [6,2,3,4,1,5]],
  [116, [1,2,0,5], [1,2,5,0]],
  [117, [1,9,2,8,3,7,4,6], [1,9,2,8,4,6,3,7]],
  [118, [7,3,4,6,8,9,1,2,5,0], [7,3,4,6,8,9,1,0,5,2]],
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

test('closest differences to 200 are optimal under each digit rule', () => {
  let best56 = Infinity, best57 = Infinity
  const answers56 = new Set(), answers57 = new Set()
  for (let left = 123; left <= 987; left++) {
    for (let right = 123; right <= 987; right++) {
      const operands = String(left) + String(right)
      if (operands.includes('0') || new Set(operands).size !== 6) continue
      const difference = left - right, distance = Math.abs(difference - 200)
      if (distance < best56) {best56 = distance; answers56.clear()}
      if (distance === best56) answers56.add(difference)
      const equation = operands + String(difference)
      if (difference < 100 || equation.includes('0') || new Set(equation).size !== 9) continue
      if (distance < best57) {best57 = distance; answers57.clear()}
      if (distance === best57) answers57.add(difference)
    }
  }
  assert.equal(best56, 2)
  assert.deepEqual([...answers56].sort((a,b)=>a-b), [198,202])
  assert.equal(best57, 4)
  assert.deepEqual([...answers57], [196])
  assert.equal(evaluate(56,[8,2,9,6,3,1]).state,'success')
  assert.equal(evaluate(56,[4,2,9,6,3,1]).state,'progress')
  assert.equal(evaluate(57,[7,3,8,5,4,2,1,6,9]).state,'progress')
  assert.equal(evaluate(57,[7,3,8,5,4,2,1,9,0]).state,'invalid')
})

test('Missing Digits preserves fixed prefixes, repetition rules and strict distance comparison', () => {
  assert.deepEqual(subtractionDigits(question(68),[3,2,9,9]),[4,3,2,1,9,9])
  assert.equal(evaluate(68,[3,2,9,9],'free').value,'233')
  assert.equal(evaluate(68,[3,2,9,9],'unique').state,'invalid')
  assert.equal(evaluate(68,[1,2,6,9],'unique').state,'success')
  assert.equal(evaluate(68,[1,2,6,2],'free').state,'progress') // 412 - 162 = 250: tie
  assert.equal(evaluate(68,[1,1,6,2],'free').state,'success') // 249
  assert.equal(evaluate(68,[1,3,6,2],'free').state,'progress') // 251
  assert.equal(evaluate(68,[0,2,6,9],'free').state,'invalid')
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(let c=1;c<=9;c++)for(let d=1;d<=9;d++) {
    const values=[a,b,c,d],difference=300+10*a+b-10*c-d
    assert.equal(evaluate(68,values,'free').state,difference<250?'success':'progress')
  }
})

test('fixed 291 is excluded from the movable bank and both pairs must be true and different', () => {
  const q=question(84),first=[6,4,8,3,5,7],second=[9,4,3,6,5,2]
  assert.deepEqual(subtractionDigits(q,first),[6,4,8,2,9,1])
  assert.equal(evaluateNumericPairs(q,[first,second]).state,'success')
  assert.equal(evaluateNumericPairs(q,[first,first]).state,'progress')
  assert.equal(evaluateNumericPairs(q,[first,[9,4,3,6,2,5]]).state,'progress')
  assert.equal(evaluateNumericPairs(q,[first,Array(6).fill(null)]).state,'incomplete')
  assert.equal(evaluate(84,[8,7,4,5,8,3]).state,'invalid') // repeated movable 8
  assert.equal(evaluate(84,[9,4,3,6,5,2]).state,'success') // fixed 9/2 do not consume digits
  assert.equal(evaluate(85,[8,7,1,5,4,2]).value,'329')
  assert.equal(evaluate(85,[5,4,2,8,7,1]).state,'progress')
})

test('new questions preserve strict comparison goals and shared digit restrictions', () => {
  assert.equal(evaluate(29, [3,5,4,0,6,2,7,8,9,1]).state, 'progress', '35 is a strict printed boundary')
  assert.equal(evaluate(29, [0,2,4,1,5,6,7,8,9,3]).state, 'invalid', 'two-digit numbers cannot start with zero')
  for (const mode of ['greater','less']) assert.equal(evaluate(51, [1,2,4,5,7,6], mode).state, 'progress', '700 does not meet either strict goal')
  assert.equal(evaluate(51, [1,2,9,4,5,3], 'less').state, 'success')
  assert.equal(evaluate(51, [9,8,7,6,5,4], 'less').state, 'progress')
  assert.equal(evaluate(81, [4,6,0,5,3,2]).state, 'success')
  assert.equal(evaluate(81, [4,6,9,4,8,7]).state, 'invalid', 'digits are shared across both numbers')
  assert.equal(evaluate(82, [4,5,0]).value, '500', 'the lower rounding boundary is inclusive')
  assert.equal(evaluate(82, [5,6,0]).value, '600', 'numbers beyond the upper boundary round up')
  assert.equal(evaluate(84, [4,2,6,1,3,5]).state, 'success', 'printed 291 does not consume movable 1 or 2')
  assert.equal(evaluate(84, [4,2,7,1,3,6]).state, 'success', 'a second distinct arrangement works')
  assert.equal(evaluate(85, [9,1,6,5,8,7]).state, 'success', 'every exact difference of 329 is accepted')
  assert.equal(evaluate(86, [1,6,5,8,3,4,2], 'smallest').state, 'success')
  assert.equal(evaluate(86, [1,6,5,8,3,4,2], 'greatest').state, 'progress')
  assert.equal(evaluate(86, [1,3,4,2,6,5,8], 'smallest').state, 'progress')
})

test('independent exhaustive searches verify the new maximum and subtraction goals', () => {
  let maximumProduct = -Infinity
  visitPermutations([1,2,3,4], 3, a => { maximumProduct = Math.max(maximumProduct, (10*a[0]+a[1])*a[2]) })
  assert.equal(maximumProduct, 128)
  let largestRoundingNumber = -Infinity
  visitPermutations(Array.from({length:10}, (_,i)=>i), 3, a => {
    const value=100*a[0]+10*a[1]+a[2]
    if (value>=450&&value<550) largestRoundingNumber=Math.max(largestRoundingNumber,value)
  })
  assert.equal(largestRoundingNumber, 549)
  let fixedSubtractionSolutions=0
  visitPermutations([1,2,3,4,5,6,7,8,9], 6, a => {
    const exact=100*a[0]+10*a[1]+a[2]-291===100*a[3]+10*a[4]+a[5]
    assert.equal(evaluate(84,a).state==='success',exact)
    if (exact) fixedSubtractionSolutions++
  })
  assert.equal(fixedSubtractionSolutions,64)
  let minimum=Infinity,maximum=-Infinity,solutions=0
  visitPermutations([1,2,3,4,5,6,7,8,9], 7, a => {
    const difference=1000*a[0]-(100*a[1]+10*a[2]+a[3])
    if (difference!==100*a[4]+10*a[5]+a[6]) {
      assert.notEqual(evaluate(86,a,'greatest').state,'success')
      return
    }
    minimum=Math.min(minimum,difference);maximum=Math.max(maximum,difference);solutions++
    assert.equal(evaluate(86,a,'greatest').state==='success',difference===658)
    assert.equal(evaluate(86,a,'smallest').state==='success',difference===342)
  })
  assert.deepEqual({minimum,maximum,solutions},{minimum:342,maximum:658,solutions:16})
})

test('mixed-number, decimal, and pattern additions preserve their exact source goals',()=>{
 assert.equal(evaluate(89,[1,8,2,3,4,5]).state,'invalid','mixed-number fractional parts must be proper')
 assert.equal(evaluate(89,[3,5,1,2,4,7]).state,'success','addition is commutative')
 assert.equal(evaluate(108,[5,0,1,3,4,9,8,7]).state,'success','decimals may be in either order')
 assert.equal(evaluate(108,[4,8,9,7,5,1,0,3]).state,'progress','equal distances of .103 are not the closest possible')
 const digitsOf=value=>String(value).padStart(4,'0').split('').map(Number)
 let closest=null
 for(let distance=1;distance<=13;distance++){
  const digits=[...digitsOf(5000-distance),...digitsOf(5000+distance)]
  if(new Set(digits).size===8){closest=distance;break}
 }
 assert.equal(closest,13)
 let smallest=Infinity
 visitPermutations([1,2,3,4,5,6,7,8,9],6,a=>{
  if([1,3,5].some(i=>a[i]>=8))return
  const sum=8*a[0]+a[1]+8*a[2]+a[3]
  if(sum===8*a[4]+a[5])smallest=Math.min(smallest,sum)
 })
 assert.equal(smallest,35)
 assert.equal(evaluate(117,[7,3,6,2,5,1,4,0]).state,'success','decreasing patterns are accepted')
 assert.equal(evaluate(118,[7,3,4,6,8,9,1,0,5,2]).state,'progress','right tick must exceed the middle decimal')
 assert.equal(evaluate(118,[7,3,4,6,8,9,0,1,5,2]).state,'invalid','right tick has two whole-number digits')
 assert.equal(evaluate(119,[1,2,3,5,0]).state,'success','existing #119 remains available')
})
