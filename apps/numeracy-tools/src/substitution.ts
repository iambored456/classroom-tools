import { solutionSize, solutionEqualsX, solutionFirstBaseline } from './math/layout'

import { buildLesson, defaultSystem } from './math/system.js'
export const steps = buildLesson(defaultSystem).steps

export const clamp = (value: number) => Math.max(0, Math.min(1, value))
export function phase(progress: number, start = 0, end = 1) {
  const t = clamp((progress - start) / (end - start))
  return t * t * (3 - 2 * t)
}

// Share the exact quadratic curve between the guide and the moving chest.
const transfer = { start: { x: 270, y: 125 }, control: { x: 235, y: 245 }, end: { x: 420, y: 335 } }
export const chestTransferPath = `M${transfer.start.x} ${transfer.start.y} Q${transfer.control.x} ${transfer.control.y} ${transfer.end.x} ${transfer.end.y}`

function transferPoint(t: number) {
  const u = 1 - t
  return {
    x: u * u * transfer.start.x + 2 * u * t * transfer.control.x + t * t * transfer.end.x,
    y: u * u * transfer.start.y + 2 * u * t * transfer.control.y + t * t * transfer.end.y,
  }
}

// One deterministic timeline drives every object, so scrubbing and replay agree.
export function chestPose(step: number, progress: number) {
  const pack = step === 0 ? progress : 1
  const move = step < 1 ? 0 : step === 1 ? phase(progress, .08, .92) : 1
  const position = transferPoint(move)
  const unpack = step < 2 ? 0 : step === 2 ? progress : 1
  const drop = phase(unpack, .65, 1)
  return {
    x: position.x,
    y: position.y + 150 * drop,
    opacity: phase(pack, .02, .2) * (1 - drop),
    lid: step === 0 ? 30 * phase(progress, .15, .28) * (1 - phase(progress, .83, 1)) : 85 * phase(unpack, .02, .3),
    rotation: 15 * drop,
  }
}

export function expressionPose(step: number, progress: number) {
  if (step === 0) {
    const travel = phase(progress, .28, .86)
    return { x: 520 - 250 * travel, y: 125 - 70 * Math.sin(Math.PI * travel), scale: 1 - .8 * travel, opacity: 1 - phase(progress, .84, .94), brackets: phase(progress, .12, .27) }
  }
  const emerge = phase(progress, .22, .72)
  return { x: 420, y: 335 - 75 * Math.sin(Math.PI * emerge), scale: .2 + .8 * emerge, opacity: step === 2 ? phase(progress, .2, .38) : 0, brackets: 1 }
}

// Start with the exact unpacked equation, then make room below it.
export function solutionPose(progress: number, size = solutionSize, equalsX = 630) {
  const settle = phase(progress, 0, .14)
  const finalScale = size / 54
  return {
    x: (solutionEqualsX - equalsX * finalScale) * settle,
    y: (solutionFirstBaseline - 355 * finalScale) * settle,
    scale: 1 + (finalScale - 1) * settle,
  }
}

export function solutionLineOpacity(progress: number, index: number) {
  const start = .16 + index * .08
  return phase(progress, start, start + .045)
}

// Reserve only the space currently needed around the replacement variable.
export function replacementSpacing(step: number, progress: number, variableWidth: number, expressionWidth: number, equalsWidth: number) {
  const chestSpace = step < 1 ? 0 : step === 1 ? phase(progress, .25, .7) : 1
  const expressionSpace = step < 2 ? 0 : step === 2 ? phase(progress, .22, .75) : 1
  const variableHalf = variableWidth / 2
  const chestHalf = 50
  const expressionHalf = Math.max(chestHalf, expressionWidth / 2 + 30)
  const halfWidth = variableHalf + (chestHalf - variableHalf) * chestSpace + (expressionHalf - chestHalf) * expressionSpace
  const gap = 12 + 8 * chestSpace
  return {
    prefixEnd: 420 - halfWidth - gap,
    equalsX: 420 + halfWidth + gap + equalsWidth / 2,
  }
}
