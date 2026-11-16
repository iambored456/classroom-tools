export type Quadratic = { a: number; b: number; c: number }
export const defaultExample = { name: 'Two negative zeros', a: 1, b: 5, c: 6 }
export const examples = [
  { name: 'Over the axis', a: -1, b: 2, c: 8 },
  { name: 'Under the axis', a: 1, b: -2, c: -8 },
  { name: 'Two positive zeros', a: -1, b: 7, c: -10 },
  { name: 'Fractional zero', a: -2, b: 5, c: 3 },
  { name: 'Common factor', a: -2, b: 4, c: 16 },
  { name: 'A zero at the origin', a: 1, b: -4, c: 0 },
  defaultExample,
]

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a)
export const numberText = (n: number) => String(Object.is(n, -0) ? 0 : n).replace('-', '−')
export function fraction(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator)
  const n = numerator * Math.sign(denominator) / divisor
  const d = Math.abs(denominator) / divisor
  return d === 1 ? numberText(n) : `${numberText(n)}/${d}`
}

function term(coefficient: number, variable: string, first: boolean) {
  if (!coefficient) return ''
  const sign = coefficient < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ')
  return `${sign}${Math.abs(coefficient) === 1 && variable ? '' : Math.abs(coefficient)}${variable}`
}
export function polynomial({ a, b, c }: Quadratic) {
  return term(a, 'x²', true) + term(b, 'x', !a) + term(c, '', !a && !b) || '0'
}
export const linear = (p: number, q: number) => term(p, 'x', true) + term(q, '', false)

export function factorQuadratic(config: Quadratic) {
  const { a, b, c } = config
  if (![a, b, c].every(Number.isInteger) || Math.abs(a) > 9 || Math.abs(b) > 40 || Math.abs(c) > 40) {
    throw new Error('Use whole numbers: a from −9 to 9, and b and c from −40 to 40.')
  }
  if (!a) throw new Error('Choose a nonzero a so the graph is a parabola.')
  const discriminant = b * b - 4 * a * c
  if (discriminant <= 0) throw new Error(discriminant === 0
    ? 'This quadratic has one repeated zero. Choose two distinct zeros for a cannonball flight.'
    : 'This quadratic has no real zeros. Choose an example with two x-intercepts.')
  if (!Number.isInteger(Math.sqrt(discriminant))) throw new Error('This quadratic does not factor over the rational numbers. Try one of the examples or change the coefficients.')

  // Remove the GCF (including a negative sign) before splitting the middle term.
  const common = Math.sign(a) * gcd(gcd(a, b), c)
  const A = a / common, B = b / common, C = c / common
  const m = (B - Math.sqrt(B * B - 4 * A * C)) / 2
  const n = B - m
  const r = gcd(A, m), p = A / r, q = m / r, s = n / p
  const firstFactor = linear(p, q), secondFactor = linear(r, s)
  const prefix = common === 1 ? '' : common === -1 ? '−' : numberText(common)
  const factored = `${prefix}(${firstFactor})(${secondFactor})`
  const wrap = (expression: string) => common === 1 ? expression : `${prefix}[${expression}]`
  const split = term(A, 'x²', true) + term(m, 'x', false) + term(n, 'x', false) + term(C, '', false)
  const grouped = `${term(r, 'x', true)}(${firstFactor})${s < 0 ? ' − ' : ' + '}${Math.abs(s)}(${firstFactor})`
  const rows = C === 0 ? [
    { label: 'Take out the common factor, including x', expression: factored },
  ] : [
    ...(common !== 1 ? [{ label: 'Take out the common factor', expression: wrap(polynomial({ a: A, b: B, c: C })) }] : []),
    { label: `Split the middle term: ${numberText(m)} + (${numberText(n)}) = ${numberText(B)}; ${numberText(m)} × (${numberText(n)}) = ${numberText(A * C)}`, expression: wrap(split) },
    { label: 'Group terms and take out each common factor', expression: wrap(grouped) },
    { label: 'Take out the shared bracket', expression: factored },
  ]
  const factors = [{ p, q, expression: firstFactor }, { p: r, q: s, expression: secondFactor }]
    .map(factor => ({ ...factor, root: -factor.q / factor.p || 0, rootLabel: fraction(-factor.q, factor.p) }))
    .sort((left, right) => left.root - right.root)
  return { ...config, common, p, q, r, s, factored, standard: polynomial(config), rows, factors, left: factors[0].root, right: factors[1].root }
}

export type FactoredQuadratic = ReturnType<typeof factorQuadratic>
export function flightPoint(lesson: FactoredQuadratic, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const x = t === 1 ? lesson.right : lesson.left + (lesson.right - lesson.left) * t
  // Factored evaluation keeps the launch and landing exactly on the axis.
  return { x, y: lesson.a * (x - lesson.left) * (x - lesson.right) || 0 }
}

export function graphGeometry(lesson: FactoredQuadratic, width = 960) {
  const height = 480
  const span = lesson.right - lesson.left
  const xMin = Math.min(0, lesson.left) - Math.max(1, span * .25)
  const xMax = Math.max(0, lesson.right) + Math.max(1, span * .25)
  const vertex = flightPoint(lesson, .5)
  const extent = Math.max(1, Math.abs(vertex.y))
  const yMin = lesson.a < 0 ? -extent * .65 : -extent * 1.32
  const yMax = lesson.a < 0 ? extent * 1.32 : extent * .65
  const xPixel = (x: number) => 65 + (x - xMin) / (xMax - xMin) * (width - 130)
  const yPixel = (y: number) => 30 + (yMax - y) / (yMax - yMin) * (height - 60)
  const ticks = (min: number, max: number, count = 12) => {
    const rough = (max - min) / count
    const magnitude = 10 ** Math.floor(Math.log10(rough))
    const step = [1, 2, 5, 10].map(n => n * magnitude).find(n => n >= rough)!
    return Array.from({ length: Math.floor(max / step) - Math.ceil(min / step) + 1 }, (_, i) => Number(((Math.ceil(min / step) + i) * step).toPrecision(10)))
  }
  const point = (progress: number) => {
    const position = flightPoint(lesson, progress)
    return { x: xPixel(position.x), y: yPixel(position.y) }
  }
  // A quadratic Bezier exactly represents the parabola between its zeros.
  const start = point(0), end = point(1), middle = point(.5)
  const path = `M${start.x} ${start.y} Q${middle.x} ${2 * middle.y - start.y} ${end.x} ${end.y}`
  const fullPath = Array.from({ length: 241 }, (_, i) => {
    const x = xMin + (xMax - xMin) * i / 240
    return `${i ? 'L' : 'M'}${xPixel(x)} ${yPixel(lesson.a * (x - lesson.left) * (x - lesson.right))}`
  }).join(' ')
  const angle = Math.atan2(2 * (middle.y - start.y), middle.x - start.x) * 180 / Math.PI
  const labelSpread = Math.max(0, (146 - (end.x - start.x)) / 2)
  const labelX = (index: number) => Math.max(70, Math.min(width - 70, (index ? end.x + labelSpread : start.x - labelSpread)))
  return { width, height, xPixel, yPixel, point, path, fullPath, angle, labelX, xTicks: ticks(xMin, xMax, width < 700 ? 7 : 12), yTicks: ticks(yMin, yMax) }
}
