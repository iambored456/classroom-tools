import assert from 'node:assert/strict'
import test from 'node:test'
import { checkAnswer } from './src/diagnostic/answers'
import { createDiagnostic, defaultRules, sessionResponseCount } from './src/diagnostic/engine'
import { bankVersion, items } from './src/diagnostic/items'
import { renderMath } from './src/diagnostic/math'
import { mapVersion, skills } from './src/diagnostic/skills'
import { createAttemptStore, makeExport, readAttempt } from './src/diagnostic/storage'
import type { AnswerSpec, Attempt, Item, Rules, Skill } from './src/diagnostic/types'

const versions = { map: 'test-map', bank: 'test-bank', rules: 'test-rules' }

function skill(id: string, essential: string[][] = [], supporting: string[] = []): Skill {
  return { id, name: id, branch: 'fixture', description: id, essential, supporting, rationale: '', sourcePrerequisites: '' }
}

function questions(skillId: string): Item[] {
  return [1, 2, 3, 4].map((value) => ({
    id: skillId + '-' + value,
    skillId,
    family: 'family-' + value,
    prompt: 'Enter ' + value,
    answer: numeric(String(value)),
    solution: String(value),
    support: 'none',
  }))
}

function numeric(expected: string): AnswerSpec {
  return { kind: 'fields', fields: [{ label: 'Value', expected }] }
}

function fixture(ruleOverrides: Partial<Rules> = {}) {
  const skills = [
    skill('fluency'),
    skill('signed'),
    skill('factoring', [['signed']], ['fluency']),
    skill('formula', [], ['fluency']),
    skill('solve', [['factoring', 'formula']]),
    skill('future'),
  ]
  const items = skills.slice(0, -1).flatMap(({ id }) => questions(id))
  const diagnostic = createDiagnostic({ skills, items, versions, rules: { ...defaultRules, ...ruleOverrides } })
  return { diagnostic, skills, items }
}

function correctInput(spec: AnswerSpec): string[] {
  if (spec.kind === 'choice') return [spec.correct]
  if (spec.kind === 'roots') return [spec.expected.join(', ')]
  const values = spec.fields.map((field) => field.unit ? field.expected + ' ' + field.unit : field.expected)
  return spec.roots ? [...values, spec.roots.expected.join(', ')] : values
}

function wrongInput(spec: AnswerSpec): string[] {
  if (spec.kind === 'choice') return [spec.options.find((option) => option.id !== spec.correct)!.id]
  if (spec.kind === 'roots') return ['39820']
  const answers = correctInput(spec)
  const unit = spec.fields[0].unit
  answers[0] = unit ? '39820 ' + unit : '39820'
  return answers
}

type Diagnostic = ReturnType<typeof createDiagnostic>

function answer(diagnostic: Diagnostic, attempt: Attempt, correct = true): Attempt {
  const item = diagnostic.current(attempt)
  assert.ok(item)
  const transition = diagnostic.submit(attempt, item.id, correct ? correctInput(item.answer) : wrongInput(item.answer))
  assert.equal(transition.error, undefined)
  return transition.attempt
}

function result(diagnostic: Diagnostic, attempt: Attempt, id: string) {
  const row = diagnostic.report(attempt).find((row) => row.skill.id === id)
  assert.ok(row)
  return row
}

test('a focused check respects prerequisites, starts with fresh items, and keeps its own evidence', () => {
  const { diagnostic } = fixture()
  const initial = diagnostic.start()
  assert.equal(diagnostic.startSkillCheck(initial, 'factoring'), undefined)
  assert.equal(diagnostic.startSkillCheck(initial, 'future'), undefined)
  const source = diagnostic.finish(answer(diagnostic, answer(diagnostic, initial)))
  const focus = diagnostic.startSkillCheck(source, 'fluency')
  assert.ok(focus)
  assert.equal(diagnostic.current(focus)?.id, 'fluency-3')
  const saved = readAttempt(JSON.stringify(focus))
  assert.ok(saved)
  const completed = answer(diagnostic, answer(diagnostic, saved))
  assert.equal(completed.status, 'finished')
  assert.deepEqual(completed.responses.map(response => response.item.id), ['fluency-3', 'fluency-4'])
  assert.equal(result(diagnostic, completed, 'fluency').result, 'demonstrated')
  assert.deepEqual(source.responses.map(response => response.item.id), ['fluency-1', 'fluency-2'])
})

test('a focused check can reuse demonstrated prerequisites and returns a result on skip', () => {
  const { diagnostic } = fixture()
  let source = diagnostic.start()
  for (let i = 0; i < 4; i++) source = answer(diagnostic, source)
  const focus = diagnostic.startSkillCheck(diagnostic.pause(source), 'factoring')
  assert.ok(focus)
  const item = diagnostic.current(focus)
  assert.equal(item?.skillId, 'factoring')
  const skipped = diagnostic.skip(focus, item!.id).attempt
  assert.equal(skipped.status, 'finished')
  assert.equal(result(diagnostic, skipped, 'factoring').reason, 'Skipped for now')
})

test('each published item accepts its keyed response and renders its mathematical notation', () => {
  for (const item of items) {
    const check = checkAnswer(item.answer, correctInput(item.answer))
    assert.ok(check.valid && check.correct, item.id)
    const answerMath = item.answer.kind === 'choice' ? item.answer.options.map(option => option.math)
      : item.answer.kind === 'fields' ? item.answer.fields.map(field => field.math) : []
    for (const tex of [item.math, item.solutionMath, ...answerMath]) {
      if (tex) {
        const markup = renderMath(tex)
        assert.match(markup, /^<math\b/, item.id)
        assert.doesNotMatch(markup, /<merror\b/, item.id)
      }
    }
  }
})

test('mixed evidence requires a third independent item and two correct answers demonstrate the skill', () => {
  const { diagnostic } = fixture()
  let attempt = answer(diagnostic, diagnostic.start(), false)
  assert.equal(result(diagnostic, attempt, 'fluency').result, 'mixed')
  attempt = answer(diagnostic, attempt)
  assert.equal(result(diagnostic, attempt, 'fluency').reason, '1 correct response, 1 incorrect response')
  assert.equal(diagnostic.current(attempt)?.skillId, 'fluency')
  attempt = answer(diagnostic, attempt)
  assert.equal(result(diagnostic, attempt, 'fluency').result, 'demonstrated')
  assert.equal(new Set(attempt.responses.map((response) => response.item.family)).size, 3)
  assert.equal(diagnostic.current(attempt)?.skillId, 'signed')
})

test('a duplicate item family cannot serve as a confirmation check', () => {
  const items = questions('skill')
  items.splice(1, 0, { ...items[0], id: 'near-duplicate' })
  const diagnostic = createDiagnostic({ skills: [skill('skill')], items, versions })
  let attempt = answer(diagnostic, diagnostic.start())
  assert.notEqual(diagnostic.current(attempt)?.family, items[0].family)
  attempt = answer(diagnostic, attempt)
  assert.equal(result(diagnostic, attempt, 'skill').result, 'demonstrated')
})

test('essential failures pause tasks while supporting and alternative routes remain available', () => {
  const { diagnostic } = fixture()
  let attempt = diagnostic.start()
  for (let i = 0; i < 4; i++) attempt = answer(diagnostic, attempt, false)
  assert.equal(result(diagnostic, attempt, 'fluency').result, 'practise')
  assert.deepEqual(result(diagnostic, attempt, 'factoring').blockers, ['signed'])
  assert.equal(result(diagnostic, attempt, 'factoring').result, 'unassessed')
  assert.equal(result(diagnostic, attempt, 'factoring').responses.length, 0)
  assert.equal(result(diagnostic, attempt, 'future').availability, 'awaiting-bank')
  assert.equal(result(diagnostic, attempt, 'formula').availability, 'available')
  assert.equal(diagnostic.current(attempt)?.skillId, 'formula')
  attempt = answer(diagnostic, answer(diagnostic, attempt))
  assert.equal(diagnostic.current(attempt)?.skillId, 'solve')
  attempt = answer(diagnostic, answer(diagnostic, attempt))
  assert.equal(result(diagnostic, attempt, 'solve').result, 'demonstrated')
  assert.equal(attempt.status, 'finished')
  assert.equal(attempt.responses.filter((response) => response.item.skillId === 'formula').length, 2)
})

test('skips defer one skill for the session and repeated submission does not duplicate an answer', () => {
  const { diagnostic } = fixture()
  let attempt = diagnostic.start()
  const item = diagnostic.current(attempt)!
  attempt = diagnostic.skip(attempt, item.id).attempt
  assert.equal(attempt.responses[0].outcome, 'skipped')
  const skipped = result(diagnostic, attempt, 'fluency')
  assert.equal(skipped.reason, 'Skipped for now')
  assert.equal(skipped.availability, 'deferred')
  assert.equal(skipped.result, 'unassessed')
  assert.notEqual(diagnostic.current(attempt)?.skillId, 'fluency')
  assert.equal(diagnostic.skip(attempt, item.id).attempt, attempt)
  assert.equal(diagnostic.submit(attempt, item.id, correctInput(item.answer)).attempt, attempt)
  attempt = diagnostic.resume(diagnostic.pause(attempt))
  assert.equal(diagnostic.current(attempt)?.skillId, 'fluency')
  assert.notEqual(diagnostic.current(attempt)?.id, item.id)
  const second = diagnostic.current(attempt)!
  attempt = answer(diagnostic, attempt)
  assert.equal(diagnostic.submit(attempt, second.id, correctInput(second.answer)).attempt, attempt)
  assert.equal(attempt.responses.length, 2)
})

test('reaching a session limit preserves mixed evidence and resumes the same skill', () => {
  const { diagnostic } = fixture({ sessionLength: 2 })
  let attempt = answer(diagnostic, diagnostic.start())
  attempt = answer(diagnostic, attempt, false)
  assert.equal(attempt.status, 'paused')
  assert.equal(attempt.pauseReason, 'session-limit')
  assert.equal(sessionResponseCount(attempt), 2)
  const partial = diagnostic.finish(attempt)
  assert.equal(partial.status, 'finished')
  assert.equal(diagnostic.resume(partial), partial)
  assert.equal(result(diagnostic, partial, 'fluency').result, 'mixed')
  assert.equal(result(diagnostic, partial, 'signed').result, 'unassessed')

  let raw: string | null = null
  const storage = {
    getItem() { return raw },
    setItem(_key: string, value: string) { raw = value },
    removeItem() { raw = null },
  }
  assert.ok(createAttemptStore(storage).save(attempt))
  const reloaded = createAttemptStore(storage).load()
  assert.deepEqual(reloaded, JSON.parse(JSON.stringify(attempt)))
  assert.ok(reloaded)
  attempt = diagnostic.resume(reloaded)
  assert.equal(sessionResponseCount(attempt), 0)
  assert.equal(diagnostic.current(attempt)?.skillId, 'fluency')
  attempt = answer(diagnostic, attempt)
  assert.equal(result(diagnostic, attempt, 'fluency').result, 'demonstrated')
  assert.ok(createAttemptStore(storage).clear())
  assert.equal(createAttemptStore(storage).load(), undefined)
})

test('a skipped-only session pauses when every other question is blocked', () => {
  const diagnostic = createDiagnostic({ skills: [skill('first')], items: questions('first'), versions })
  const attempt = diagnostic.start()
  const item = diagnostic.current(attempt)!
  const paused = diagnostic.skip(attempt, item.id).attempt
  assert.equal(paused.status, 'paused')
  assert.equal(paused.pauseReason, 'skips')
  assert.notEqual(diagnostic.current(diagnostic.resume(paused))?.id, item.id)
})

test('JSON round-trips snapshot evidence, supports archived versions, and rejects malformed records', () => {
  const { diagnostic, skills, items } = fixture()
  let attempt = answer(diagnostic, diagnostic.start('River'))
  attempt = answer(diagnostic, attempt)
  attempt = answer(diagnostic, answer(diagnostic, attempt, false), false)
  attempt = diagnostic.finish(attempt)
  const exported = makeExport(attempt, diagnostic.report(attempt))
  const imported = readAttempt(exported)
  assert.ok(imported?.archivedChecklist)
  const { archivedChecklist, ...snapshot } = imported
  assert.deepEqual(snapshot, JSON.parse(JSON.stringify(attempt)))
  assert.equal(archivedChecklist.length, attempt.skills.length)
  const updated = createDiagnostic({ skills, items, versions: { ...versions, bank: 'new-bank' } })
  assert.equal(result(updated, imported, 'signed').result, 'practise')
  assert.equal(result(updated, imported, 'factoring').availability, 'archived')
  assert.deepEqual(result(updated, imported, 'factoring').blockers, ['signed'])
  assert.equal(readAttempt('{"format":"classroom-tools/mpm2d-diagnostic","attempt":{}}'), undefined)
  assert.equal(readAttempt(JSON.stringify({ ...attempt, responses: [{ ...attempt.responses[0], outcome: 'incorrect' }] })), undefined)

  // A mismatch in skill snapshot IDs also archives the attempt safely.
  const older = readAttempt(JSON.stringify({
    ...attempt, skills: attempt.skills.slice(0, 1), responses: attempt.responses.slice(0, 2),
  }))
  assert.ok(older)
  assert.equal(diagnostic.compatible(older), false)
  assert.equal(result(diagnostic, older, 'fluency').availability, 'archived')
  assert.equal(result(diagnostic, older, 'fluency').result, 'demonstrated')
})

test('answer checking distinguishes exact values, rounding, units, and malformed input', () => {
  assert.deepEqual(checkAnswer(numeric('-3/4'), [' − .75 ']), { valid: true, correct: true })
  assert.deepEqual(checkAnswer(numeric('-2/3'), ['4 / −6']), { valid: true, correct: true })
  assert.deepEqual(checkAnswer(numeric('-2/3'), ['-.667']), { valid: true, correct: false })
  assert.deepEqual(checkAnswer(numeric('4'), ['1/0']).valid, false)
  assert.deepEqual(checkAnswer(numeric('4'), ['2 + 2']).valid, false)
  assert.deepEqual(checkAnswer(numeric('4'), ['4', 'extra']).valid, false)

  const rounded: AnswerSpec = {
    kind: 'fields', fields: [{ label: 'Area', expected: '1.245', format: 'rounded', digits: 2, unit: 'm^2' }],
  }
  assert.deepEqual(checkAnswer(rounded, ['1.25 m²']), { valid: true, correct: true })
  assert.deepEqual(checkAnswer(rounded, ['1.24 m²']), { valid: true, correct: false })
  assert.deepEqual(checkAnswer(rounded, ['1.25 cm²']), { valid: true, correct: false })
  assert.equal(checkAnswer(rounded, ['1.25']).valid, false)
})

test('composite steps require a meaningful intermediate answer and all roots in either order', () => {
  const roots: AnswerSpec = {
    kind: 'fields', fields: [{ label: 'Common factor', expected: '2' }], roots: { expected: ['-1/2', '0'] },
  }
  assert.deepEqual(checkAnswer(roots, ['2', '0, −0.5']), { valid: true, correct: true })
  assert.deepEqual(checkAnswer(roots, ['2', '0']), { valid: true, correct: false })
  assert.deepEqual(checkAnswer(roots, ['2', '0, 0.5']), { valid: true, correct: false })
  assert.deepEqual(checkAnswer(roots, ['1', '0, -1/2']), { valid: true, correct: false })
  assert.equal(checkAnswer(roots, ['', '0, -1/2']).valid, false)
  const repeated: AnswerSpec = { kind: 'roots', expected: ['-2', '-2'] }
  assert.deepEqual(checkAnswer(repeated, ['-2']), { valid: true, correct: true })
})

test('a malformed response preserves the same question and the corrected answer is recorded once', () => {
  const { diagnostic } = fixture()
  const attempt = diagnostic.start()
  const item = diagnostic.current(attempt)!
  const malformed = diagnostic.submit(attempt, item.id, ['1/0'])
  assert.equal(malformed.attempt, attempt)
  assert.equal(malformed.field, 0)
  assert.ok(malformed.error)
  const corrected = diagnostic.submit(attempt, item.id, ['1']).attempt
  assert.equal(corrected.responses.length, 1)
  assert.equal(corrected.responses[0].outcome, 'correct')
})

test('the skill graph rejects missing references, essential cycles and insufficient bank coverage', () => {
  assert.throws(() => createDiagnostic({ skills: [skill('a', [['b']])], items: [], versions }), /Unknown skill b/)
  assert.throws(() => createDiagnostic({ skills: [skill('a', [], ['b'])], items: [], versions }), /Unknown skill b/)
  assert.throws(() => createDiagnostic({ skills: [skill('a', [['b']]), skill('b', [['a']])], items: [], versions }), /cycle/)
  assert.throws(() => createDiagnostic({ skills: [skill('a')], items: questions('a').slice(0, 3), versions }), /four items/)
  const itemWithGate = questions('b').map((item) => ({ ...item, prerequisites: ['a'] }))
  assert.throws(() => createDiagnostic({
    skills: [skill('a', [['b']]), skill('b')], items: itemWithGate, versions,
  }), /cycle/)
})

const programme = createDiagnostic({ skills, items, versions: { map: mapVersion, bank: bankVersion, rules: '1.0.0' } })

function completeProgramme(wrongSkills: string[] = []) {
  let attempt = programme.start()
  for (let steps = 0; attempt.status !== 'finished' && steps < items.length; steps++) {
    if (attempt.status === 'paused') attempt = programme.resume(attempt)
    else attempt = answer(programme, attempt, !wrongSkills.includes(programme.current(attempt)!.skillId))
  }
  assert.equal(attempt.status, 'finished')
  return attempt
}

test('the actual bank makes every assessed skill reachable for a secure student', () => {
  const attempt = completeProgramme()
  assert.equal(result(programme, attempt, 'F10').result, 'demonstrated')
  const enabled = new Set(items.map((item) => item.skillId))
  for (const id of enabled) {
    const row = result(programme, attempt, id)
    assert.equal(row.result, 'demonstrated', id)
    assert.equal(row.responses.length, defaultRules.correctRequired, id)
  }
})

test('an early checklist includes an observed skill gap alongside the earliest goal prerequisite', () => {
  const attempt = programme.finish(answer(programme, answer(programme, programme.start(), false)))
  const targets = programme.practiceTargets(attempt, 'F10')
  assert.equal(targets[0]?.skill.id, 'F08')
  assert.equal(targets[0]?.result, 'unassessed')
  assert.equal(targets[1]?.skill.id, 'N04')
  assert.equal(targets[1]?.result, 'mixed')
})

test('the actual bank continues after signed arithmetic difficulty and offers a teachable next step', () => {
  const attempt = completeProgramme(['N09', 'N10'])
  assert.equal(result(programme, attempt, 'N09').result, 'practise')
  assert.deepEqual(result(programme, attempt, 'F03').blockers, ['F02'])
  assert.equal(result(programme, attempt, 'F03').result, 'unassessed')
  assert.equal(result(programme, attempt, 'F08').result, 'demonstrated')
  assert.ok(programme.practiceTargets(attempt).some((row) => ['N09', 'N10'].includes(row.skill.id)))
})

test('the actual bank captures factoring success when the zero-product rule needs practice', () => {
  const attempt = completeProgramme(['F08'])
  assert.equal(result(programme, attempt, 'F03').result, 'demonstrated')
  assert.equal(result(programme, attempt, 'F08').result, 'practise')
  assert.equal(result(programme, attempt, 'F10').result, 'unassessed')
  assert.ok(result(programme, attempt, 'F10').blockers.includes('F08'))
  assert.equal(programme.practiceTargets(attempt, 'F10')[0]?.skill.id, 'F08')
})
