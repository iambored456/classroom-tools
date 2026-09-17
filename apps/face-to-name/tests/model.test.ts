import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerQuestion, completedPeople, nextQuestion, normalizeName, parseSet, reconcileProgress, setErrors, type FaceSet, type Mode } from '../src/model.ts'

const fixture = (): FaceSet => ({ version: 1, id: 'test-set', title: 'Test team', people: ['Jake', 'Maya', 'Sam', 'Alex', 'Robin', 'Morgan'].map((name, i) => ({ id: `person-${i}`, name, photos: ['data:image/png;base64,aGVsbG8='] })) })
function randomSeed(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 } }

test('export/import preserves IDs and images; incomplete backups remain editable', () => {
  const set = fixture()
  assert.deepEqual(parseSet(JSON.parse(JSON.stringify(set))), set)
  set.people = []
  assert.throws(() => parseSet(set), /four/)
  assert.equal(parseSet(set, false).people.length, 0)
})

test('names reject case, whitespace, and Unicode equivalent duplicates', () => {
  const set = fixture()
  set.people[1].name = ' ＪＡＫＥ '
  assert.equal(normalizeName(' ＪＡＫＥ '), 'jake')
  assert.ok(setErrors(set).some(e => e.includes('already used')))
  assert.throws(() => parseSet(set), /unique name/)
})

test('malformed packages, duplicate IDs, excess photos and external/executable image sources are rejected', () => {
  for (const value of [null, {}, { ...fixture(), id: '../outside' }, { ...fixture(), version: 2 }]) assert.throws(() => parseSet(value))
  const set = fixture(); set.people[1].id = set.people[0].id
  assert.throws(() => parseSet(set), /duplicate/)
  for (const photo of ['https://example.com/tracker.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)']) {
    const invalid = fixture(); invalid.people[0].photos = [photo]
    assert.throws(() => parseSet(invalid), /embedded/)
  }
  const excess = fixture(); excess.people[0].photos = Array(4).fill(excess.people[0].photos[0])
  assert.throws(() => parseSet(excess))
})

test('all modes finish only when every selected direction has two correct answers', () => {
  for (const mode of ['face', 'name', 'mixed'] as Mode[]) {
    const set = fixture(); let progress = reconcileProgress(set); let count = 0
    const rng = randomSeed(14)
    for (let q = nextQuestion(set, progress, mode, rng); q; q = nextQuestion(set, progress, mode, rng)) {
      assert.equal(q.choices.length, 4)
      assert.equal(new Set(q.choices.map(c => c.personId)).size, 4)
      assert.ok(q.choices.some(c => c.personId === q.personId))
      if (mode !== 'mixed') assert.equal(q.direction, mode)
      progress = answerQuestion(progress, q, q.personId)
      assert.ok(++count <= 24, 'Session must terminate')
    }
    assert.equal(count, set.people.length * (mode === 'mixed' ? 4 : 2))
    assert.equal(completedPeople(set, progress, mode), set.people.length)
  }
})

test('wrong answers reset just their direction and require two further correct answers', () => {
  const set = fixture(); let p = reconcileProgress(set)
  const q = nextQuestion(set, p, 'face', () => 0)!
  p = answerQuestion(p, q, q.personId)
  p.records[q.personId].name = 2
  p = answerQuestion(p, q, q.choices.find(c => c.personId !== q.personId)!.personId)
  assert.equal(p.records[q.personId].face, 0)
  assert.equal(p.records[q.personId].name, 2)
  assert.equal(p.records[q.personId].missedFace, true)
  p = answerQuestion(p, q, q.personId)
  assert.equal(p.records[q.personId].face, 1)
  p = answerQuestion(p, q, q.personId)
  assert.equal(p.records[q.personId].face, 2)
  assert.equal(p.records[q.personId].missedFace, false)
})

test('reviews are spaced, mistakes are weighted, and the final unfinished person can complete', () => {
  const set = fixture(); let p = reconcileProgress(set)
  const first = nextQuestion(set, p, 'face', () => 0)!
  p = answerQuestion(p, first, first.choices.find(c => c.personId !== first.personId)!.personId)
  const second = nextQuestion(set, p, 'face', () => 0)!
  assert.notEqual(second.personId, first.personId)
  p = answerQuestion(p, second, second.personId)
  const third = nextQuestion(set, p, 'face', () => 0)!
  assert.notEqual(third.personId, first.personId)
  const weighted = reconcileProgress(set); weighted.records[set.people[0].id].missedFace = true
  const counts = Object.fromEntries(set.people.map(person => [person.id, 0]))
  const rng = randomSeed(17)
  for (let i = 0; i < 10000; i++) counts[nextQuestion(set, weighted, 'face', rng)!.personId]++
  assert.ok(counts[set.people[0].id] > counts[set.people[1].id] * 2)
  for (const record of Object.values(p.records)) record.face = 2
  p.records[first.personId].face = 0
  for (let i = 0; i < 2; i++) { const q = nextQuestion(set, p, 'face')!; assert.equal(q.personId, first.personId); p = answerQuestion(p, q, q.personId) }
  assert.equal(nextQuestion(set, p, 'face'), null)
})

test('reload and set updates preserve unchanged people and reset only changed people', () => {
  const set = fixture(); const p = reconcileProgress(set)
  for (const record of Object.values(p.records)) { record.face = 2; record.name = 2 }
  assert.deepEqual(JSON.parse(JSON.stringify(reconcileProgress(set, JSON.parse(JSON.stringify(p))))), JSON.parse(JSON.stringify(p)))
  const changed = structuredClone(set); changed.title = 'New title'; changed.people[0].name = 'Jake M.'; changed.people[1].photos.push('data:image/png;base64,YWJj'); changed.people.pop(); changed.people.push({ id: 'new', name: 'New person', photos: [...set.people[0].photos] })
  const updated = reconcileProgress(changed, p)
  assert.equal(updated.records[set.people[0].id].face, 0)
  assert.equal(updated.records[set.people[1].id].name, 0)
  assert.equal(updated.records[set.people[2].id].face, 2)
  assert.equal(updated.records.new.face, 0)
  assert.equal(updated.records[set.people[5].id], undefined)
})

test('corrupt local progress is repaired and invalid selections are rejected', () => {
  const set = fixture(); const p = reconcileProgress(set)
  p.records[set.people[0].id].face = 900
  assert.equal(reconcileProgress(set, p).records[set.people[0].id].face, 0)
  assert.equal(completedPeople(set, reconcileProgress(set, { version: 99 }), 'mixed'), 0)
  assert.throws(() => answerQuestion(p, nextQuestion(set, p, 'name')!, 'missing'), /four/)
})
