import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {questions,findQuestion,questionLabel} from './index.js'
const sources=JSON.parse(readFileSync(new URL('./source-index.json',import.meta.url),'utf8'))
test('all 38 supplied documents map to 37 uniquely routed interactive activities',()=>{
 assert.equal(sources.length,38)
 assert.equal(questions.length,37)
 assert.equal(new Set(questions.map(q=>String(q.id))).size,37)
 assert.deepEqual(new Set(sources.map(s=>s.questionId)),new Set(questions.map(q=>String(q.id))))
 for(const source of sources)assert.ok(findQuestion(`#${source.questionId}`),source.file)
 for(const q of questions){assert.equal(findQuestion(`#${q.id}`),q);assert.ok(questionLabel(q).includes(q.title))}
 assert.equal(sources.filter(s=>s.questionId==='180').length,2)
 assert.equal(findQuestion('#not-a-question'),undefined)
})
