import { solutionSize, solutionEqualsX, solutionFirstBaseline } from './math/layout'

export const steps = [
  { title: 'Pack the expression', short: 'Pack', text: 'Since y = −2x + 7, the whole expression can go inside a chest labelled y.', result: 'The y chest contains (−2x + 7).', duration: 4600 },
  { title: 'Replace y with its chest', short: 'Replace', text: 'Move the same y chest into 4x + y = 5. Equal quantities can replace one another.', result: '4x + the y chest = 5.', duration: 3200 },
  { title: 'Unpack the substitution', short: 'Unpack', text: 'Open the chest. Its entire expression replaces y, with brackets keeping it together.', result: '4x + (−2x + 7) = 5.', duration: 4200 },
  { title: 'Solve the system', short: 'Solve', text: 'Combine like terms, subtract 7 from both sides, and divide both sides by 2. Then substitute x = −1 into the first equation to find y. Each line stays visible.', result: 'x = −1 and y = 9.', duration: 16000 },
  { title: 'Check both equations', short: 'Check', text: 'The ordered pair (−1, 9) must make both original equations true.', result: '9 = −2(−1) + 7 and 4(−1) + 9 = 5. Both are true.', duration: 2600 },
] as const

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
export function solutionPose(progress: number) {
  const settle = phase(progress, 0, .14)
  const finalScale = solutionSize / 54
  return {
    x: (solutionEqualsX - 630 * finalScale) * settle,
    y: (solutionFirstBaseline - 355 * finalScale) * settle,
    scale: 1 + (finalScale - 1) * settle,
  }
}

export function solutionLineOpacity(progress: number, index: number) {
  const start = .16 + index * .08
  return phase(progress, start, start + .045)
}
