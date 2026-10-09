import { question34 } from './34.js'
import { question38 } from './38.js'
import { question40 } from './40.js'
import { numericQuestions } from '../numeric-catalog.js'
import { explorationQuestions } from '../explorations.js'
import { manipulativeQuestions } from '../manipulatives.js'

export const questions = [question34, question38, question40, ...numericQuestions, ...explorationQuestions, ...manipulativeQuestions].sort((a,b)=>{
 const numberA=parseInt(a.id),numberB=parseInt(b.id)
 return (Number.isNaN(numberA)?1000:numberA)-(Number.isNaN(numberB)?1000:numberB) || String(a.id).localeCompare(String(b.id),undefined,{numeric:true})
})

export const questionLabel = question => `#${String(question.id).startsWith('qf-')?'QF':String(question.id).startsWith('13-')?'13':question.id==='20-21-boards'?'20 / 21':question.id} - ${question.title}`

export function findQuestion(hash) {
  return questions.find(question => hash === `#${question.id}`)
}
