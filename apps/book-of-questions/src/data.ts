import rawQuestionBank from './questions.json'
import rawKidsQuestions from './kids-questions.json'
import type { Category, LibraryState, Question } from './types'

type SeedCategory = Pick<Category, 'id' | 'name'>
type SeedQuestion = Omit<Question, 'enabled' | 'builtIn' | 'explicit'>
type SeedData = {
  categories: SeedCategory[]
  questions: SeedQuestion[]
}

const originalSeedData = rawQuestionBank as SeedData
const kidsQuestions = rawKidsQuestions as SeedQuestion[]
const seedData: SeedData = {
  categories: [
    ...originalSeedData.categories,
    { id: 'kids-book-of-questions', name: "Kids' Book of Questions" },
  ],
  questions: [...originalSeedData.questions, ...kidsQuestions],
}

const BUILT_IN_EXPLICIT_QUESTION_IDS = new Set([
  // Sex, sexual relationships, nudity, and kissing.
  'stock-010',
  'stock-019',
  'stock-023',
  'stock-042',
  'stock-057',
  'stock-079',
  'stock-090',
  'stock-101',
  'stock-104',
  'stock-116',
  'stock-130',
  'stock-132',
  'stock-133',
  'stock-136',
  'stock-145',
  'stock-156',
  'stock-161',
  'stock-172',
  'stock-177',
  'stock-192',
  'stock-207',
  'kids-stock-021',
  'kids-stock-029',
  'kids-stock-041',
  'kids-stock-071',
  'kids-stock-131',
  'kids-stock-182',

  // Recreational drugs and alcohol.
  'stock-037',
  'stock-081',

  // Serious violence, including suicide, war, execution, and terrorism.
  'stock-011',
  'stock-025',
  'stock-026',
  'stock-027',
  'stock-031',
  'stock-043',
  'stock-044',
  'stock-045',
  'stock-054',
  'stock-064',
  'stock-073',
  'stock-117',
  'stock-119',
  'stock-126',
  'stock-146',
  'stock-148',
  'stock-149',
  'stock-160',
  'stock-163',
  'stock-183',
  'poole-0586',
  'poole-0587',
  'poole-0606',
  'poole-0673',
  'poole-0924',
  'kids-stock-030',
  'kids-stock-050',
  'kids-stock-103',
  'kids-stock-127',
  'kids-stock-181',
  'kids-stock-191',

  // Recreational drugs and alcohol from The Kids' Book of Questions.
  'kids-stock-257',
])

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
  '#e7b78b',
]

export const createStarterLibrary = (): LibraryState => ({
  categories: seedData.categories.map((category) => ({ ...category, builtIn: true })),
  questions: seedData.questions.map((question) => ({
    ...question,
    explicit: BUILT_IN_EXPLICIT_QUESTION_IDS.has(question.id),
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

export type QuestionSizeClass = '' | 'long' | 'extra-long' | 'very-long'

export const questionSizeClass = (
  question: Pick<Question, 'prompt' | 'followUp'>,
): QuestionSizeClass => {
  const fullLength = question.prompt.length + splitFollowUpPrompts(question.followUp).join(' ').length
  if (fullLength > 560) return 'very-long'
  if (fullLength > 360) return 'extra-long'
  if (fullLength > 240) return 'long'
  return ''
}

export const makeId = (prefix: string) => {
  const randomPart = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${randomPart}`
}
