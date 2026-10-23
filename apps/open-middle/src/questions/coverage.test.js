import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {questions,findQuestion,questionLabel} from './index.js'
const sources=JSON.parse(readFileSync(new URL('./source-index.json',import.meta.url),'utf8'))
test('35 available activities retain source coverage and unique routes',()=>{
 const availableSources=sources.filter(source=>!['13-ladybugs','20-21-boards'].includes(source.questionId))
 assert.equal(sources.length,38)
 assert.equal(questions.length,35)
 assert.equal(new Set(questions.map(q=>String(q.id))).size,35)
 assert.deepEqual(new Set(availableSources.map(s=>s.questionId)),new Set(questions.map(q=>String(q.id))))
 for(const source of availableSources)assert.ok(findQuestion(`#${source.questionId}`),source.file)
 for(const q of questions){assert.equal(findQuestion(`#${q.id}`),q);assert.ok(questionLabel(q).includes(q.title))}
 assert.equal(sources.filter(s=>s.questionId==='180').length,2)
 assert.equal(findQuestion('#13-ladybugs'),undefined)
 assert.equal(findQuestion('#20-21-boards'),undefined)
 assert.ok(findQuestion('#20'))
 assert.ok(findQuestion('#21'))
 assert.equal(findQuestion('#not-a-question'),undefined)
})
