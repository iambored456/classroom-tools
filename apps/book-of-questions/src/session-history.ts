import type { QuestionSession } from './types'

// askedQuestionIds is already saved in completion order, including for older sessions.
export function previousCompletedQuestionId(
  session: QuestionSession,
  availableQuestionIds: ReadonlySet<string>,
): string | null {
  for (let index = session.askedQuestionIds.length - 1; index >= 0; index--) {
    const id = session.askedQuestionIds[index]
    if (id !== session.currentQuestionId && availableQuestionIds.has(id)) return id
  }
  return null
}

export function reopenPreviousQuestion(
  session: QuestionSession,
  availableQuestionIds: ReadonlySet<string>,
  now = Date.now(),
): QuestionSession | null {
  const id = previousCompletedQuestionId(session, availableQuestionIds)
  if (!id) return null
  return {
    ...session,
    currentQuestionId: id,
    askedQuestionIds: session.askedQuestionIds.filter(completedId => completedId !== id),
    revealedFollowUpCount: 0,
    updatedAt: now,
  }
}
