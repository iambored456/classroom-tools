export const DIFFICULTIES = ['easy', 'medium', 'hard', 'tricky'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export type WordGroup = {
  id: string
  title: string
  words: string[]
  difficulty: Difficulty
  enabled: boolean
  custom: boolean
}

export type GameTile = {
  id: string
  groupId: string
  word: string
}
