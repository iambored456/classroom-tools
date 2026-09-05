import { type PadColor, COLOR_PALETTE } from '@classroom-tools/launchpad-midi'
import {
  type LaunchpadRgb,
  cancelConnectionFeedback,
  clearAllPads,
  lightPad,
  lightPadsRgb,
  noteMapping,
  turnOffPad,
} from './midi.svelte.ts'

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'ended'
export type Difficulty = 'warm-up' | 'classic' | 'lightning'
export type FeedbackTone = 'neutral' | 'hit' | 'miss'

export type ExplosionPad = {
  note: number
  color: string
}

type DifficultySettings = {
  label: string
  description: string
  startingLifetime: number
  endingLifetime: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  'warm-up': {
    label: 'Warm-up',
    description: 'A steady pace with generous targets.',
    startingLifetime: 1_900,
    endingLifetime: 1_250,
  },
  classic: {
    label: 'Classic',
    description: 'Starts brisk and speeds up as you play.',
    startingLifetime: 1_450,
    endingLifetime: 800,
  },
  lightning: {
    label: 'Lightning',
    description: 'Fast targets for experienced players.',
    startingLifetime: 950,
    endingLifetime: 540,
  },
}

export const gameState = $state({
  score: 0,
  bestScore: 0,
  hits: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,
  timeLeft: 0,
  gamePhase: 'idle' as GamePhase,
  activeNote: null as number | null,
  activePadColor: null as PadColor | null,
  explosionPads: [] as ExplosionPad[],
  countdownNotes: [] as number[],
  timerDuration: 30,
  difficulty: 'classic' as Difficulty,
  countdownText: '',
  feedbackText: 'Choose a round and start when you are ready.',
  feedbackTone: 'neutral' as FeedbackTone,
  lastScoreGain: 0,
  targetProgress: 1,
  isNewBest: false,
})

let clockInterval: ReturnType<typeof setInterval> | null = null
let targetTimeout: ReturnType<typeof setTimeout> | null = null
let nextTargetTimeout: ReturnType<typeof setTimeout> | null = null
let feedbackTimeout: ReturnType<typeof setTimeout> | null = null
let celebrationInterval: ReturnType<typeof setInterval> | null = null
let explosionTimeouts: ReturnType<typeof setTimeout>[] = []
let roundToken = 0
let roundEndsAt = 0
let targetStartedAt = 0
let targetLifetime = 0
let lastTargetNote: number | null = null

const BEST_SCORE_KEY = 'launchpad-whack-a-mole-best-score'

export function initializeGame(): void {
  try {
    const savedScore = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '', 10)
    if (Number.isFinite(savedScore) && savedScore > 0) gameState.bestScore = savedScore
  } catch {
    // Storage may be unavailable in privacy-focused browsing modes.
  }
}

export function setTimerDuration(value: number): void {
  if (gameState.gamePhase === 'playing' || gameState.gamePhase === 'countdown') return
  gameState.timerDuration = value
}

export function setDifficulty(value: Difficulty): void {
  if (gameState.gamePhase === 'playing' || gameState.gamePhase === 'countdown') return
  gameState.difficulty = value
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function getAccuracy(): number {
  const attempts = gameState.hits + gameState.misses
  return attempts === 0 ? 100 : Math.round((gameState.hits / attempts) * 100)
}

function getRandomColor(): PadColor {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer !== null) clearTimeout(timer)
}

function cancelTimers(): void {
  if (clockInterval !== null) clearInterval(clockInterval)
  if (celebrationInterval !== null) clearInterval(celebrationInterval)
  clearTimer(targetTimeout)
  clearTimer(nextTargetTimeout)
  clearTimer(feedbackTimeout)
  clockInterval = null
  targetTimeout = null
  nextTargetTimeout = null
  feedbackTimeout = null
  celebrationInterval = null
  cancelExplosion()
}

function cancelExplosion(): void {
  for (const timeout of explosionTimeouts) clearTimeout(timeout)
  explosionTimeouts = []
  for (const pad of gameState.explosionPads) turnOffPad(pad.note)
  gameState.explosionPads = []
}

function notesAtRadius(centerNote: number, radius: number): number[] {
  const centerIndex = noteMapping.indexOf(centerNote)
  if (centerIndex < 0) return []

  const centerRow = Math.floor(centerIndex / 8)
  const centerColumn = centerIndex % 8
  return noteMapping.filter((_note, index) => {
    const row = Math.floor(index / 8)
    const column = index % 8
    return Math.round(Math.hypot(row - centerRow, column - centerColumn)) === radius
  })
}

function explosionColorAtRadius(hex: string, radius: number): { css: string; rgb: LaunchpadRgb } {
  const falloff = [1, 0.82, 0.64, 0.48, 0.34][radius] ?? 0.34
  const source = [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
  const strongestChannel = Math.max(...source, 1)
  const scale = (channel: number) =>
    Math.round((channel / strongestChannel) * 127 * falloff)
  const rgb: LaunchpadRgb = [scale(source[0]), scale(source[1]), scale(source[2])]
  const css = `#${rgb
    .map((channel) => Math.round((channel / 127) * 255).toString(16).padStart(2, '0'))
    .join('')}`
  return { css, rgb }
}

function showExplosionLayer(notes: number[], color: PadColor, radius: number): void {
  const layerColor = explosionColorAtRadius(color.hex, radius)
  const litNotes = new Set(gameState.explosionPads.map((pad) => pad.note))
  const newPads = notes
    .filter((note) => !litNotes.has(note))
    .map((note) => ({ note, color: layerColor.css }))

  gameState.explosionPads = [...gameState.explosionPads, ...newPads]
  lightPadsRgb(newPads.map((pad) => ({ note: pad.note, color: layerColor.rgb })))
}

function playHitExplosion(centerNote: number, color: PadColor, token: number): number {
  cancelExplosion()
  const frameDuration = 68
  const maximumRadius = 4

  for (let radius = 0; radius <= maximumRadius; radius += 1) {
    explosionTimeouts.push(
      setTimeout(() => {
        if (token !== roundToken || gameState.gamePhase !== 'playing') return
        showExplosionLayer(notesAtRadius(centerNote, radius), color, radius)
      }, radius * frameDuration),
    )
  }

  const totalDuration = (maximumRadius + 1) * frameDuration
  explosionTimeouts.push(
    setTimeout(() => {
      if (token !== roundToken) return
      cancelExplosion()
    }, totalDuration),
  )
  return totalDuration
}

function clearActiveTarget(): void {
  if (gameState.activeNote !== null) turnOffPad(gameState.activeNote)
  gameState.activeNote = null
  gameState.activePadColor = null
  gameState.targetProgress = 1
  clearTimer(targetTimeout)
  targetTimeout = null
}

function resetRoundStats(): void {
  gameState.score = 0
  gameState.hits = 0
  gameState.misses = 0
  gameState.streak = 0
  gameState.bestStreak = 0
  gameState.lastScoreGain = 0
  gameState.isNewBest = false
}

function roundProgress(): number {
  if (gameState.timerDuration <= 0) return 0
  return Math.min(1, Math.max(0, 1 - (roundEndsAt - performance.now()) / (gameState.timerDuration * 1_000)))
}

function currentTargetLifetime(): number {
  const settings = DIFFICULTIES[gameState.difficulty]
  const progress = roundProgress()
  return Math.round(
    settings.startingLifetime + (settings.endingLifetime - settings.startingLifetime) * progress,
  )
}

function chooseTargetNote(): number {
  if (noteMapping.length <= 1) return noteMapping[0]
  let note = noteMapping[Math.floor(Math.random() * noteMapping.length)]
  while (note === lastTargetNote) note = noteMapping[Math.floor(Math.random() * noteMapping.length)]
  return note
}

function spawnTarget(token: number): void {
  if (token !== roundToken || gameState.gamePhase !== 'playing') return
  if (performance.now() >= roundEndsAt) {
    finishRound(token)
    return
  }

  clearActiveTarget()
  const note = chooseTargetNote()
  const color = getRandomColor()
  lastTargetNote = note
  targetStartedAt = performance.now()
  targetLifetime = currentTargetLifetime()
  gameState.activeNote = note
  gameState.activePadColor = color
  gameState.targetProgress = 1
  lightPad(note, color.velocity)

  targetTimeout = setTimeout(() => {
    if (token !== roundToken || gameState.gamePhase !== 'playing' || gameState.activeNote !== note) return
    registerMiss('Too slow - next one!')
    clearActiveTarget()
    scheduleNextTarget(token, 120)
  }, targetLifetime)
}

function scheduleNextTarget(token: number, delay: number): void {
  clearTimer(nextTargetTimeout)
  nextTargetTimeout = setTimeout(() => spawnTarget(token), delay)
}

function setFeedback(text: string, tone: FeedbackTone, token: number): void {
  gameState.feedbackText = text
  gameState.feedbackTone = tone
  clearTimer(feedbackTimeout)
  feedbackTimeout = setTimeout(() => {
    if (token !== roundToken || gameState.gamePhase !== 'playing') return
    gameState.feedbackText = gameState.streak >= 2 ? `${gameState.streak} hit streak` : 'Find the glowing pad.'
    gameState.feedbackTone = 'neutral'
  }, 650)
}

function registerMiss(message: string): void {
  gameState.misses += 1
  gameState.streak = 0
  gameState.lastScoreGain = 0
  setFeedback(message, 'miss', roundToken)
}

export function handlePadPress(note: number): void {
  if (gameState.gamePhase !== 'playing' || !noteMapping.includes(note)) return
  if (gameState.activeNote === null) return

  if (note !== gameState.activeNote) {
    registerMiss('Wrong pad - look for the glow.')
    return
  }

  const hitNote = gameState.activeNote
  const hitColor = gameState.activePadColor
  const responseTime = performance.now() - targetStartedAt
  const speedRatio = Math.max(0, Math.min(1, 1 - responseTime / targetLifetime))
  const speedBonus = Math.round(speedRatio * 50)
  gameState.hits += 1
  gameState.streak += 1
  gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak)
  const streakBonus = Math.min((gameState.streak - 1) * 10, 100)
  const points = 100 + speedBonus + streakBonus
  gameState.score += points
  gameState.lastScoreGain = points
  setFeedback(`Great hit! +${points}`, 'hit', roundToken)
  clearActiveTarget()
  const explosionDuration = hitColor ? playHitExplosion(hitNote, hitColor, roundToken) : 90
  scheduleNextTarget(roundToken, explosionDuration + 35)
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const DIGIT_PATTERNS: Record<number, string[]> = {
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
}

function notesForDigit(digit: number): number[] {
  const pattern = DIGIT_PATTERNS[digit] ?? []
  const notes: number[] = []
  for (let row = 0; row < pattern.length; row += 1) {
    for (let col = 0; col < pattern[row].length; col += 1) {
      if (pattern[row][col] === '1') notes.push(noteMapping[row * 8 + col + 1])
    }
  }
  return notes
}

async function runCountdown(token: number): Promise<boolean> {
  const colors = [13, 45, 21]
  for (let index = 0; index < 3; index += 1) {
    if (token !== roundToken || gameState.gamePhase !== 'countdown') return false
    const digit = 3 - index
    const notes = notesForDigit(digit)
    gameState.countdownText = String(digit)
    gameState.countdownNotes = notes
    for (const note of notes) lightPad(note, colors[index])
    await wait(760)
    for (const note of notes) turnOffPad(note)
    gameState.countdownNotes = []
    await wait(120)
  }
  return token === roundToken && gameState.gamePhase === 'countdown'
}

function updateClock(token: number): void {
  if (token !== roundToken || gameState.gamePhase !== 'playing') return
  const now = performance.now()
  const remaining = Math.max(0, roundEndsAt - now)
  gameState.timeLeft = Math.ceil(remaining / 1_000)
  if (gameState.activeNote !== null && targetLifetime > 0) {
    gameState.targetProgress = Math.max(0, Math.min(1, 1 - (now - targetStartedAt) / targetLifetime))
  }
  if (remaining <= 0) finishRound(token)
}

export async function startGame(): Promise<void> {
  if (gameState.gamePhase === 'playing' || gameState.gamePhase === 'countdown') return

  roundToken += 1
  const token = roundToken
  cancelConnectionFeedback()
  cancelTimers()
  clearAllPads()
  clearActiveTarget()
  resetRoundStats()
  lastTargetNote = null
  gameState.timeLeft = gameState.timerDuration
  gameState.gamePhase = 'countdown'
  gameState.feedbackText = 'Get ready...'
  gameState.feedbackTone = 'neutral'

  const completed = await runCountdown(token)
  if (!completed) return
  gameState.countdownText = 'GO!'
  await wait(220)
  if (token !== roundToken || gameState.gamePhase !== 'countdown') return

  gameState.countdownText = ''
  gameState.gamePhase = 'playing'
  gameState.feedbackText = 'Find the glowing pad.'
  roundEndsAt = performance.now() + gameState.timerDuration * 1_000
  spawnTarget(token)
  updateClock(token)
  clockInterval = setInterval(() => updateClock(token), 50)
}

function saveBestScore(): void {
  if (gameState.score <= gameState.bestScore) return
  gameState.bestScore = gameState.score
  gameState.isNewBest = true
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(gameState.bestScore))
  } catch {
    // The game remains fully usable when storage is unavailable.
  }
}

function celebrate(token: number): void {
  let flashes = 0
  celebrationInterval = setInterval(() => {
    if (token !== roundToken || gameState.gamePhase !== 'ended') {
      if (celebrationInterval !== null) clearInterval(celebrationInterval)
      celebrationInterval = null
      return
    }

    const lightOn = flashes % 2 === 0
    for (const note of noteMapping) {
      if (lightOn) lightPad(note, getRandomColor().velocity, 1)
      else turnOffPad(note)
    }

    flashes += 1
    if (flashes >= 8) {
      if (celebrationInterval !== null) clearInterval(celebrationInterval)
      celebrationInterval = null
      clearAllPads()
    }
  }, 120)
}

function finishRound(token: number): void {
  if (token !== roundToken || gameState.gamePhase !== 'playing') return
  cancelTimers()
  clearActiveTarget()
  gameState.timeLeft = 0
  gameState.gamePhase = 'ended'
  gameState.feedbackTone = 'neutral'
  gameState.feedbackText = gameState.hits > 0 ? 'Round complete!' : 'Round complete - try another one.'
  saveBestScore()
  celebrate(token)
}

export function resetGame(): void {
  roundToken += 1
  cancelConnectionFeedback()
  cancelTimers()
  clearActiveTarget()
  clearAllPads()
  resetRoundStats()
  gameState.timeLeft = 0
  gameState.gamePhase = 'idle'
  gameState.countdownText = ''
  gameState.countdownNotes = []
  gameState.feedbackText = 'Choose a round and start when you are ready.'
  gameState.feedbackTone = 'neutral'
}

export function disposeGame(): void {
  roundToken += 1
  cancelConnectionFeedback()
  cancelTimers()
  clearActiveTarget()
  clearAllPads()
}
