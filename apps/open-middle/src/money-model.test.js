import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CANADIAN_COINS,moneyQuestions,evaluateMoney,formatMoney,restoreCoins,MAX_COINS} from './money-model.js'
const question=id=>moneyQuestions.find(q=>q.id===id)
const coins=(...groups)=>groups.flatMap(([value,count])=>Array.from({length:count},()=>({value,x:.5,y:.5})))

test('Canadian banks preserve denomination restrictions and sum in integer cents',()=>{
 assert.deepEqual(CANADIAN_COINS.map(c=>c.value),[1,5,10,25,100,200])
 assert.equal(evaluateMoney(question(142),coins([1,100])).totalCents,100)
 assert.equal(evaluateMoney(question(142),coins([1,100])).status,'success')
 assert.equal(evaluateMoney(question(142),coins([10,5],[5,9],[1,5])).status,'success')
 assert.equal(evaluateMoney(question(142),coins([10,11])).status,'working')
 assert.throws(()=>evaluateMoney(question(142),coins([25,4])))
 assert.equal(formatMoney(144),'$1.44')
 assert.equal(formatMoney(1),'$0.01')
})
test('Pocket Change 2 requires equal positive counts as well as the exact total',()=>{
 const q=question(143)
 assert.equal(evaluateMoney(q,[]).status,'incomplete')
 assert.equal(evaluateMoney(q,coins([1,9],[5,9],[10,9])).status,'success')
 assert.equal(evaluateMoney(q,coins([1,4],[10,14])).totalCents,144)
 assert.equal(evaluateMoney(q,coins([1,4],[10,14])).status,'working')
 assert.equal(evaluateMoney(q,coins([1,8],[5,8],[10,8])).status,'working')
 for(let count=1;count<=20;count++)assert.equal(evaluateMoney(q,coins([1,count],[5,count],[10,count])).status==='success',count===9)
})
test('Pocket Change 3 checks the coin count and total together',()=>{
 const q=question(144)
 assert.equal(evaluateMoney(q,coins([5,10],[10,5])).status,'success')
 assert.equal(evaluateMoney(q,coins([25,4])).status,'working')
 assert.equal(evaluateMoney(q,coins([10,15])).status,'working')
 assert.equal(evaluateMoney(q,coins([100,1])).status,'working')
 assert.equal(evaluateMoney(q,coins([5,10],[10,5])).count,15)
})
test('saved coin state is bounded, validates denominations, and clamps positions',()=>{
 assert.deepEqual(restoreCoins(question(142),null),[])
 const restored=restoreCoins(question(142),[{value:5,x:-1,y:2},{value:25,x:.5,y:.5},{value:1,x:NaN,y:.5},null])
 assert.deepEqual(restored,[{id:0,value:5,x:0,y:1}])
 assert.equal(restoreCoins(question(142),coins([1,MAX_COINS+1])).length,MAX_COINS)
})
