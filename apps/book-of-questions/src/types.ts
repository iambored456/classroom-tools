export type QuestionSource = 'stock' | 'poole' | 'custom'

export type Category = {
  id: string
  name: string
  builtIn: boolean
}

export type Question = {
  id: string
  categoryId: string
  prompt: string
  followUp: string
  source: QuestionSource
  sourceNumber: number | null
  sourcePage: number | null
  explicit: boolean
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
  includeExplicit: boolean
  createdAt: number
  updatedAt: number
}
