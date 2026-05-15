import type { PlayVariation } from '../types'

export type PassValidationIssue = {
  passId: string
  severity: 'warning' | 'error'
  message: string
}

export function validatePassEvents(variation: PlayVariation): PassValidationIssue[] {
  const issues: PassValidationIssue[] = []
  const playerIds = new Set(variation.players.map((player) => player.id))
  const seenNumbers = new Map<number, string>()

  for (const player of variation.players) {
    const previousId = seenNumbers.get(player.number)
    if (previousId) {
      issues.push({
        passId: '',
        severity: 'warning',
        message: `Player numbers should be unique: ${player.number} is used by ${previousId} and ${player.id}.`,
      })
    }
    seenNumbers.set(player.number, player.id)
  }

  const orderedPasses = [...variation.passes].sort((a, b) => a.startT - b.startT)

  orderedPasses.forEach((pass, index) => {
    if (!playerIds.has(pass.from)) {
      issues.push({ passId: pass.id, severity: 'error', message: `Missing passer ${pass.from}.` })
    }

    if (!playerIds.has(pass.to)) {
      issues.push({ passId: pass.id, severity: 'error', message: `Missing receiver ${pass.to}.` })
    }

    if (pass.endT <= pass.startT) {
      issues.push({
        passId: pass.id,
        severity: 'error',
        message: 'Pass end time must be after start time.',
      })
    }

    if (pass.endT - pass.startT < 0.1) {
      issues.push({
        passId: pass.id,
        severity: 'warning',
        message: 'Pass duration is very short.',
      })
    }

    const previous = orderedPasses[index - 1]
    if (previous && pass.startT < previous.endT) {
      issues.push({
        passId: pass.id,
        severity: 'warning',
        message: `Pass overlaps with ${previous.label ?? previous.id}.`,
      })
    }

    const carrierBeforePass =
      index === 0 ? variation.initialBallCarrierId : orderedPasses[index - 1]?.to
    if (carrierBeforePass && pass.from !== carrierBeforePass) {
      issues.push({
        passId: pass.id,
        severity: 'warning',
        message: `${pass.from} may not have the ball at ${pass.startT.toFixed(1)}s.`,
      })
    }

    const laterPass = orderedPasses.find((candidate) => candidate.from === pass.to && candidate.startT < pass.endT)
    if (laterPass) {
      issues.push({
        passId: laterPass.id,
        severity: 'warning',
        message: `${pass.to} passes before receiving the ball from ${pass.from}.`,
      })
    }
  })

  return issues
}
