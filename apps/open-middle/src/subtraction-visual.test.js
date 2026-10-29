import {test} from 'node:test'
import assert from 'node:assert/strict'
import {subtractionModel,subtractionVisual} from './subtraction-visual.js'
import {numericQuestions} from './numeric-catalog.js'

test('positive subtraction cancels blocks and leaves the regrouped difference', () => {
 const model=subtractionModel([5,2,1,3])
 assert.equal(model.value,39)
 assert.deepEqual(model.columns.map(c=>c.cancelled),[0,1,3])
 assert.deepEqual(model.columns.map(c=>c.remaining),[0,3,9])
 assert.deepEqual(model.columns.map(c=>c.negative),[0,0,0])
 assert.equal(subtractionModel([3,0,1,2,9,8]).value,3)
 assert.deepEqual(subtractionModel([3,0,1,2,9,8]).columns.map(c=>c.remaining),[0,0,3])
})

test('negative subtraction uses bare strikes for the deficit', () => {
 const model=subtractionModel([1,3,5,2])
 assert.equal(model.value,-39)
 assert.deepEqual(model.columns.map(c=>c.cancelled),[0,1,3])
 assert.deepEqual(model.columns.map(c=>c.remaining),[0,0,0])
 assert.deepEqual(model.columns.map(c=>c.negative),[0,3,9])
 const markup=subtractionVisual([1,3,5,2])
 assert.equal((markup.match(/nm-sub-negative/g)??[]).length,12)
 assert.match(markup, /class="rod nm-sub-negative" aria-hidden="true"><\/span>/)
 assert.doesNotMatch(markup, /nm-sub-negative[^>]*><i>/)
})

test('answer stays blank until every digit is filled, including missing zero digits', () => {
 assert.equal(subtractionModel([5,2,1,null]).value,null)
 assert.equal(subtractionModel([3,null,1,2,9,8]).value,null)
 assert.equal(subtractionModel([3,0,1,2,9,8]).value,3)
 assert.equal(subtractionModel([null,null,null,null]).empty,true)
 assert.equal(subtractionModel([1,3,1,3]).value,0)
 for(const id of [43,44]) {
  const q=numericQuestions.find(q=>q.id===id)
  assert.equal(q.rows[0][3],'=')
  assert.equal(q.rows[0][4].type,'output')
 }
})

test('shared and unmatched blocks conserve both operands for either sign', () => {
 const digits=n=>String(n).padStart(3,'0').split('').map(Number)
 const sum=(model,key)=>model.columns.reduce((value,c)=>value+c[key]*c.weight,0)
 for(let left=0;left<1000;left++) for(const right of [0,999,left,Math.max(0,left-39),Math.min(999,left+39)]) {
  const model=subtractionModel([...digits(left),...digits(right)])
  assert.equal(sum(model,'cancelled')+sum(model,'remaining'),left)
  assert.equal(sum(model,'cancelled')+sum(model,'negative'),right)
  assert.equal(sum(model,'remaining')-sum(model,'negative'),model.value)
 }
})
