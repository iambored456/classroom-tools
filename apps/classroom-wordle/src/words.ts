import type { WordLength, WordLibrary, WordSet } from './types'

export const STARTER_WORDS: Record<WordLength, readonly string[]> = {
  3: [],
  4: [
    'area', 'arms', 'aunt',
    'ball', 'bear', 'book',
    'camp', 'coin', 'cook',
    'desk', 'door', 'duck',
    'edge', 'earn', 'echo',
    'fish', 'fork', 'farm',
    'gate', 'goat', 'gift',
    'hand', 'hill', 'home',
    'iron', 'idea', 'icon',
    'joke', 'jump', 'jeep',
    'king', 'kite', 'knee',
    'lake', 'life', 'lock',
    'meal', 'milk', 'moon',
    'name', 'nest', 'note',
    'oven', 'opal', 'over',
    'park', 'play', 'pool',
    'rain', 'road', 'rope',
    'sand', 'ship', 'sock',
    'team', 'tent', 'tree',
    'wall', 'wind', 'work',
    'yard', 'yarn', 'year',
  ],
  5: [
    'apple', 'angle', 'award',
    'bread', 'brave', 'brush',
    'chair', 'cloud', 'crown',
    'dream', 'drift', 'dance',
    'earth', 'empty', 'enter',
    'flame', 'field', 'fresh',
    'grape', 'green', 'glove',
    'house', 'heart', 'horse',
    'image', 'igloo', 'input',
    'jelly', 'jewel', 'judge',
    'knock', 'knife', 'known',
    'light', 'lemon', 'lunch',
    'metal', 'magic', 'model',
    'night', 'north', 'noise',
    'ocean', 'olive', 'order',
    'plant', 'proud', 'price',
    'river', 'round', 'reach',
    'stone', 'smile', 'storm',
    'train', 'trust', 'theme',
    'whale', 'world', 'watch',
    'young', 'yield', 'youth',
  ],
  6: [],
}

export type WordTextAnalysis = {
  words: string[]
  duplicateCount: number
  ignoredCount: number
}

export const analyzeWordText = (text: string, length: WordLength): WordTextAnalysis => {
  const tokens = text.match(/[a-z]+/gi) ?? []
  const words: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0
  let ignoredCount = 0

  for (const token of tokens) {
    const word = token.toLocaleLowerCase()
    if (word.length !== length) {
      ignoredCount += 1
    } else if (seen.has(word)) {
      duplicateCount += 1
    } else {
      seen.add(word)
      words.push(word)
    }
  }

  return { words, duplicateCount, ignoredCount }
}

export const parseWordText = (text: string, length: WordLength) =>
  analyzeWordText(text, length).words

export const createStarterSets = (length: WordLength): WordSet[] => [
  {
    id: `starter-${length}-a`,
    label: 'Set A',
    text: STARTER_WORDS[length].join(', '),
    enabled: STARTER_WORDS[length].length > 0,
    starter: true,
  },
  {
    id: `starter-${length}-b`,
    label: 'Set B',
    text: '',
    enabled: false,
    starter: true,
  },
]

export const createStarterLibrary = (): WordLibrary => ({
  3: createStarterSets(3),
  4: createStarterSets(4),
  5: createStarterSets(5),
  6: createStarterSets(6),
})
