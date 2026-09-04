import { createStarterLibrary } from './data'
import type { Category, LibraryState, Question, QuestionSession } from './types'

const LIBRARY_KEY = 'book-of-questions:library:v2'
const LEGACY_LIBRARY_KEY = 'book-of-questions:library:v1'
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

type StoredQuestion = Omit<Question, 'explicit'> & { explicit?: boolean }

const isQuestion = (value: unknown): value is StoredQuestion => {
  if (!value || typeof value !== 'object') return false
  const question = value as Partial<Question>
  return (
    typeof question.id === 'string' &&
    typeof question.categoryId === 'string' &&
    typeof question.prompt === 'string' &&
    typeof question.followUp === 'string' &&
    ['stock', 'kids-stock', 'poole', 'custom'].includes(question.source ?? '') &&
    (question.sourceNumber === null || typeof question.sourceNumber === 'number') &&
    (question.sourcePage === null || typeof question.sourcePage === 'number') &&
    (question.explicit === undefined || typeof question.explicit === 'boolean') &&
    typeof question.enabled === 'boolean' &&
    typeof question.builtIn === 'boolean'
  )
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

type StoredSession = Omit<QuestionSession, 'revealedFollowUpCount' | 'includeExplicit'> & {
  revealedFollowUpCount?: number
  followUpRevealed?: boolean
  includeExplicit?: boolean
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
    typeof session.createdAt === 'number' &&
    typeof session.updatedAt === 'number'
  )
}

export const loadLibrary = (): LibraryState => {
  const starter = createStarterLibrary()

  try {
    const currentRaw = localStorage.getItem(LIBRARY_KEY)
    const isLegacyLibrary = currentRaw === null
    const raw = currentRaw ?? localStorage.getItem(LEGACY_LIBRARY_KEY)
    if (!raw) return starter
    const parsed: unknown = JSON.parse(raw)
    if (!isLibrary(parsed)) return starter

    const deletedCategories = new Set(parsed.deletedBuiltInCategoryIds)
    const deletedQuestions = new Set(parsed.deletedBuiltInQuestionIds)
    const starterQuestionsById = new Map(starter.questions.map((question) => [question.id, question]))
    const storedQuestions: Question[] = parsed.questions.map((question) => ({
      ...question,
      explicit:
        isLegacyLibrary && question.builtIn
          ? starterQuestionsById.get(question.id)?.explicit ?? question.explicit ?? false
          : question.explicit ?? starterQuestionsById.get(question.id)?.explicit ?? false,
    }))
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
      const { followUpRevealed, ...savedSession } = session
      return {
        ...savedSession,
        includeExplicit: session.includeExplicit ?? false,
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
