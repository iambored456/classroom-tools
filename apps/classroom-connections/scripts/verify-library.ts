import assert from 'node:assert/strict'
import { createStarterGroups, refreshStarterGroup } from '../src/groups'
import { loadGroups } from '../src/storage'
import { DIFFICULTIES, type WordGroup } from '../src/types'

const groups = createStarterGroups()
assert.equal(groups.length, 108)
assert.equal(new Set(groups.map((group) => group.id)).size, groups.length)
for (const difficulty of DIFFICULTIES) {
  assert.equal(groups.filter((group) => group.difficulty === difficulty).length, difficulty === 'easy' ? 36 : 24)
}
for (const group of groups) {
  assert.equal(group.words.length, 4)
  assert.equal(new Set(group.words.map((word) => word.trim().toLowerCase())).size, 4)
}

const greetings = groups.find((group) => group.title === 'Greetings')!
assert.deepEqual(greetings.words, ['Hello', 'Hi', 'Hey', 'Yo'])

const eatingUtensils = groups.find((group) => group.title === 'Eating utensils')!
assert.deepEqual(eatingUtensils.words, ['Fork', 'Spoon', 'Knife', 'Chopsticks'])

const silentK = groups.find((group) => group.id === 'starter-32-begin-with-a-silent-k')!
assert.deepEqual(silentK.words, ['Kneel', 'Knuckle', 'Knot', 'Knack'])
const oldSilentK = { ...silentK, words: ['Knife', 'Knight', 'Knot', 'Knack'], enabled: true }
const previousSilentK = { ...oldSilentK, words: ['Kneel', 'Knight', 'Knot', 'Knack'] }
assert.deepEqual(refreshStarterGroup(previousSilentK), { ...silentK, enabled: true })
const editedSilentK = { ...oldSilentK, words: ['Knife', 'Knight', 'Knot', 'Knock'] }
assert.equal(refreshStarterGroup(editedSilentK), editedSilentK, 'Preserve teacher-edited Silent K answers')

const fruits = groups.find((group) => group.id === 'starter-3-fruits')!
assert.deepEqual(fruits.words, ['Apple', 'Banana', 'Grape', 'Pear'])
const oldFruits: WordGroup = { ...fruits, words: ['Apple', 'Banana', 'Orange', 'Pear'], enabled: false }
const refreshedFruits = refreshStarterGroup(oldFruits)
assert.deepEqual(refreshedFruits.words, fruits.words)
assert.equal(refreshedFruits.enabled, false)
assert.equal(refreshedFruits.id, oldFruits.id)
assert.equal(oldFruits.words[2], 'Orange', 'Refreshing must not mutate the stored source')
assert.equal(refreshStarterGroup(refreshedFruits), refreshedFruits, 'Refreshing must be idempotent')

// Teachers may change the words, title, tier, or convert a starter to a custom group.
for (const edited of [
  { ...oldFruits, words: ['Apple', 'Banana', 'Orange', 'Mango'] },
  { ...oldFruits, title: 'Our favourite fruits' },
  { ...oldFruits, difficulty: 'hard' as const },
  { ...oldFruits, custom: true },
]) {
  assert.equal(refreshStarterGroup(edited), edited, 'Preserve teacher-edited starter groups')
}
for (const group of groups.filter(({ difficulty }) => difficulty === 'hard' || difficulty === 'tricky')) {
  assert.equal(refreshStarterGroup(group), group, 'Leave current Hard and Tricky entries unchanged')
}

const roadVehicles = groups.find((group) => group.id === 'starter-52-vehicles')!
assert.equal(roadVehicles.title, 'Road vehicles')
const oldVehicles = { ...roadVehicles, title: 'Vehicles', enabled: false }
assert.deepEqual(refreshStarterGroup(oldVehicles), { ...roadVehicles, enabled: false })

const entries = new Map<string, string>()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
  },
})
try {
  const key = 'classroom-connections:library:v1'
  const custom = { ...oldFruits, id: 'custom-fruits', custom: true }
  const savedVersions = new Map([
    [oldFruits.id, oldFruits],
    [oldVehicles.id, oldVehicles],
    [oldSilentK.id, oldSilentK],
  ])
  const saved = groups.slice(0, 96).map((group) => savedVersions.get(group.id) ?? group)
  entries.set(key, JSON.stringify([...saved, custom]))
  const loaded = loadGroups()
  assert.equal(loaded.length, 109)
  assert.deepEqual(loaded.slice(-12), groups.slice(-12), 'Append the newly added Easy groups')
  assert.deepEqual(loaded.find((group) => group.id === silentK.id), { ...silentK, enabled: true })
  assert.deepEqual(loaded.find((group) => group.id === oldFruits.id), refreshedFruits)
  assert.deepEqual(loaded.find((group) => group.id === oldVehicles.id), { ...roadVehicles, enabled: false })
  assert.deepEqual(loaded.find((group) => group.id === custom.id), custom)
  assert.deepEqual(JSON.parse(entries.get(key)!), loaded, 'Persist the refreshed starter content')
  assert.deepEqual(loadGroups(), loaded, 'Reloading must preserve the refreshed content and preferences')
} finally {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
}

console.log('Starter library and saved-library refresh checks passed.')
