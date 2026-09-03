import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourcePath = process.argv[2]
if (!sourcePath) {
  throw new Error('Usage: node scripts/import-question-bank.mjs <workbook.inspect.ndjson>')
}

const text = await readFile(resolve(sourcePath), 'utf8')
const tableLine = text
  .split(/\r?\n/)
  .find((line) => line.startsWith('{"kind":"table","sheet":"All Questions"'))

if (!tableLine) throw new Error('Could not find the All Questions table in the inspection file.')

const table = JSON.parse(tableLine)
const rows = table.values.slice(4)

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const cleanText = (value) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

const categoryNames = [...new Set(rows.map((row) => cleanText(row[2])))]
const categories = categoryNames.map((name) => ({ id: slugify(name), name }))
const questions = rows.map((row) => {
  const source = cleanText(row[0]).includes('Gregory Stock') ? 'stock' : 'poole'
  const sourceNumber = Number(row[1])

  return {
    id: `${source}-${String(sourceNumber).padStart(source === 'stock' ? 3 : 4, '0')}`,
    categoryId: slugify(cleanText(row[2])),
    prompt: cleanText(row[3]),
    followUp: cleanText(row[4]),
    source,
    sourceNumber,
    sourcePage: Number(row[6]),
  }
})

if (questions.length !== 1218) throw new Error(`Expected 1,218 questions; found ${questions.length}.`)
if (categories.length !== 11) throw new Error(`Expected 11 categories; found ${categories.length}.`)
if (new Set(questions.map((question) => question.id)).size !== questions.length) {
  throw new Error('Generated question IDs are not unique.')
}

const outputPath = resolve(import.meta.dirname, '..', 'src', 'questions.json')
await writeFile(outputPath, `${JSON.stringify({ categories, questions }, null, 2)}\n`, 'utf8')
console.log(`Wrote ${questions.length} questions across ${categories.length} categories to ${outputPath}`)
