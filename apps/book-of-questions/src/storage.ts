import { ALL_SENSITIVE_TOPICS, createStarterLibrary } from './data'
import type { Category, LibraryState, Question, QuestionSession, SensitiveTopic } from './types'

const LIBRARY_KEY = 'book-of-questions:library:v3'
const LEGACY_LIBRARY_KEYS = ['book-of-questions:library:v2', 'book-of-questions:library:v1']
const SESSIONS_KEY = 'book-of-questions:sessions:v1'
const THEME_KEY = 'book-of-questions:dark-mode:v1'

const isCategory = (value: unknown): value is Category => {
  if (!value || typeof value !== 'object') return false
  const category = value as Partial<Category>
  return (
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.builtIn === 'boolean'
  )
}

const isSensitiveTopic = (value: unknown): value is SensitiveTopic =>
  typeof value === 'string' && ALL_SENSITIVE_TOPICS.includes(value as SensitiveTopic)

const isSensitiveTopicArray = (value: unknown): value is SensitiveTopic[] =>
  Array.isArray(value) && value.every(isSensitiveTopic)

type StoredQuestion = Omit<Question, 'explicit' | 'sensitiveTopics' | 'optionA' | 'optionB'> & {
  explicit?: boolean
  sensitiveTopics?: SensitiveTopic[]
  optionA?: string | null
  optionB?: string | null
}

const isQuestion = (value: unknown): value is StoredQuestion => {
  if (!value || typeof value !== 'object') return false
  const question = value as Partial<Question>
  return (
    typeof question.id === 'string' &&
    typeof question.categoryId === 'string' &&
    typeof question.prompt === 'string' &&
    typeof question.followUp === 'string' &&
    ['stock', 'kids-stock', 'poole', 'would-you-rather', 'custom'].includes(question.source ?? '') &&
    (question.sourceNumber === null || typeof question.sourceNumber === 'number') &&
    (question.sourcePage === null || typeof question.sourcePage === 'number') &&
    (question.optionA === undefined || question.optionA === null || typeof question.optionA === 'string') &&
    (question.optionB === undefined || question.optionB === null || typeof question.optionB === 'string') &&
    (question.explicit === undefined || typeof question.explicit === 'boolean') &&
    (question.sensitiveTopics === undefined || isSensitiveTopicArray(question.sensitiveTopics)) &&
    typeof question.enabled === 'boolean' &&
    typeof question.builtIn === 'boolean'
  )
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

type StoredSession = Omit<QuestionSession, 'revealedFollowUpCount' | 'includedSensitiveTopics'> & {
  revealedFollowUpCount?: number
  followUpRevealed?: boolean
  includeExplicit?: boolean
  includedSensitiveTopics?: SensitiveTopic[]
}

type StoredLibrary = Omit<LibraryState, 'questions'> & { questions: StoredQuestion[] }

const isLibrary = (value: unknown): value is StoredLibrary => {
  if (!value || typeof value !== 'object') return false
  const library = value as Partial<LibraryState>
  return (
    Array.isArray(library.categories) &&
    library.categories.every(isCategory) &&
    Array.isArray(library.questions) &&
    library.questions.every(isQuestion) &&
    isStringArray(library.deletedBuiltInCategoryIds) &&
    isStringArray(library.deletedBuiltInQuestionIds)
  )
}

const isSession = (value: unknown): value is StoredSession => {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<StoredSession>
  return (
    typeof session.id === 'string' &&
    typeof session.name === 'string' &&
    isStringArray(session.categoryIds) &&
    isStringArray(session.askedQuestionIds) &&
    (session.currentQuestionId === null || typeof session.currentQuestionId === 'string') &&
    (session.revealedFollowUpCount === undefined ||
      (typeof session.revealedFollowUpCount === 'number' &&
        Number.isInteger(session.revealedFollowUpCount) &&
        session.revealedFollowUpCount >= 0)) &&
    (session.followUpRevealed === undefined || typeof session.followUpRevealed === 'boolean') &&
    (session.includeExplicit === undefined || typeof session.includeExplicit === 'boolean') &&
    (session.includedSensitiveTopics === undefined ||
      isSensitiveTopicArray(session.includedSensitiveTopics)) &&
    typeof session.createdAt === 'number' &&
    typeof session.updatedAt === 'number'
  )
}

export const loadLibrary = (): LibraryState => {
  const starter = createStarterLibrary()

  try {
    const currentRaw = localStorage.getItem(LIBRARY_KEY)
    const isLegacyLibrary = currentRaw === null
    const raw = currentRaw ?? LEGACY_LIBRARY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
    if (!raw) return starter
    const parsed: unknown = JSON.parse(raw)
    if (!isLibrary(parsed)) return starter

    const deletedCategories = new Set(parsed.deletedBuiltInCategoryIds)
    const deletedQuestions = new Set(parsed.deletedBuiltInQuestionIds)
    const starterQuestionsById = new Map(starter.questions.map((question) => [question.id, question]))
    const storedQuestions: Question[] = parsed.questions.map((question) => {
      const starterQuestion = starterQuestionsById.get(question.id)
      const explicit = isLegacyLibrary && question.builtIn
        ? starterQuestion?.explicit ?? question.explicit ?? false
        : question.explicit ?? starterQuestion?.explicit ?? false
      const sensitiveTopics = question.sensitiveTopics ?? (
        isLegacyLibrary && question.builtIn
          ? starterQuestion?.sensitiveTopics ?? []
          : explicit
            ? starterQuestion?.sensitiveTopics.length
              ? starterQuestion.sensitiveTopics
              : ['other']
            : []
      )
      return {
        ...question,
        optionA: question.optionA ?? starterQuestion?.optionA ?? null,
        optionB: question.optionB ?? starterQuestion?.optionB ?? null,
        explicit,
        sensitiveTopics,
      }
    })
    const savedCategoryIds = new Set(parsed.categories.map((category) => category.id))
    const categories = [
      ...parsed.categories,
      ...starter.categories.filter(
        (category) => !savedCategoryIds.has(category.id) && !deletedCategories.has(category.id),
      ),
    ]
    const validCategoryIds = new Set(categories.map((category) => category.id))
    const savedQuestionIds = new Set(storedQuestions.map((question) => question.id))
    const questions = [
      ...storedQuestions.filter((question) => validCategoryIds.has(question.categoryId)),
      ...starter.questions.filter(
        (question) =>
          validCategoryIds.has(question.categoryId) &&
          !savedQuestionIds.has(question.id) &&
          !deletedQuestions.has(question.id),
      ),
    ]

    const loadedLibrary = {
      categories,
      questions,
      deletedBuiltInCategoryIds: [...deletedCategories],
      deletedBuiltInQuestionIds: [...deletedQuestions],
    }
    if (isLegacyLibrary) localStorage.setItem(LIBRARY_KEY, JSON.stringify(loadedLibrary))
    return loadedLibrary
  } catch {
    return starter
  }
}

export const saveLibrary = (library: LibraryState) => {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  } catch {
    // The library remains available for this visit when storage is unavailable.
  }
}

export const resetLibrary = () => {
  const starter = createStarterLibrary()
  saveLibrary(starter)
  return starter
}

export const loadSessions = (): QuestionSession[] => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSession).map((session) => {
      const { followUpRevealed, includeExplicit, ...savedSession } = session
      return {
        ...savedSession,
        includedSensitiveTopics:
          session.includedSensitiveTopics ?? (includeExplicit ? [...ALL_SENSITIVE_TOPICS] : []),
        revealedFollowUpCount:
          session.revealedFollowUpCount ?? (followUpRevealed ? Number.MAX_SAFE_INTEGER : 0),
      }
    })
  } catch {
    return []
  }
}

export const saveSessions = (sessions: QuestionSession[]) => {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch {
    // Sessions remain available for this visit when storage is unavailable.
  }
}

export const loadDarkMode = () => {
  try {
    return localStorage.getItem(THEME_KEY) !== 'false'
  } catch {
    return true
  }
}

export const saveDarkMode = (darkMode: boolean) => {
  try {
    localStorage.setItem(THEME_KEY, String(darkMode))
  } catch {
    // Theme preference remains available for this visit when storage is unavailable.
  }
}
