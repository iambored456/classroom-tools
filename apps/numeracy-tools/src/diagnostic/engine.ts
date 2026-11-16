import { checkAnswer, validAnswerSpec } from './answers'
import type { Attempt, DiagnosticData, Item, Response, Rules, Skill, SkillFocus, SkillResult } from './types'

export const defaultRules: Readonly<Rules> = {
  correctRequired: 2,
  incorrectRequired: 2,
  maxResponses: 3,
  sessionLength: 10,
}

export function validRules(rules: Rules) {
  return Object.values(rules).every((value) => Number.isSafeInteger(value) && value > 0)
    && rules.correctRequired <= rules.maxResponses
    && rules.incorrectRequired <= rules.maxResponses
}

export function sessionResponseCount(attempt: Attempt) {
  return attempt.responses.filter((response) => response.session === attempt.session).length
}

function validateData(data: DiagnosticData, rules: Rules) {
  if (!validRules(rules)) throw new Error('Invalid diagnostic rules.')

  const references = new Map<string, string[]>()
  for (const skill of data.skills) {
    if (!skill.id || references.has(skill.id)) throw new Error(`Missing or duplicate skill ID: ${skill.id}`)
    if (skill.essential.some((group) => group.length === 0)) throw new Error(`Empty prerequisite group for ${skill.id}`)
    references.set(skill.id, skill.essential.flat())
  }
  const requireSkill = (id: string, source: string) => {
    if (!references.has(id)) throw new Error(`Unknown skill ${id}, referenced by ${source}`)
  }
  for (const skill of data.skills) {
    for (const id of [...skill.essential.flat(), ...skill.supporting]) requireSkill(id, skill.id)
  }
  const itemIds = new Set<string>()
  const familiesBySkill = new Map<string, Set<string>>()
  const itemCounts = new Map<string, number>()
  for (const item of data.items) {
    if (!item.id || itemIds.has(item.id)) throw new Error(`Missing or duplicate item ID: ${item.id}`)
    if (!item.family || !validAnswerSpec(item.answer)) throw new Error(`Invalid diagnostic item: ${item.id}`)
    itemIds.add(item.id)
    requireSkill(item.skillId, item.id)
    for (const id of item.prerequisites ?? []) {
      requireSkill(id, item.id)
      references.get(item.skillId)!.push(id)
    }
    const families = familiesBySkill.get(item.skillId) ?? new Set<string>()
    families.add(item.family)
    familiesBySkill.set(item.skillId, families)
    itemCounts.set(item.skillId, (itemCounts.get(item.skillId) ?? 0) + 1)
  }
  for (const [id, families] of familiesBySkill) {
    if (families.size < rules.maxResponses || itemCounts.get(id)! < 4) {
      throw new Error(`Skill ${id} needs at least four items and enough independent families for its response limit.`)
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Essential prerequisite cycle at ${id}`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const prerequisite of references.get(id) ?? []) visit(prerequisite)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of references.keys()) visit(id)
}

type Evidence = {
  result: SkillResult['result']
  reason: string
  responses: Response[]
  families: Set<string>
  decided: boolean
  deferred: boolean
}

function evidenceBySkill(attempt: Attempt) {
  const bySkill = new Map<string, Response[]>()
  for (const response of attempt.responses) {
    const responses = bySkill.get(response.item.skillId) ?? []
    responses.push(response)
    bySkill.set(response.item.skillId, responses)
  }
  return new Map(attempt.skills.map((skill): [string, Evidence] => {
    const responses = bySkill.get(skill.id) ?? []
    let correct = 0
    let incorrect = 0
    let skipped = 0
    const families = new Set<string>()
    for (const response of responses) {
      if (response.outcome === 'skipped') {
        skipped++
      } else if (!families.has(response.item.family)) {
        families.add(response.item.family)
        if (response.outcome === 'correct') correct++
        else incorrect++
      }
    }
    let result: SkillResult['result'] = 'unassessed'
    if (correct >= attempt.rules.correctRequired) result = 'demonstrated'
    else if (incorrect >= attempt.rules.incorrectRequired) result = 'practise'
    else if (families.size > 0) result = 'mixed'

    const counts: string[] = []
    if (correct) counts.push(`${correct} correct response${correct === 1 ? '' : 's'}`)
    if (incorrect) counts.push(`${incorrect} incorrect response${incorrect === 1 ? '' : 's'}`)
    if (skipped) counts.push(skipped === 1 ? 'skipped for now' : `${skipped} skips`)
    const reason = counts.join(', ')
    return [skill.id, {
      result,
      reason: reason ? reason[0].toUpperCase() + reason.slice(1) : 'No responses yet',
      responses,
      families,
      decided: result === 'demonstrated' || result === 'practise',
      deferred: responses.some((response) => response.session === attempt.session && response.outcome === 'skipped'),
    }]
  }))
}

function groupedNames(groups: string[][], byId: Map<string, Skill>) {
  return groups.map((group) => group.map((id) => byId.get(id)?.name ?? id).join(' or ')).join(', plus ')
}

type Change = { attempt: Attempt; error?: string; field?: number }

export function createDiagnostic(data: DiagnosticData) {
  const rules = { ...(data.rules ?? defaultRules) }
  validateData(data, rules)
  const skillById = new Map(data.skills.map((skill) => [skill.id, skill]))
  const bank = new Map<string, Item[]>()
  for (const item of data.items) {
    const items = bank.get(item.skillId) ?? []
    items.push(item)
    bank.set(item.skillId, items)
  }

  function compatible(attempt: Attempt) {
    const skillIds = new Set(attempt.skills.map((skill) => skill.id))
    return attempt.versions.map === data.versions.map
      && attempt.versions.bank === data.versions.bank
      && attempt.versions.rules === data.versions.rules
      && skillIds.size === data.skills.length
      && skillIds.size === attempt.skills.length
      && data.skills.every((skill) => skillIds.has(skill.id))
  }

  function study(attempt: Attempt, ignoreSkips = false) {
    const evidence = evidenceBySkill(attempt)
    const demonstrated = (id: string) => evidence.get(id)?.result === 'demonstrated' || attempt.focus?.demonstrated.includes(id)
    const state = data.skills.map((skill) => {
      const evidenceForSkill = evidence.get(skill.id)!
      const questions = bank.get(skill.id) ?? []
      const missing = skill.essential.filter((group) => !group.some(demonstrated))
      const remaining = questions.filter((item) => !evidenceForSkill.families.has(item.family))
      const missingForItem = (item: Item) => (item.prerequisites ?? []).filter((id) => !demonstrated(id))
      const qualified = remaining.filter((item) => missingForItem(item).length === 0)
      const skipped = new Set(evidenceForSkill.responses
        .filter((response) => response.outcome === 'skipped').map((response) => response.item.id))
      let item: Item | undefined
      if ((!attempt.focus || skill.id === attempt.focus.skillId) && missing.length === 0
        && (ignoreSkips || !evidenceForSkill.deferred) && !evidenceForSkill.decided
        && evidenceForSkill.families.size < attempt.rules.maxResponses) {
        item = qualified.find((question) => !skipped.has(question.id) && !attempt.focus?.seenFamilies.includes(question.family))
          ?? qualified.find((question) => !skipped.has(question.id)) ?? qualified[0]
      }
      return { skill, evidence: evidenceForSkill, questions, missing, remaining, qualified, missingForItem, item }
    })
    // Continue independent evidence for an in-progress skill first.
    const next = state.find(({ evidence, item }) => item && evidence.families.size > 0)?.item
      ?? state.find(({ item }) => item)?.item
    return { state, next }
  }

  function current(attempt: Attempt) {
    return attempt.status === 'active' && compatible(attempt) ? study(attempt).next : undefined
  }

  function move(attempt: Attempt, status: Attempt['status'], pauseReason?: Attempt['pauseReason']): Attempt {
    const now = new Date().toISOString()
    return {
      ...attempt, status, pauseReason, updatedAt: now,
      finishedAt: status === 'finished' ? now : undefined,
    }
  }

  function settle(attempt: Attempt): Attempt {
    const next = study(attempt).next
    if (!next) {
      return !attempt.focus && study(attempt, true).next
        ? move(attempt, 'paused', 'skips')
        : move(attempt, 'finished')
    }
    if (sessionResponseCount(attempt) >= attempt.rules.sessionLength) {
      return move(attempt, 'paused', 'session-limit')
    }
    return attempt
  }

  function newAttempt(nickname: string, focus?: SkillFocus): Attempt {
    const now = new Date().toISOString()
    return settle({
      schema: 1,
      id: globalThis.crypto?.randomUUID?.() ?? ('attempt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)),
      nickname: nickname.trim().slice(0, 40),
      startedAt: now,
      updatedAt: now,
      status: 'active',
      session: 1,
      responses: [],
      skills: structuredClone(data.skills),
      versions: { ...data.versions },
      rules: { ...rules },
      ...(focus && { focus }),
    })
  }

  function start(nickname = '') {
    return newAttempt(nickname)
  }

  function startSkillCheck(source: Attempt, skillId: string): Attempt | undefined {
    if (source.focus || !compatible(source) || !bank.has(skillId)) return
    const evidence = evidenceBySkill(source)
    const demonstrated = source.skills.filter(skill => evidence.get(skill.id)?.result === 'demonstrated').map(skill => skill.id)
    const seenFamilies = [...new Set(evidence.get(skillId)?.responses.map(response => response.item.family))]
    const attempt = newAttempt(source.nickname, { skillId, sourceAttemptId: source.id, demonstrated, seenFamilies })
    return current(attempt) ? attempt : undefined
  }

  function append(attempt: Attempt, item: Item, answer: string[], outcome: Response['outcome']): Attempt {
    const at = new Date().toISOString()
    const response: Response = { item: structuredClone(item), answer: [...answer], outcome, at, session: attempt.session }
    return settle({ ...attempt, updatedAt: at, responses: [...attempt.responses, response] })
  }

  function submit(attempt: Attempt, itemId: string, answer: string[]): Change {
    const item = current(attempt)
    if (item?.id !== itemId) return { attempt }
    const check = checkAnswer(item.answer, answer)
    if (!check.valid) return { attempt, error: check.message, field: check.field }
    return { attempt: append(attempt, item, answer, check.correct ? 'correct' : 'incorrect') }
  }

  function skip(attempt: Attempt, itemId: string): Change {
    const item = current(attempt)
    if (item?.id !== itemId) return { attempt }
    return { attempt: append(attempt, item, [], 'skipped') }
  }

  function pause(attempt: Attempt) {
    return attempt.status === 'active' ? move(attempt, 'paused', 'manual') : attempt
  }

  function resume(attempt: Attempt) {
    if (attempt.status !== 'paused' || !compatible(attempt)) return attempt
    return settle(move({ ...attempt, session: attempt.session + 1 }, 'active'))
  }

  function finish(attempt: Attempt) {
    return attempt.status === 'finished' ? attempt : move(attempt, 'finished')
  }

  function report(attempt: Attempt): SkillResult[] {
    if (!compatible(attempt)) {
      const evidence = evidenceBySkill(attempt)
      const archived = new Map(attempt.archivedChecklist?.map((entry) => [entry.skillId, entry]))
      return attempt.skills.map((skill) => {
        const { result, reason, responses } = evidence.get(skill.id)!
        const recorded = archived.get(skill.id)
        return {
          skill, result, responses, availability: 'archived',
          reason: responses.length > 0 ? reason : recorded?.reason ?? reason,
          availabilityReason: recorded?.availabilityReason ?? 'This attempt used an earlier diagnostic version.',
          blockers: recorded?.blockers ?? [],
        }
      })
    }
    return study(attempt).state.map(({ skill, evidence, questions, missing, remaining, qualified, missingForItem }) => {
      const row: SkillResult = {
        skill, result: evidence.result, reason: evidence.reason, responses: evidence.responses, blockers: [],
        availability: 'available', availabilityReason: 'A question is available for this skill.',
      }
      if (evidence.decided) {
        row.availability = 'complete'
        row.availabilityReason = 'This skill has a recorded decision.'
      } else if (questions.length === 0) {
        row.availability = 'awaiting-bank'
        row.availabilityReason = 'This skill is awaiting a question bank.'
      } else if (evidence.deferred && attempt.status !== 'finished') {
        row.availability = 'deferred'
        row.availabilityReason = 'Skipped in this session. A question can be offered in the next session.'
      } else if (remaining.length === 0 || evidence.families.size >= attempt.rules.maxResponses) {
        row.availability = 'exhausted'
        row.availabilityReason = 'This attempt has used its independent checks for this skill.'
      } else if (missing.length > 0 || qualified.length === 0) {
        const itemRequirements = remaining.map(missingForItem).sort((a, b) => a.length - b.length)
        const groups = missing.length > 0 ? missing : (itemRequirements[0] ?? []).map((id) => [id])
        row.blockers = [...new Set(groups.flat())]
        row.availability = 'blocked'
        row.availabilityReason = `Waiting for a check of ${groupedNames(groups, skillById)}.`
        if (!evidence.responses.length) row.reason = row.availabilityReason
      } else if (attempt.status === 'finished') {
        row.availabilityReason = 'A question is available in a new attempt.'
      }
      return row
    })
  }

  function practiceTargets(attempt: Attempt, goalId?: string): SkillResult[] {
    const rows = report(attempt)
    const byId = new Map(rows.map((row) => [row.skill.id, row]))
    const rank = { practise: 0, mixed: 1, unassessed: 2, demonstrated: 3 }
    const candidates = new Map<string, SkillResult>()
    const addEarliest = (row: SkillResult) => {
      if (row.result === 'demonstrated' || row.availability === 'awaiting-bank') return
      if (row.availability === 'archived' && row.result === 'unassessed') return
      if (row.availability === 'blocked') {
        // Favour a route with observed evidence when more than one can unlock a task.
        const groups = row.skill.essential.filter((group) => !group.some((id) => byId.get(id)?.result === 'demonstrated'))
        for (const group of groups.length > 0 ? groups : row.blockers.map((id) => [id])) {
          const route = group.map((id) => byId.get(id)!)
            .filter((candidate) => candidate.availability !== 'awaiting-bank')
            .sort((a, b) => rank[a.result] - rank[b.result])[0]
          if (route) addEarliest(route)
        }
        return
      }
      candidates.set(row.skill.id, row)
    }
    const goal = goalId ? byId.get(goalId) : undefined
    if (goal) addEarliest(goal)
    const byResult = (a: SkillResult, b: SkillResult) => rank[a.result] - rank[b.result]
    const goalSteps = [...candidates.values()].sort(byResult)
    if (goalSteps.length >= 3) return goalSteps.slice(0, 3)
    const goalStepIds = new Set(candidates.keys())
    for (const row of rows) {
      if (row.result === 'practise' || row.result === 'mixed') addEarliest(row)
    }
    const otherSteps = [...candidates.values()].filter(row => !goalStepIds.has(row.skill.id)).sort(byResult)
    return [...goalSteps, ...otherSteps].slice(0, 3)
  }

  return { start, startSkillCheck, current, submit, skip, pause, resume, finish, report, practiceTargets, compatible }
}
