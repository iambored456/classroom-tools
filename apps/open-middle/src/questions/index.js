import { question34 } from './34.js'
import { question38 } from './38.js'
import { question40 } from './40.js'

export const questions = [question34, question38, question40]

export function findQuestion(hash) {
  return questions.find(question => hash === `#${question.id}`)
}
