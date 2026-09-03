import rawQuestionBank from './questions.json'
import type { Category, LibraryState, Question } from './types'

type SeedCategory = Pick<Category, 'id' | 'name'>
type SeedQuestion = Omit<Question, 'enabled' | 'builtIn' | 'explicit'>
type SeedData = {
  categories: SeedCategory[]
  questions: SeedQuestion[]
}

const seedData = rawQuestionBank as SeedData

const CATEGORY_COLOURS = [
  '#c8c1ff',
  '#f7d978',
  '#9fd5b0',
  '#9fcbed',
  '#f2b4a3',
  '#c7afe4',
  '#efc0d6',
  '#a8d9d3',
  '#e9be83',
  '#b9c8f0',
  '#d0c6a2',
]

export const createStarterLibrary = (): LibraryState => ({
  categories: seedData.categories.map((category) => ({ ...category, builtIn: true })),
  questions: seedData.questions.map((question) => ({
    ...question,
    explicit: false,
    enabled: true,
    builtIn: true,
  })),
  deletedBuiltInCategoryIds: [],
  deletedBuiltInQuestionIds: [],
})

export const categoryColour = (categoryId: string, categories: Category[]): string => {
  const index = Math.max(0, categories.findIndex((category) => category.id === categoryId))
  return CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]
}

const FOLLOW_UP_ENDINGS = new Set(['.', '?', '!'])
const FOLLOW_UP_CLOSERS = new Set(['"', "'", '’', '”', ')', ']'])

export const splitFollowUpPrompts = (value: string): string[] => {
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (!text) return []

  const prompts: string[] = []
  let start = 0
  let index = 0

  const addPrompt = (end: number) => {
    const prompt = text.slice(start, end).trim()
    if (prompt) prompts.push(prompt)
  }

  while (index < text.length) {
    if (text[index] === '\n') {
      addPrompt(index)
      index += 1
      while (index < text.length && /\s/.test(text[index])) index += 1
      start = index
      continue
    }

    if (!FOLLOW_UP_ENDINGS.has(text[index])) {
      index += 1
      continue
    }

    let end = index + 1
    while (end < text.length && FOLLOW_UP_ENDINGS.has(text[end])) end += 1
    while (end < text.length && FOLLOW_UP_CLOSERS.has(text[end])) end += 1

    if (end === text.length || /\s/.test(text[end])) {
      addPrompt(end)
      while (end < text.length && /\s/.test(text[end])) end += 1
      start = end
      index = end
      continue
    }

    index = end
  }

  addPrompt(text.length)
  return prompts
}

export const formatQuestionForDisplay = (value: string): string =>
  value.replace(/([.;])\s*/g, '$1\n').trim()

export const makeId = (prefix: string) => {
  const randomPart = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${randomPart}`
}
