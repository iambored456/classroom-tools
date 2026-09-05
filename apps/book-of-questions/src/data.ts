import rawQuestionBank from './questions.json'
import rawKidsQuestions from './kids-questions.json'
import rawWouldYouRatherQuestions from './would-you-rather-questions.json'
import type { Category, LibraryState, Question, SensitiveTopic } from './types'

type SeedCategory = Pick<Category, 'id' | 'name'>
type SeedQuestion = Omit<
  Question,
  'enabled' | 'builtIn' | 'explicit' | 'sensitiveTopics' | 'optionA' | 'optionB'
> & Partial<Pick<Question, 'optionA' | 'optionB'>>
type SeedData = {
  categories: SeedCategory[]
  questions: SeedQuestion[]
}

const originalSeedData = rawQuestionBank as SeedData
const kidsQuestions = rawKidsQuestions as SeedQuestion[]
const wouldYouRatherQuestions = rawWouldYouRatherQuestions as SeedQuestion[]
const seedData: SeedData = {
  categories: [
    ...originalSeedData.categories,
    { id: 'kids-book-of-questions', name: "Kids' Book of Questions" },
    {
      id: 'would-you-rather-family-friendly',
      name: 'Would You Rather: Family-Friendly Challenges',
    },
  ],
  questions: [...originalSeedData.questions, ...kidsQuestions, ...wouldYouRatherQuestions],
}

const INTIMACY_QUESTION_IDS = new Set([
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
])

const SUBSTANCE_QUESTION_IDS = new Set([
  'stock-037',
  'stock-081',
  'kids-stock-257',
])

const VIOLENCE_QUESTION_IDS = new Set([
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
])

const RELIGION_PATTERN = /\b(religio(?:n|ns|us)|faith|spiritual(?:ity|ly)?|god|heaven|hell|prayer|pray|worship|atheis(?:m|t)|church|temple|mosque|synagogue)\b/i

export const SENSITIVE_TOPIC_LABELS: Record<SensitiveTopic, { label: string; description: string }> = {
  substances: { label: 'Drugs & alcohol', description: 'Substance use and addiction.' },
  intimacy: { label: 'Intimacy & sex', description: 'Sex, nudity, kissing, and intimate relationships.' },
  religion: { label: 'Religion & spirituality', description: 'Faith, belief, and religious practice.' },
  violence: { label: 'Violence & distressing topics', description: 'Serious violence, death, and self-harm.' },
  other: { label: 'Other explicit topics', description: 'Questions manually marked Explicit in the library.' },
}

export const ALL_SENSITIVE_TOPICS = Object.keys(SENSITIVE_TOPIC_LABELS) as SensitiveTopic[]

const builtInSensitiveTopics = (question: SeedQuestion): SensitiveTopic[] => {
  const topics: SensitiveTopic[] = []
  if (SUBSTANCE_QUESTION_IDS.has(question.id)) topics.push('substances')
  if (INTIMACY_QUESTION_IDS.has(question.id)) topics.push('intimacy')
  if (VIOLENCE_QUESTION_IDS.has(question.id)) topics.push('violence')
  if (RELIGION_PATTERN.test(`${question.prompt} ${question.followUp}`)) topics.push('religion')
  return topics
}

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
  questions: seedData.questions.map((question) => {
    const sensitiveTopics = builtInSensitiveTopics(question)
    return {
      ...question,
      optionA: question.optionA ?? null,
      optionB: question.optionB ?? null,
      sensitiveTopics,
      explicit: sensitiveTopics.length > 0,
      enabled: true,
      builtIn: true,
    }
  }),
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

export type WouldYouRatherOptions = { first: string; second: string }

export const parseWouldYouRather = (value: string): WouldYouRatherOptions | null => {
  const match = value.trim().match(/^would you rather\s+(.+?)[?!.]?$/i)
  if (!match) return null
  const body = match[1].replace(/[?!.]+$/, '').trim()
  const lowerBody = body.toLocaleLowerCase()
  const separators = [', or ', '—or ', '–or ', '-or ', ' or ']
  const selectedSeparator = separators
    .map((separator) => ({ separator, index: lowerBody.lastIndexOf(separator) }))
    .sort((first, second) => second.index - first.index)[0]
  const splitAt = selectedSeparator.index
  const separatorLength = selectedSeparator.separator.length
  if (splitAt <= 0 || splitAt + separatorLength >= body.length) return null
  return {
    first: body.slice(0, splitAt).trim().replace(/,$/, ''),
    second: body.slice(splitAt + separatorLength).trim(),
  }
}

export const getWouldYouRatherOptions = (
  question: Pick<Question, 'prompt' | 'optionA' | 'optionB'>,
): WouldYouRatherOptions | null => {
  const first = question.optionA?.trim()
  const second = question.optionB?.trim()
  return first && second ? { first, second } : parseWouldYouRather(question.prompt)
}

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
