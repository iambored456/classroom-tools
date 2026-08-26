export const WORD_LENGTHS = [3, 4, 5, 6] as const

export type WordLength = (typeof WORD_LENGTHS)[number]
export type LetterState = 'absent' | 'present' | 'correct'

export type WordSet = {
  id: string
  label: string
  text: string
  enabled: boolean
  starter: boolean
}

export type WordLibrary = Record<WordLength, WordSet[]>

export type ScoredLetter = {
  letter: string
  state: LetterState
}

export type ScoredGuess = {
  word: string
  letters: ScoredLetter[]
}

export type GameSettings = {
  wordLength: WordLength
  guessLimit: number
  colorblindMode: boolean
}
