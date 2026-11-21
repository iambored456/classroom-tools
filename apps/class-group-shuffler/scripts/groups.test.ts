import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeGroups } from '../src/groups.ts'
import type { PairingRule } from '../src/classes.ts'

test('places every present student once in balanced groups while honoring transitive pairing rules', () => {
  const present = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const result = makeGroups(present, 3, [
    { kind: 'together', students: ['a', 'b'] },
    { kind: 'together', students: ['b', 'c'] },
    { kind: 'apart', students: ['c', 'd'] },
    { kind: 'together', students: ['d', 'absent'] },
    { kind: 'apart', students: ['a', 'absent'] },
  ])
  assert.ok('groups' in result)
  const { groups } = result
  assert.deepEqual(groups.map(group => group.length).sort(), [2, 3, 3])
  assert.deepEqual(groups.flat().sort(), present)
  const paired = groups.find(group => group.includes('a'))
  assert.ok(paired?.includes('b') && paired.includes('c') && !paired.includes('d'))
})

test('distinguishes a contradictory rule from a grouping that needs more room', () => {
  const present = ['a', 'b', 'c', 'd']
  const linked: PairingRule[] = [
    { kind: 'together', students: ['a', 'b'] },
    { kind: 'together', students: ['b', 'c'] },
  ]
  assert.deepEqual(makeGroups(present, 2, linked), { reason: 'impossible' })
  assert.deepEqual(makeGroups(present, 1, [
    ...linked,
    { kind: 'apart', students: ['a', 'c'] },
  ]), { reason: 'contradictory' })
})

test('reduces the group count to the number of students present', () => {
  assert.deepEqual(makeGroups([], 4, []), { groups: [] })
  assert.deepEqual(makeGroups(['a'], 4, []), { groups: [['a']] })
})
