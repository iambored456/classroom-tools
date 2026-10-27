import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {questions,findQuestion,questionLabel} from './index.js'
const sources=JSON.parse(readFileSync(new URL('./source-index.json',import.meta.url),'utf8'))
test('37 available activities retain worksheet coverage and unique routes',()=>{
 const availableSources=sources.filter(source=>!['13-ladybugs','20-21-boards'].includes(source.questionId))
 assert.equal(sources.length,38)
 assert.equal(questions.length,37)
 assert.equal(new Set(questions.map(q=>String(q.id))).size,37)
 assert.deepEqual(new Set(availableSources.map(s=>s.questionId)),new Set(questions.filter(q=>!['109-comparing-fractions','59'].includes(String(q.id))).map(q=>String(q.id))))
 for(const source of availableSources)assert.ok(findQuestion(`#${source.questionId}`),source.file)
 for(const q of questions){assert.equal(findQuestion(`#${q.id}`),q);assert.ok(questionLabel(q).includes(q.title))}
 assert.equal(sources.filter(s=>s.questionId==='180').length,2)
 assert.equal(findQuestion('#13-ladybugs'),undefined)
 assert.equal(findQuestion('#20-21-boards'),undefined)
 assert.ok(findQuestion('#20'))
 assert.ok(findQuestion('#21'))
 assert.equal(findQuestion('#not-a-question'),undefined)
})

test('#59 is a native manipulative activity with its original web attribution',()=>{
 const fractions=findQuestion('#59')
 assert.ok(fractions)
 assert.equal(fractions.kind,'manipulative')
 assert.equal(fractions.layout,'manipulative')
 assert.equal(fractions.sourceUrl,'https://www.openmiddle.com/fractions-on-a-number-line/')
 assert.equal(questionLabel(fractions),'#59 - Fractions on a Number Line')
})

test('both #109 fraction activities keep separate routes and clear labels',()=>{
 const comparing=findQuestion('#109-comparing-fractions')
 assert.ok(comparing)
 assert.equal(comparing.sourceUrl,'https://www.openmiddle.com/comparing-fractions/')
 assert.equal(questionLabel(comparing),'#109 - Comparing Fractions')
 assert.equal(questionLabel(findQuestion('#109')),'#109 - Equivalent Fractions')
})
