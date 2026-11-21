export type LabelStyle = 'decimal' | 'fraction'

export const spans = [
  1_000_000, 500_000, 200_000, 100_000, 50_000, 20_000, 10_000, 5000, 2000, 1000,
  500, 200, 100, 50, 20, 15, 10, 5, 2, 1, .5, .2, .1, .05, .02, .01, .005, .002,
  .001, .0005, .0002, .0001, .00005, .00002, .00001,
]
// Split each zoom interval into three equal steps on the logarithmic scale.
export const wheelSpans = spans.flatMap((span, i) => {
  const next = spans[i + 1]
  if (next === undefined) return [span]
  const ratio = Math.cbrt(next / span)
  return [span, span * ratio, span * ratio ** 2]
})
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const display = (value: number) => Number(value.toFixed(7)).toFixed(7).replace(/\.?0+$/, '')

export function zoomStep(span: number, direction: number, narrowest: number, levels = spans) {
  if (direction > 0) {
    return Math.max(narrowest, levels.find(step => step < span * (1 - 1e-9)) ?? narrowest)
  }
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i] > span * (1 + 1e-9)) return levels[i]
  }
  return levels[0]
}

export function decimalPlaces(step: number) {
  // All steps are finite decimals, but multiplying their floating point values can add noise.
  return (step.toFixed(7).replace(/0+$/, '').split('.')[1] ?? '').length
}

export function snap(value: number, step: number) {
  return Number((Math.round(value / step) * step).toFixed(decimalPlaces(step)))
}

function asFraction(value: number, places: number) {
  const scale = 10 ** places
  const units = Math.round(Math.abs(value) * scale)
  const whole = Math.floor(units / scale)
  const remainder = units % scale
  const sign = value < 0 ? '−' : ''
  if (!remainder) return sign + whole
  let a = remainder
  let b = scale
  while (b) [a, b] = [b, a % b]
  return sign + (whole ? whole + ' ' : '') + (remainder / a) + '/' + (scale / a)
}

export function formatTick(value: number, places: number, style: LabelStyle) {
  return style === 'fraction'
    ? asFraction(value, places)
    : snap(value, 10 ** -places).toFixed(places).replace('-', '−')
}

export const targets = [
  { label: '0.7', value: .7, unit: .1 },
  { label: '−2.4', value: -2.4, unit: .1 },
  { label: '0.99', value: .99, unit: .01 },
  { label: '17.85', value: 17.85, unit: .01 },
  { label: '−17.85', value: -17.85, unit: .01 },
  { label: '100.00357', value: 100.00357, unit: .00001 },
]

export function locate(raw: number, unit: number, unitsPerPixel: number) {
  // Require enough screen space to choose between neighbouring values at this precision.
  if (unitsPerPixel * 12 > unit) return null
  return snap(raw, unit)
}
