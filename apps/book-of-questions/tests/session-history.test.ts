import assert from 'node:assert/strict'
import test from 'node:test'
import { previousCompletedQuestionId, reopenPreviousQuestion } from '../src/session-history.ts'
import type { QuestionSession } from '../src/types.ts'

const makeSession = (overrides: Partial<QuestionSession> = {}): QuestionSession => ({
  id: 'session', name: 'Practice', categoryIds: ['stock'],
  askedQuestionIds: ['first', 'second'], currentQuestionId: 'third',
  revealedFollowUpCount: 2, includedSensitiveTopics: [], createdAt: 1, updatedAt: 2,
  ...overrides,
})
const available = new Set(['first', 'second', 'third'])

test('back reopens the most recent completed card, removes it from Answered, and resets follow-ups', () => {
  const original = makeSession()
  const returned = reopenPreviousQuestion(original, available, 10)!
  assert.equal(returned.currentQuestionId, 'second')
  assert.deepEqual(returned.askedQuestionIds, ['first'])
  assert.equal(returned.revealedFollowUpCount, 0)
  assert.equal(returned.updatedAt, 10)
  assert.equal(original.currentQuestionId, 'third')
  assert.deepEqual(original.askedQuestionIds, ['first', 'second'])
  // The displaced current card is available for a later draw, never marked Answered.
  assert.ok(!returned.askedQuestionIds.includes('third'))
})

test('back works repeatedly, after persistence, and from a finished session', () => {
  const finished = makeSession({ askedQuestionIds: ['first', 'second', 'third'], currentQuestionId: null })
  const returned = reopenPreviousQuestion(finished, available)!
  assert.equal(returned.currentQuestionId, 'third')
  assert.deepEqual(returned.askedQuestionIds, ['first', 'second'])
  const restored: QuestionSession = JSON.parse(JSON.stringify(returned))
  const second = reopenPreviousQuestion(restored, available)!
  const first = reopenPreviousQuestion(second, available)!
  assert.equal(second.currentQuestionId, 'second')
  assert.equal(first.currentQuestionId, 'first')
  assert.deepEqual(first.askedQuestionIds, [])
  assert.equal(reopenPreviousQuestion(first, available), null)
})

test('back skips cards removed, disabled, or excluded from the current session', () => {
  const session = makeSession({ askedQuestionIds: ['first', 'removed', 'disabled', 'other-category'] })
  assert.equal(previousCompletedQuestionId(session, available), 'first')
  const returned = reopenPreviousQuestion(session, available)!
  assert.equal(returned.currentQuestionId, 'first')
  assert.deepEqual(returned.askedQuestionIds, ['removed', 'disabled', 'other-category'])
  assert.equal(reopenPreviousQuestion(returned, available), null)
  assert.equal(reopenPreviousQuestion(makeSession({ askedQuestionIds: [] }), available), null)
})
