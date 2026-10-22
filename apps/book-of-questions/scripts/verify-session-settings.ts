import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { startStaticServer } from '../../../scripts/lib/static-server.ts'
import { createStarterLibrary, questionMatchesSession } from '../src/data.ts'
import type { QuestionSession } from '../src/types.ts'

const library = createStarterLibrary()
const intimacySelection = { categoryIds: [], includedSensitiveTopics: ['intimacy'] as const }
const intimacy = library.questions.filter((question) => questionMatchesSession(question, {
  ...intimacySelection, includedSensitiveTopics: [...intimacySelection.includedSensitiveTopics],
}))
assert.ok(intimacy.length > 0)
assert.ok(intimacy.every((question) => question.sensitiveTopics.length === 1 && question.sensitiveTopics[0] === 'intimacy'))
assert.equal(questionMatchesSession({ ...intimacy[0], sensitiveTopics: ['intimacy', 'violence'] }, {
  categoryIds: [], includedSensitiveTopics: ['intimacy'],
}), false)

const server = await startStaticServer({ rootDir: resolve(import.meta.dirname, '../dist'), basePath: '/', host: '127.0.0.1' })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.url)
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('book-of-questions:sessions:v1')!)[0] as QuestionSession)
  await page.getByRole('button', { name: 'New Session', exact: true }).click()
  const dialog = page.getByRole('dialog')
  assert.equal(await dialog.evaluate((element) => Boolean(
    element.querySelector('.category-choice-grid')!.compareDocumentPosition(element.querySelector('.sensitive-topic-section')!) & Node.DOCUMENT_POSITION_FOLLOWING,
  )), true)
  await dialog.locator('.sensitive-topic-choice').filter({ hasText: 'Intimacy & sex' }).click()
  assert.match(await dialog.locator('.dialog-footer').innerText(), new RegExp(`${intimacy.length}\\s+questions available`))
  await dialog.getByRole('button', { name: 'Start Session' }).click()
  await page.locator('.question-card h1').waitFor()
  const first = await saved()
  assert.ok(intimacy.some((question) => question.id === first.currentQuestionId))
  while (await page.getByRole('button', { name: 'Follow-Up Question', exact: true }).count()) {
    await page.getByRole('button', { name: 'Follow-Up Question', exact: true }).click()
  }
  while (await page.getByRole('button', { name: 'Next Follow-up', exact: true }).count()) {
    await page.getByRole('button', { name: 'Next Follow-up', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const answered = await saved()
  assert.ok(answered.askedQuestionIds.includes(first.currentQuestionId!))

  await page.getByRole('button', { name: 'Session Settings' }).click()
  await dialog.locator('.sensitive-topic-choice').filter({ hasText: 'Intimacy & sex' }).click()
  await dialog.locator('.category-choice').filter({ hasText: 'Light & Easy' }).click()
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  const changed = await saved()
  assert.equal(changed.id, first.id)
  assert.deepEqual(changed.askedQuestionIds, answered.askedQuestionIds)
  assert.ok(library.questions.some((question) => question.id === changed.currentQuestionId && question.sensitiveTopics.length === 0 && changed.categoryIds.includes(question.categoryId)))

  await page.getByRole('button', { name: 'Session Settings' }).click()
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
  await dialog.locator('.sensitive-topic-choice').filter({ hasText: 'Intimacy & sex' }).click()
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  const restored = await saved()
  assert.deepEqual(restored.askedQuestionIds, answered.askedQuestionIds)
  assert.ok(intimacy.some((question) => question.id === restored.currentQuestionId))
  assert.ok(!restored.askedQuestionIds.includes(restored.currentQuestionId!))
  await page.reload()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('.question-card h1').waitFor()
  assert.deepEqual((await saved()).askedQuestionIds, answered.askedQuestionIds)
  assert.equal((await saved()).currentQuestionId, restored.currentQuestionId)
  assert.deepEqual(errors, [])
  console.log('Session settings verification passed: topic-only pools, bank changes, preserved history, and reload.')
} finally {
  await browser.close()
  await server.stop()
}
