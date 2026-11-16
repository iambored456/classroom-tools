import { checkAnswer, validAnswerSpec } from './answers'
import { validRules } from './engine'
import type { AnswerField, AnswerSpec, ArchivedAvailability, Attempt, Item, Response, Skill, SkillFocus, SkillResult, Versions } from './types'

const storageKey = 'classroom-tools.numeracy.mpm2d-diagnostic'
const exportFormat = 'classroom-tools/mpm2d-diagnostic'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function string(value: unknown): value is string {
  return typeof value === 'string'
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || string(value)
}

function list<T>(value: unknown, matches: (entry: unknown) => entry is T, limit: number): value is T[] {
  return Array.isArray(value) && value.length <= limit && value.every(matches)
}

function date(value: unknown): value is string {
  return string(value) && value.length <= 35 && Number.isFinite(Date.parse(value))
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isSkill(value: unknown): value is Skill {
  return record(value) && string(value.id) && string(value.name) && string(value.branch)
    && string(value.description) && string(value.rationale) && string(value.sourcePrerequisites)
    && list(value.supporting, string, 100)
    && list(value.essential, (entry): entry is string[] => list(entry, string, 100) && entry.length > 0, 100)
}

function isField(value: unknown): value is AnswerField {
  return record(value) && string(value.label) && string(value.expected) && optionalString(value.math)
    && optionalString(value.unit) && (value.format === undefined || value.format === 'exact' || value.format === 'rounded')
    && (value.digits === undefined || typeof value.digits === 'number')
}

function isRoots(value: unknown): value is { expected: string[]; label?: string } {
  return record(value) && list(value.expected, string, 30) && optionalString(value.label)
}

function isOption(value: unknown): value is { id: string; text: string; math?: string } {
  return record(value) && string(value.id) && string(value.text) && optionalString(value.math)
}

function isSpec(value: unknown): value is AnswerSpec {
  if (!record(value)) return false
  if (value.kind === 'roots') return isRoots(value)
  if (value.kind === 'choice') return string(value.correct) && list(value.options, isOption, 40)
  return value.kind === 'fields' && list(value.fields, isField, 30)
    && (value.roots === undefined || isRoots(value.roots))
}

function isItem(value: unknown): value is Item {
  return record(value) && string(value.id) && string(value.family) && string(value.skillId)
    && string(value.prompt) && optionalString(value.math) && optionalString(value.instruction)
    && string(value.solution) && optionalString(value.solutionMath) && optionalString(value.misconception)
    && optionalString(value.domain) && (value.prerequisites === undefined || list(value.prerequisites, string, 100))
    && (value.support === 'none' || value.support === 'calculator' || value.support === 'chart'
      || value.support === 'calculator-and-chart')
    && isSpec(value.answer) && validAnswerSpec(value.answer)
}

function isResponse(value: unknown): value is Response {
  if (!record(value) || !isItem(value.item) || !list(value.answer, string, 31)
    || !date(value.at) || !positiveInteger(value.session)) return false
  if (value.outcome === 'skipped') return value.answer.length === 0
  if (value.outcome !== 'correct' && value.outcome !== 'incorrect') return false
  const check = checkAnswer(value.item.answer, value.answer)
  return check.valid && check.correct === (value.outcome === 'correct')
}

function isVersions(value: unknown): value is Versions {
  return record(value) && string(value.map) && string(value.bank) && string(value.rules)
}

function isArchivedAvailability(value: unknown): value is ArchivedAvailability {
  return record(value) && string(value.skillId) && string(value.reason) && string(value.availabilityReason)
    && list(value.blockers, string, 300)
}

function isChecklist(value: unknown, skillIds: Set<string>): value is ArchivedAvailability[] {
  return list(value, isArchivedAvailability, 300)
    && new Set(value.map((row) => row.skillId)).size === value.length
    && value.every((row) => skillIds.has(row.skillId) && row.blockers.every((id) => skillIds.has(id)))
}

function isSkillFocus(value: unknown, skillIds: Set<string>): value is SkillFocus {
  return record(value) && string(value.sourceAttemptId) && string(value.skillId) && skillIds.has(value.skillId)
    && list(value.demonstrated, string, 300) && value.demonstrated.every(id => skillIds.has(id))
    && list(value.seenFamilies, string, 300)
}

function isAttempt(value: unknown): value is Attempt {
  if (!record(value) || value.schema !== 1 || !string(value.id) || !string(value.nickname) || value.nickname.length > 40
    || !date(value.startedAt) || !date(value.updatedAt) || !positiveInteger(value.session) || !isVersions(value.versions)
    || !list(value.skills, isSkill, 300) || !list(value.responses, isResponse, 2500)) return false
  const { status, pauseReason, rules, session } = value
  if (status !== 'active' && status !== 'paused' && status !== 'finished') return false
  if (status === 'finished' ? !date(value.finishedAt) : value.finishedAt !== undefined) return false
  if (status === 'paused'
    ? pauseReason !== 'manual' && pauseReason !== 'session-limit' && pauseReason !== 'skips'
    : pauseReason !== undefined) return false
  if (!record(rules) || !positiveInteger(rules.correctRequired) || !positiveInteger(rules.incorrectRequired)
    || !positiveInteger(rules.maxResponses) || !positiveInteger(rules.sessionLength) || !validRules({
      correctRequired: rules.correctRequired, incorrectRequired: rules.incorrectRequired,
      maxResponses: rules.maxResponses, sessionLength: rules.sessionLength,
    })) return false
  const ids = new Set(value.skills.map((skill) => skill.id))
  const focus = value.focus
  return ids.size === value.skills.length
    && (focus === undefined || (isSkillFocus(focus, ids) && value.responses.every(response => response.item.skillId === focus.skillId)))
    && (value.archivedChecklist === undefined || isChecklist(value.archivedChecklist, ids))
    && value.skills.every((skill) => [...skill.essential.flat(), ...skill.supporting].every((id) => ids.has(id)))
    && value.responses.every((response) => response.session <= session && ids.has(response.item.skillId)
      && (response.item.prerequisites ?? []).every((id) => ids.has(id)))
}

export function readAttempt(json: string): Attempt | undefined {
  if (json.length > 4_000_000) return
  try {
    const parsed: unknown = JSON.parse(json)
    if (record(parsed) && parsed.format === exportFormat) {
      if (!isAttempt(parsed.attempt)) return
      const ids = new Set(parsed.attempt.skills.map((skill) => skill.id))
      return isChecklist(parsed.checklist, ids)
        ? { ...parsed.attempt, archivedChecklist: parsed.checklist }
        : parsed.attempt
    }
    return isAttempt(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function makeExport(attempt: Attempt, report: SkillResult[]) {
  const checklist = report.map(({ skill, result, reason, availability, availabilityReason, blockers }) => ({
    skillId: skill.id, result, reason, availability, availabilityReason, blockers,
  }))
  return JSON.stringify({
    format: exportFormat, exportedAt: new Date().toISOString(),
    attempt: { ...attempt, archivedChecklist: undefined }, checklist,
  }, null, 2)
}

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createAttemptStore(storage?: BrowserStorage, key = storageKey) {
  const getStorage = () => storage ?? globalThis.localStorage
  function load(): Attempt | undefined {
    try {
      const saved = getStorage().getItem(key)
      return saved ? readAttempt(saved) : undefined
    } catch {
      return undefined
    }
  }
  function save(attempt: Attempt) {
    try {
      getStorage().setItem(key, JSON.stringify(attempt))
      return true
    } catch {
      return false
    }
  }
  function clear() {
    try {
      getStorage().removeItem(key)
      return true
    } catch {
      return false
    }
  }
  return { load, save, clear }
}
