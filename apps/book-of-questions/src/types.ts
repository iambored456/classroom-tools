export type QuestionSource = 'stock' | 'kids-stock' | 'poole' | 'would-you-rather' | 'custom'
export type SensitiveTopic = 'substances' | 'intimacy' | 'religion' | 'violence' | 'other'

export type Category = {
  id: string
  name: string
  builtIn: boolean
}

export type Question = {
  id: string
  categoryId: string
  prompt: string
  optionA: string | null
  optionB: string | null
  followUp: string
  source: QuestionSource
  sourceNumber: number | null
  sourcePage: number | null
  explicit: boolean
  sensitiveTopics: SensitiveTopic[]
  enabled: boolean
  builtIn: boolean
}

export type LibraryState = {
  categories: Category[]
  questions: Question[]
  deletedBuiltInCategoryIds: string[]
  deletedBuiltInQuestionIds: string[]
}

export type QuestionSession = {
  id: string
  name: string
  categoryIds: string[]
  askedQuestionIds: string[]
  currentQuestionId: string | null
  revealedFollowUpCount: number
  includedSensitiveTopics: SensitiveTopic[]
  createdAt: number
  updatedAt: number
}
