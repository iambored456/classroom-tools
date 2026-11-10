import { test } from 'node:test'
import assert from 'node:assert/strict'
import lessons from './lessons.json'
import { basicBanks, blend, emptySelection, isBanks, isSelection, parseBank, toggleTile } from './model'

test('tiles replace another selection in the same bank and toggle off on a second click', () => {
  let selection = toggleTile(emptySelection(), 0, 'str')
  selection = toggleTile(selection, 1, 'ai')
  selection = toggleTile(selection, 2, 'n')
  selection = toggleTile(selection, 3, 's')
  assert.equal(blend(selection), 'strains')
  const changed = toggleTile(selection, 3, 's')
  assert.equal(blend(changed), 'strain')
  assert.equal(blend(toggleTile(changed, 0, 'dr')), 'drain')
  assert.equal(blend(selection), 'strains')
})
test('custom banks preserve graphemes and safely validate restored state', () => {
  assert.deepEqual(parseBank('sh, th, sh,\nigh, '), ['sh', 'th', 'igh'])
  assert.equal(isBanks(basicBanks), true)
  assert.equal(isBanks([['a']]), false)
  assert.equal(isSelection(['b','a','t',''], basicBanks), true)
  assert.equal(isSelection(['str','a','t',''], basicBanks), false)
})
test('all lessons and variants exist, with only missing drills unavailable', () => {
  assert.equal(lessons.length, 138)
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 138)
  for (let n = 1; n <= 128; n++) assert.ok(lessons.some(lesson => Number.parseInt(lesson.id) === n))
  assert.equal(lessons.filter(lesson => lesson.banks.some(bank => bank.length)).length, 104)
  lessons.forEach(lesson => {
    assert.equal(isBanks(lesson.banks), true, lesson.id)
    assert.equal(lesson.chain.length > 0, lesson.banks.some(bank => bank.length), lesson.id)
    lesson.banks.forEach(bank => assert.equal(new Set(bank).size, bank.length, lesson.id))
  })
  assert.deepEqual(lessons.find(lesson => lesson.id === '7')?.banks, [['m','t','p','s'],['a'],['p','t'],[]])
  assert.ok(lessons.find(lesson => lesson.id === '98')?.banks[1].includes('oy'))
})
