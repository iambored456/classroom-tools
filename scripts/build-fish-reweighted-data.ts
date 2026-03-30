import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve, relative, basename } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const defaultSkillsPath = join(rootDir, 'apps', 'fish-visualizer', 'public', 'data', 'skills.json')
const defaultOutputPath = join(rootDir, 'apps', 'fish-visualizer', 'public', 'data', 'reweighted-skills.json')

type CsvRow = {
  functional_category: string
  within_category_order: string
  category_weight: string
  score_delta: string
  continuum_band: string
  safety_flag: string
  priority_tier: string
  original_family: string
  code: string
  skill: string
  original_level: string
  weighting_note: string
}

type ExpandedRow = {
  functionalCategory: string
  withinCategoryOrder: number
  categoryWeight: number
  scoreDelta: number
  continuumBand: string
  continuumBandOrder: number
  safetyFlag: boolean
  priorityTier: string
  originalFamily: string
  sourceCode: string
  sourceSkill: string
  originalLevel: number
  weightingNote: string
  expandedCodes: string[]
}

type SkillMetadata = {
  id: string
  description: string
  functionalCategory: string
  withinCategoryOrder: number
  categoryWeight: number
  scoreDelta: number
  continuumBand: string
  continuumBandOrder: number
  safetyFlag: boolean
  priorityTier: string
  originalFamily: string
  originalLevel: number
  weightingNote: string
  sourceCode: string
  sourceSkill: string
  groupSize: number
  groupIndex: number
  grouped: boolean
}

type OutputPayload = {
  generatedAt: string
  sourceCsv: string
  skillsSource: string
  summary: {
    rowCount: number
    groupedRowCount: number
    representedSkillCount: number
    categoryCount: number
    continuumBandCount: number
    safetySkillCount: number
    needsReframeSkillCount: number
    optionalSkillCount: number
  }
  categories: string[]
  continuumBands: string[]
  rows: ExpandedRow[]
  bySkill: Record<string, SkillMetadata>
}

const RANGE_REGEX = /^([A-Z&]+)\s*(\d+)\s*[-\u2010-\u2015]\s*(?:([A-Z&]+)\s*)?(\d+)$/i
const SKILL_REGEX = /^([A-Z&]+)\s*(\d+)$/i

function printUsage(): never {
  console.error([
    'Usage:',
    '  pnpm exec tsx scripts/build-fish-reweighted-data.ts --input <csv-path> [--output <json-path>] [--skills <skills-json>]',
  ].join('\n'))
  process.exit(1)
}

function resolveCliPath(value: string): string {
  return isAbsolute(value) ? value : resolve(rootDir, value)
}

function toRepoDisplayPath(value: string): string {
  const repoRelative = relative(rootDir, value).replace(/\\/g, '/')
  return repoRelative.startsWith('..') ? basename(value) : repoRelative
}

function parseArgs(argv: string[]): { inputPath: string; outputPath: string; skillsPath: string } {
  let inputPath = ''
  let outputPath = defaultOutputPath
  let skillsPath = defaultSkillsPath

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--input') {
      inputPath = resolveCliPath(argv[index + 1] ?? '')
      index += 1
      continue
    }
    if (token === '--output') {
      outputPath = resolveCliPath(argv[index + 1] ?? '')
      index += 1
      continue
    }
    if (token === '--skills') {
      skillsPath = resolveCliPath(argv[index + 1] ?? '')
      index += 1
      continue
    }
    if (!token.startsWith('-') && !inputPath) {
      inputPath = resolveCliPath(token)
      continue
    }
    printUsage()
  }

  if (!inputPath) printUsage()
  return { inputPath, outputPath, skillsPath }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }

  result.push(current)
  return result
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    throw new Error('CSV did not contain any data rows.')
  }

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {} as Record<string, string>
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim()
    })
    return row as CsvRow
  })
}

function normalizeCode(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseInteger(value: string, fieldName: string, code: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for ${fieldName} on row ${code}: "${value}"`)
  }
  return parsed
}

function parseBandOrder(value: string): number {
  const match = value.match(/^(\d+)\./)
  if (!match) {
    throw new Error(`Could not parse continuum band order from "${value}"`)
  }
  return Number.parseInt(match[1], 10)
}

function expandCodes(value: string): string[] {
  const normalized = normalizeCode(value)
  const rangeMatch = normalized.match(RANGE_REGEX)
  if (rangeMatch) {
    const startPrefix = rangeMatch[1].toUpperCase()
    const endPrefix = (rangeMatch[3] ?? startPrefix).toUpperCase()
    const start = Number.parseInt(rangeMatch[2], 10)
    const end = Number.parseInt(rangeMatch[4], 10)
    if (startPrefix !== endPrefix) {
      throw new Error(`Mixed-prefix range is not supported: ${value}`)
    }
    const step = start <= end ? 1 : -1
    const codes: string[] = []
    for (let current = start; step > 0 ? current <= end : current >= end; current += step) {
      codes.push(`${startPrefix} ${current}`)
    }
    return codes
  }

  const singleMatch = normalized.match(SKILL_REGEX)
  if (singleMatch) {
    return [`${singleMatch[1].toUpperCase()} ${Number.parseInt(singleMatch[2], 10)}`]
  }

  throw new Error(`Could not parse skill code "${value}"`)
}

function mapRow(row: CsvRow): ExpandedRow {
  const sourceCode = normalizeCode(row.code)
  const categoryWeight = parseInteger(row.category_weight, 'category_weight', sourceCode)
  const originalLevel = parseInteger(row.original_level, 'original_level', sourceCode)
  const scoreDelta = parseInteger(row.score_delta, 'score_delta', sourceCode)

  if (originalLevel + scoreDelta !== categoryWeight) {
    throw new Error(
      `Weight mismatch on ${sourceCode}: original_level (${originalLevel}) + score_delta (${scoreDelta}) != category_weight (${categoryWeight})`,
    )
  }

  return {
    functionalCategory: row.functional_category,
    withinCategoryOrder: parseInteger(row.within_category_order, 'within_category_order', sourceCode),
    categoryWeight,
    scoreDelta,
    continuumBand: row.continuum_band,
    continuumBandOrder: parseBandOrder(row.continuum_band),
    safetyFlag: row.safety_flag.trim().toLowerCase() === 'yes',
    priorityTier: row.priority_tier,
    originalFamily: row.original_family,
    sourceCode,
    sourceSkill: row.skill,
    originalLevel,
    weightingNote: row.weighting_note,
    expandedCodes: expandCodes(row.code),
  }
}

async function main(): Promise<void> {
  const { inputPath, outputPath, skillsPath } = parseArgs(process.argv.slice(2))
  const [csvText, skillsText] = await Promise.all([
    readFile(inputPath, 'utf8'),
    readFile(skillsPath, 'utf8'),
  ])

  const rows = parseCsv(csvText).map(mapRow)
  const skills = JSON.parse(skillsText) as Record<string, string>
  const allSkillIds = Object.keys(skills).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  const seenSkillIds = new Set<string>()
  const bySkill: Record<string, SkillMetadata> = {}

  for (const row of rows) {
    row.expandedCodes.forEach((skillId, index) => {
      if (!(skillId in skills)) {
        throw new Error(`CSV references skill "${skillId}" but it was not found in ${skillsPath}`)
      }
      if (seenSkillIds.has(skillId)) {
        throw new Error(`Skill "${skillId}" was assigned by more than one CSV row.`)
      }

      seenSkillIds.add(skillId)
      bySkill[skillId] = {
        id: skillId,
        description: skills[skillId],
        functionalCategory: row.functionalCategory,
        withinCategoryOrder: row.withinCategoryOrder,
        categoryWeight: row.categoryWeight,
        scoreDelta: row.scoreDelta,
        continuumBand: row.continuumBand,
        continuumBandOrder: row.continuumBandOrder,
        safetyFlag: row.safetyFlag,
        priorityTier: row.priorityTier,
        originalFamily: row.originalFamily,
        originalLevel: row.originalLevel,
        weightingNote: row.weightingNote,
        sourceCode: row.sourceCode,
        sourceSkill: row.sourceSkill,
        groupSize: row.expandedCodes.length,
        groupIndex: index + 1,
        grouped: row.expandedCodes.length > 1,
      }
    })
  }

  const missingSkillIds = allSkillIds.filter((skillId) => !seenSkillIds.has(skillId))
  if (missingSkillIds.length > 0) {
    throw new Error(`CSV did not cover ${missingSkillIds.length} skills. First missing: ${missingSkillIds[0]}`)
  }

  const categories = [...new Set(rows.map((row) => row.functionalCategory))]
  const continuumBands = [...new Set(rows.map((row) => row.continuumBand))]
  const payload: OutputPayload = {
    generatedAt: new Date().toISOString(),
    sourceCsv: toRepoDisplayPath(inputPath),
    skillsSource: toRepoDisplayPath(skillsPath),
    summary: {
      rowCount: rows.length,
      groupedRowCount: rows.filter((row) => row.expandedCodes.length > 1).length,
      representedSkillCount: seenSkillIds.size,
      categoryCount: categories.length,
      continuumBandCount: continuumBands.length,
      safetySkillCount: Object.values(bySkill).filter((skill) => skill.safetyFlag).length,
      needsReframeSkillCount: Object.values(bySkill).filter((skill) => skill.priorityTier === 'Needs reframe').length,
      optionalSkillCount: Object.values(bySkill).filter((skill) => skill.priorityTier === 'Optional').length,
    },
    categories,
    continuumBands,
    rows,
    bySkill: Object.fromEntries(
      Object.entries(bySkill).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true })),
    ),
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${relative(rootDir, outputPath).replace(/\\/g, '/')} (${payload.summary.representedSkillCount} skills).`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
