import generated from './generated.json'
import { solutionLines } from './notation.js'

type MathAsset = { viewBox: string; top: number; width: number; height: number; markup: string }
export function mathAsset(tex: string): MathAsset {
  const asset = (generated as Record<string, MathAsset>)[tex]
  if (!asset) throw new Error(`Missing MathJax asset: ${tex}. Run generate:math.`)
  return asset
}
export const mathWidth = (tex: string, size: number) => mathAsset(tex).width * size / 1000
export const solutionSize = 32
export const solutionEqualsX = 530
export const solutionFirstBaseline = 43

// Let the actual glyph bounds determine row spacing, including tall fractions.
let previousBottom = solutionFirstBaseline + 8
export const solutionRows = solutionLines.map(line => {
  const parts = [mathAsset(line.left), mathAsset('='), mathAsset(line.right)]
  const top = Math.min(...parts.map(part => part.top)) * solutionSize / 1000
  const bottom = Math.max(...parts.map(part => part.top + part.height)) * solutionSize / 1000
  const baseline = previousBottom + 11 - top
  previousBottom = baseline + bottom
  return { ...line, baseline }
})
