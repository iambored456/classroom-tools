import generated from './generated.json'
import { buildLesson, defaultSystem } from './system.js'

export type MathAsset = { viewBox: string; top: number; width: number; height: number; markup: string }
const assets: Record<string, MathAsset> = { ...generated }
export function mathAsset(tex: string): MathAsset {
  const asset = assets[tex]
  if (!asset) throw new Error(`Missing MathJax asset: ${tex}`)
  return asset
}

export async function prepareMath(expressions: string[]) {
  const missing = [...new Set(expressions)].filter(tex => tex && !assets[tex])
  if (!missing.length) return
  const { renderExpressions } = await import('./render')
  Object.assign(assets, renderExpressions(missing))
}

export const mathWidth = (tex: string, size: number) => tex ? mathAsset(tex).width * size / 1000 : 0
export const solutionSize = 32
export const solutionEqualsX = 530
export const solutionFirstBaseline = 43
type SolutionLine = { left: string; right: string; description: string; accent?: boolean }

export function layoutSolution(lines: SolutionLine[]) {
  const calculate = (size: number) => {
    let previousBottom = solutionFirstBaseline + 8
    const gap = 11 * size / solutionSize
    const rows = lines.map(line => {
      const parts = [mathAsset(line.left), mathAsset('='), mathAsset(line.right)]
      const top = Math.min(...parts.map(part => part.top)) * size / 1000
      const bottom = Math.max(...parts.map(part => part.top + part.height)) * size / 1000
      const baseline = previousBottom + gap - top
      previousBottom = baseline + bottom
      return { ...line, baseline }
    })
    return { size, rows, bottom: previousBottom }
  }
  let layout = calculate(solutionSize)
  let factor = Math.min(1, (485 - solutionFirstBaseline - 8) / (layout.bottom - solutionFirstBaseline - 8))
  for (const line of lines) {
    factor = Math.min(factor, 435 / (mathWidth(line.left, solutionSize) + 25), 375 / (mathWidth(line.right, solutionSize) + 25))
  }
  if (factor < 1) layout = calculate(solutionSize * factor)
  return layout
}

export const solutionRows = layoutSolution(buildLesson(defaultSystem).solutionLines).rows
