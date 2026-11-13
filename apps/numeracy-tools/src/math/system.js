/** @typedef {{ variable: 'x' | 'y', m: number, b: number, a: number, c: number, d: number }} SystemConfig */
/** @typedef {{ n: number, d: number }} Rational */

/** @type {SystemConfig} */
export const defaultSystem = { variable: 'y', m: -2, b: 7, a: 4, c: 1, d: 5 }
export const presets = [
  { name: 'Original example', config: defaultSystem },
  { name: 'Subtract y', config: { ...defaultSystem, m: 2, b: -3, a: 3, c: -1, d: 8 } },
  { name: 'Multiply the expression', config: { ...defaultSystem, m: -1, b: 4, a: 2, c: 3, d: 10 } },
  { name: 'Isolate x', config: { ...defaultSystem, variable: /** @type {'x'} */ ('x'), m: 2, b: 1, a: 1, c: 3, d: 17 } },
  { name: 'Fractional solution', config: { ...defaultSystem, m: 1, b: 1, a: 2, c: 1, d: 2 } },
]

/** @param {number} n @param {number} [d] @returns {Rational} */
export function rational(n, d = 1) {
  if (d === 0) throw new Error('Cannot divide by zero.')
  let a = Math.abs(n), b = Math.abs(d)
  while (b) [a, b] = [b, a % b]
  const divisor = a || 1
  return { n: n / divisor * Math.sign(d), d: Math.abs(d) / divisor }
}
/** @param {Rational} value */
export function fraction(value) {
  return value.d === 1 ? String(value.n) : `\\frac{${value.n}}{${value.d}}`
}
/** @param {number} coefficient @param {string} variable */
function term(coefficient, variable) {
  return coefficient === 0 ? '0' : coefficient === 1 ? variable : coefficient === -1 ? `-${variable}` : `${coefficient}${variable}`
}
/** @param {string} expression @param {number} value @param {boolean} [showZero] */
function addConstant(expression, value, showZero = false) {
  return value === 0 && !showZero ? expression : `${expression} ${value < 0 ? '-' : '+'} ${Math.abs(value)}`
}
/** @param {number} m @param {string} variable @param {number} b */
function linear(m, variable, b) { return m === 0 ? String(b) : addConstant(term(m, variable), b) }
/** @param {number} a @param {string} u @param {number} c @param {string} v */
function sumTerms(a, u, c, v) {
  if (a === 0) return term(c, v)
  if (c === 0) return term(a, u)
  return `${term(a, u)} ${c < 0 ? '-' : '+'} ${term(Math.abs(c), v)}`
}
/** @param {string} tex */
export function readable(tex) {
  return tex.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1 over $2)').replace(/\\;/g, ' ').replace(/-/g, '−')
}
/** @param {SystemConfig} config */
export function validateSystem(config) {
  if (!['x', 'y'].includes(config.variable)) return 'Choose x or y as the isolated variable.'
  for (const key of /** @type {const} */ (['m', 'b', 'a', 'c', 'd'])) {
    if (!Number.isInteger(config[key]) || Math.abs(config[key]) > 20) return 'Enter whole numbers from −20 to 20 in every box.'
  }
  if (config.c === 0) return `The coefficient of ${config.variable} in the second equation must not be zero, so there is a variable to substitute.`
  if (config.a + config.c * config.m === 0) {
    return config.d === config.c * config.b
      ? 'These equations have infinitely many solutions. Choose values that give one solution for this animation.'
      : 'These equations have no solution. Choose values that give one solution for this animation.'
  }
  return ''
}

/** @param {SystemConfig} config */
export function systemPreview(config) {
  const v = config.variable, u = v === 'y' ? 'x' : 'y'
  return [readable(`${v} = ${linear(config.m, u, config.b)}`), readable(`${sumTerms(config.a, u, config.c, v)} = ${config.d}`)]
}

/** @param {SystemConfig} config */
export function buildLesson(config) {
  const error = validateSystem(config)
  if (error) throw new Error(error)
  const { variable: v, m, b, a, c, d } = config
  const u = v === 'y' ? 'x' : 'y'
  const coefficient = a + c * m, constant = c * b, remainder = d - constant
  const otherValue = rational(remainder, coefficient)
  const isolatedValue = rational(m * otherValue.n + b * otherValue.d, otherValue.d)
  const other = fraction(otherValue), isolated = fraction(isolatedValue)
  const x = v === 'x' ? isolatedValue : otherValue
  const y = v === 'y' ? isolatedValue : otherValue
  const expression = linear(m, u, b)
  const prefix = a === 0
    ? (c === 1 ? '' : c === -1 ? '-' : String(c))
    : `${term(a, u)}\\; ${c < 0 ? '-' : '+'}${Math.abs(c) === 1 ? '' : `\\; ${Math.abs(c)}`}`
  const sourceSubstitution = addConstant(term(m, `(${other})`), b)
  const product = fraction(rational(m * otherValue.n, otherValue.d))
  const substituted = `${prefix} (${expression}) = ${d}`
  const fragments = {
    variable: v, equals: '=', rhs: String(d), prefix, expression,
    leftBracket: '(', rightBracket: ')',
    solution: `(x,y) = (${fraction(x)},${fraction(y)})`,
    firstEquation: `${v} = ${expression}`,
    firstCheck: `${isolated} = ${sourceSubstitution}`,
    firstTrue: `${isolated} = ${isolated}`,
    secondEquation: `${sumTerms(a, u, c, v)} = ${d}`,
    secondCheck: `${sumTerms(a, `(${other})`, c, `(${isolated})`)} = ${d}`,
    secondTrue: `${d} = ${d}`,
  }
  /** @param {string} left @param {string} right @param {boolean} [accent] */
  const row = (left, right, accent = false) => ({ left, right, accent, description: `${readable(left)} equals ${readable(right)}.` })
  const solutionLines = [
    row(addConstant(sumTerms(a, u, c * m, u), constant), String(d)),
    row(linear(coefficient, u, constant), String(d)),
    row(addConstant(linear(coefficient, u, constant), -constant, true), addConstant(String(d), -constant, true)),
    row(term(coefficient, u), String(remainder)),
    row(`\\frac{${term(coefficient, u)}}{${coefficient}}`, `\\frac{${remainder}}{${coefficient}}`),
    row(u, other, true),
    row(v, expression),
    row(v, sourceSubstitution),
    row(v, addConstant(product, b)),
    row(v, isolated, true),
  ]
  const steps = [
    { title: 'Pack the expression', short: 'Pack', text: `${readable(fragments.firstEquation)}. Put the entire expression inside the chest labelled ${v}.`, result: `${v} contains ${readable(expression)}.`, duration: 4600 },
    { title: `Replace ${v} with its chest`, short: 'Replace', text: `Replace ${v} in ${readable(fragments.secondEquation)} with the same chest.`, result: readable(substituted), duration: 3200 },
    { title: 'Unpack the substitution', short: 'Unpack', text: 'Open the chest and keep its expression together in brackets.', result: readable(substituted), duration: 4200 },
    { title: 'Solve the system', short: 'Solve', text: `Simplify, solve for ${u}, then substitute back to find ${v}.`, result: `x = ${readable(fraction(x))} and y = ${readable(fraction(y))}.`, duration: 16000 },
    { title: 'Check both equations', short: 'Check', text: 'Check the solution in both original equations.', result: `${readable(fragments.firstCheck)} and ${readable(fragments.secondCheck)}. Both are true.`, duration: 2600 },
  ]
  return { config: { ...config }, fragments, solutionLines, steps, x, y }
}

/** @param {ReturnType<typeof buildLesson>} lesson */
export function lessonExpressions(lesson) {
  return [...new Set([...Object.values(lesson.fragments), ...lesson.solutionLines.flatMap(line => [line.left, line.right])])].filter(Boolean)
}
