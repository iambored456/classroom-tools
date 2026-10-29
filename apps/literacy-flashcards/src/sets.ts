import { cards as eyeWords } from './cards'
import heartWords from './heart-words.json'
import closedSyllables from './closed-syllables.json'
import { nonsenseCards, normalizeNonsenseSelection } from './nonsense-words'
import type { NonsenseGroupId } from './nonsense-words'

export type CardSetId = 'eyewords' | 'heart-words' | 'closed-syllables' | 'nonsense-words'
export type Flashcard = { id: number; word: string; cue?: string; sentence?: string }
export type CardSet = {
  id: CardSetId
  name: string
  category: string
  description: string
  cards: Flashcard[]
  imageDirectory: string
  frontKind: 'image' | 'symbols' | 'single' | 'text'
  flippable: boolean
  frontLabel: string
  backLabel: string
  revealHint: string
  returnHint: string
  instructions: string
  credit: string
  previewBackground: string
}

export const cardSets: CardSet[] = [
  {
    id: 'eyewords', name: 'EyeWords', category: 'Sight words',
    description: 'Read, flip, and remember with picture cues.',
    cards: eyeWords, imageDirectory: 'cards', frontKind: 'image', flippable: true,
    frontLabel: 'Picture side', backLabel: 'Word & cue',
    revealHint: 'Tap to see the word & cue', returnHint: 'Tap to see the picture',
    instructions: 'Read the illustrated word, then tap the card to see the plain word and its memory cue.',
    credit: 'Original cards from Eye Sight Words Flashcards 100 Words. Original artwork and cues © Eyewords.',
    previewBackground: '#e9e2d3',
  },
  {
    id: 'heart-words', name: 'Heart Words', category: 'UFLI Foundations',
    description: 'Read with hearts and sound boxes, then practise the word in a short sentence.',
    cards: heartWords, imageDirectory: 'cards/heart-words', frontKind: 'symbols', flippable: true,
    frontLabel: 'Hearts & sounds', backLabel: 'Sentence side',
    revealHint: 'Tap to read a sentence', returnHint: 'Tap to reveal hearts & sounds',
    instructions: 'Read the original UFLI card with its hearts and sound boxes, then tap to read a short sentence using the word. Hearts mark the irregular parts; blue boxes mark regular sounds.',
    credit: 'Original cards from Flashcards - UFLI Heart Words. © 2022 University of Florida Literacy Institute. Original word, heart, sound-box, and logo artwork preserved.',
    previewBackground: '#dbe6ef',
  },
  {
    id: 'closed-syllables', name: 'Reading Universe - Closed Syllables', category: 'Phonics',
    description: 'Read and practise closed syllables.',
    cards: closedSyllables, imageDirectory: 'cards/closed-syllables', frontKind: 'single', flippable: false,
    frontLabel: 'Closed syllable', backLabel: '', revealHint: '', returnHint: '',
    instructions: 'Read the syllable on each single-sided card. Use Next when finished, Reshuffle to save it for later, or the back arrow to revisit the previous card.',
    credit: 'Original cards from Reading Universe, Closed Syllable Flash Cards. © WETA. Support provided by the American Federation of Teachers, AFL-CIO.',
    previewBackground: '#deedf5',
  },
  createNonsenseSet(['A']),
]

export function createNonsenseSet(ids: readonly NonsenseGroupId[]): CardSet {
  const selected = normalizeNonsenseSelection(ids)
  return {
    id: 'nonsense-words', name: 'Nonsense Words', category: 'Phonics',
    description: 'Choose sets A–D and practise a shuffled deck of single-sided words.',
    cards: nonsenseCards(selected), imageDirectory: '', frontKind: 'text', flippable: false,
    frontLabel: `${selected.length === 1 ? 'Set' : 'Sets'} ${selected.join(', ')}`,
    backLabel: '', revealHint: '', returnHint: '',
    instructions: 'Read each word aloud. Use Next when finished, Reshuffle to save it for later, or the back arrow to revisit the previous word. Return to card sets to choose a different combination of sets A–D.',
    credit: 'Word lists and syllable/blend descriptions supplied for sets A–D.',
    previewBackground: '#e6ddf2',
  }
}

export function sessionStorageKey(id: CardSetId, nonsenseIds: readonly NonsenseGroupId[] = ['A']) {
  // Each nonsense selection has independent progress; existing set keys stay compatible.
  const selection = id === 'nonsense-words' ? `.${normalizeNonsenseSelection(nonsenseIds).join('-')}` : ''
  return `literacy-flashcards.${id}${selection}.v1`
}

export function setFromHash(hash: string) {
  return cardSets.find(set => hash === `#${set.id}`) ?? null
}

export function cardImage(set: CardSet, id: number, side: 'front' | 'back') {
  const number = String(id).padStart(3, '0')
  return `${import.meta.env.BASE_URL}${set.imageDirectory}/${number}${set.frontKind === 'image' ? `-${side}` : ''}.webp`
}
