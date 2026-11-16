export interface Skill {
  id: string
  name: string
  branch: string
  description: string
  /** Each group is required. Any skill in the group can satisfy it. */
  essential: string[][]
  supporting: string[]
  rationale: string
  sourcePrerequisites: string
}

export interface AnswerField {
  label: string
  math?: string
  expected: string
  format?: 'exact' | 'rounded'
  digits?: number
  unit?: string
}

interface RootField {
  label?: string
  expected: string[]
}

export type AnswerSpec =
  | { kind: 'fields'; fields: AnswerField[]; roots?: RootField }
  | ({ kind: 'roots' } & RootField)
  | { kind: 'choice'; options: { id: string; text: string; math?: string }[]; correct: string }

export interface Item {
  id: string
  skillId: string
  family: string
  prompt: string
  math?: string
  instruction?: string
  prerequisites?: string[]
  answer: AnswerSpec
  solution: string
  solutionMath?: string
  misconception?: string
  support: 'none' | 'calculator' | 'chart' | 'calculator-and-chart'
  domain?: string
}

export interface Rules {
  correctRequired: number
  incorrectRequired: number
  maxResponses: number
  sessionLength: number
}

export interface Versions {
  map: string
  bank: string
  rules: string
}

export interface DiagnosticData {
  skills: Skill[]
  items: Item[]
  versions: Versions
  rules?: Rules
}

export interface Response {
  item: Item
  outcome: 'correct' | 'incorrect' | 'skipped'
  answer: string[]
  at: string
  session: number
}

export interface Attempt {
  schema: 1
  id: string
  nickname: string
  startedAt: string
  updatedAt: string
  finishedAt?: string
  status: 'active' | 'paused' | 'finished'
  pauseReason?: 'manual' | 'session-limit' | 'skips'
  session: number
  responses: Response[]
  skills: Skill[]
  versions: Versions
  rules: Rules
  archivedChecklist?: ArchivedAvailability[]
  focus?: SkillFocus
}

export interface SkillFocus {
  skillId: string
  sourceAttemptId: string
  demonstrated: string[]
  seenFamilies: string[]
}

export interface ArchivedAvailability {
  skillId: string
  reason: string
  availabilityReason: string
  blockers: string[]
}

export interface SkillResult {
  skill: Skill
  result: 'demonstrated' | 'practise' | 'mixed' | 'unassessed'
  reason: string
  availability: 'available' | 'blocked' | 'awaiting-bank' | 'deferred' | 'complete' | 'exhausted' | 'archived'
  availabilityReason: string
  blockers: string[]
  responses: Response[]
}
