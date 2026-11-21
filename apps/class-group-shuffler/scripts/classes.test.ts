import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultNameDisplay, parseNames, studentLabels } from '../src/classes.ts'

test('imports a Markdown roster with a student in the first row', () => {
  const roster = '\n| Jane Doe |\n| :------- |\n| Quinn Van Lane |\n| River |\n'
  assert.deepEqual(parseNames(roster), ['Jane Doe', 'Quinn Van Lane', 'River'])
})

test('imports spreadsheet rows and plain names without treating commas as separators', () => {
  const roster = '  Jane\tDoe\t\r\n  \r\nQuinn\tVan Lane\r\n"Doe, River"'
  assert.deepEqual(parseNames(roster), ['Jane Doe', 'Quinn Van Lane', 'Doe, River'])
})

test('formats names and distinguishes students whose shortened names match', () => {
  const roster = [
    { id: 'a', name: 'Jane Doe' },
    { id: 'b', name: 'Jane Day' },
    { id: 'c', name: 'Quinn Van Lane' },
    { id: 'd', name: 'River' },
  ]
  assert.deepEqual([...studentLabels(roster, defaultNameDisplay).values()], ['Jane D. (1)', 'Jane D. (2)', 'Quinn L.', 'River'])
  assert.deepEqual([...studentLabels(roster, 'first').values()], ['Jane (1)', 'Jane (2)', 'Quinn', 'River'])
  assert.deepEqual([...studentLabels(roster, 'full').values()], roster.map(student => student.name))
})
