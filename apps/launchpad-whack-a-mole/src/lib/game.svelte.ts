import { type PadColor, COLOR_PALETTE, PROGRAMMER_MODE_CONFIG } from '@classroom-tools/launchpad-midi'
import { noteMapping, lightPad, turnOffPad, clearAllPads } from './midi.svelte.ts'

export type GamePhase = 'idle' | 'countdown' | 'playing' | 'ended'

// Single reactive state object — Svelte 5 requires property mutation, not variable reassignment
export const gameState = $state({
  score: 0,
  timeLeft: 0,
  gamePhase: 'idle' as GamePhase,
  activeNote: null as number | null,
  activePadColor: null as PadColor | null,
  timerDuration: 30,
  countdownText: '',
})

export function setTimerDuration(value: number): void {
  gameState.timerDuration = value
}

let timerInterval: ReturnType<typeof setInterval> | null = null

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

export function formatTime(seconds: number): string {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}

function getRandomColor(): PadColor {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
}

function selectRandomPad(): void {
  if (gameState.activeNote !== null) {
    turnOffPad(gameState.activeNote)
  }
  const note = noteMapping[Math.floor(Math.random() * noteMapping.length)]
  const color = getRandomColor()
  gameState.activeNote = note
  gameState.activePadColor = color
  lightPad(note, color.velocity, 0)
}

export function handlePadPress(note: number): void {
  if (gameState.gamePhase !== 'playing') return
  if (note !== gameState.activeNote) return
  gameState.score++
  turnOffPad(note)
  gameState.activeNote = null
  gameState.activePadColor = null
  selectRandomPad()
}

export async function startGame(): Promise<void> {
  if (gameState.gamePhase !== 'idle') return
  gameState.gamePhase = 'countdown'
  await runCountdown()
  gameState.score = 0
  gameState.timeLeft = gameState.timerDuration
  clearAllPads()
  selectRandomPad()
  gameState.gamePhase = 'playing'
  timerInterval = setInterval(() => {
    gameState.timeLeft--
    if (gameState.timeLeft <= 0) {
      clearInterval(timerInterval!)
      timerInterval = null
      endGame()
    }
  }, 1000)
}

export function resetGame(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.score = 0
  gameState.timeLeft = 0
  gameState.activeNote = null
  gameState.activePadColor = null
  gameState.countdownText = ''
  clearAllPads()
  gameState.gamePhase = 'idle'
}

function endGame(): void {
  if (gameState.activeNote !== null) {
    turnOffPad(gameState.activeNote)
    gameState.activeNote = null
    gameState.activePadColor = null
  }
  gameState.gamePhase = 'ended'
  flashAllPads()
}

function flashAllPads(): void {
  let count = 0
  const flashInterval = setInterval(() => {
    for (const note of noteMapping) {
      lightPad(note, getRandomColor().velocity, 1)
    }
    if (++count >= 20) {
      clearInterval(flashInterval)
      clearAllPads()
      gameState.gamePhase = 'idle'
    }
  }, 100)
}

// Digit patterns for 5-4-3-2-1 countdown displayed on Launchpad pads
const DIGIT_PATTERNS: Record<number, number[]> = {
  5: [11, 12, 13, 14, 25, 35, 44, 43, 42, 41, 51, 61, 71, 72, 73, 74, 75, 76],
  4: [14, 24, 34, 44, 35, 36, 33, 32, 31, 41, 51, 61, 71],
  3: [21, 12, 13, 14, 25, 35, 44, 43, 55, 65, 74, 73, 72, 61],
  2: [11, 12, 13, 14, 15, 21, 32, 43, 54, 65, 74, 73, 72, 61],
  1: [11, 12, 13, 14, 15, 23, 33, 43, 53, 63, 73, 62, 61],
}

function buttonToNote(buttonNumber: number): number {
  const s = String(buttonNumber)
  const row = parseInt(s.charAt(0), 10) - 1
  const col = parseInt(s.charAt(1), 10) - 1
  return PROGRAMMER_MODE_CONFIG.startingNote + row * PROGRAMMER_MODE_CONFIG.rowIncrement + col
}

function runCountdown(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const digits = [5, 4, 3, 2, 1]
    let i = 0

    function displayNext(): void {
      if (i >= digits.length) {
        resolve()
        return
      }
      const digit = digits[i]
      const pattern = DIGIT_PATTERNS[digit]
      if (!pattern) {
        reject(new Error(`No pattern for digit ${digit}`))
        return
      }
      for (const b of pattern) {
        lightPad(buttonToNote(b), 100, 0)
      }
      gameState.countdownText = `Get Ready: ${digit}`
      setTimeout(() => {
        for (const b of pattern) {
          turnOffPad(buttonToNote(b))
        }
        i++
        displayNext()
      }, 1000)
    }

    displayNext()
  })
}
