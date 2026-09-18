import {test} from 'node:test'
import assert from 'node:assert/strict'
import {emptySlots,placeDigit,equationState,numberWords,numberAt,sideSum,lineSum} from './model.js'
test('recognizes complete equal and unequal sentences',()=>{assert.equal(equationState([1,2,8,5,3,0,6,7]),'equal');assert.equal(equationState([1,2,8,5,3,0,6,9]),'unequal');assert.equal(equationState(emptySlots()),'incomplete')})
test('moves and swaps digits without duplicates, including leading zero',()=>{let s=[1,2,8,5,3,0,6,7];assert.deepEqual(placeDigit(s,2,2),[1,8,2,5,3,0,6,7]);assert.deepEqual(placeDigit(s,0,0),[0,2,8,5,3,1,6,7]);assert.deepEqual(placeDigit(s,1,5),[0,2,8,5,3,1,6,7]);assert.throws(()=>placeDigit(s,10,0))})
test('leading zero forms a single-digit value in words and equations',()=>{let s=placeDigit(emptySlots(),0,0);s=placeDigit(s,3,1);assert.equal(numberAt(s,0),3);assert.equal(numberWords(numberAt(s,0)),'three');assert.equal(equationState([0,3,6,9,1,4,5,8]),'equal');assert.equal(equationState([0,3,6,9,1,4,5,7]),'unequal')})
test('shows the value of placed digits while leaving an empty pair blank',()=>{assert.equal(numberAt([null,null],0),null);assert.equal(numberAt([4,null],0),40);assert.equal(numberAt([null,4],0),4);assert.equal(numberAt([0,null],0),0);assert.equal(numberAt([null,0],0),0);assert.equal(numberAt([4,0],0),40);assert.equal(numberWords(40),'forty');assert.equal(numberWords(15),'fifteen');assert.equal(numberWords(98),'ninety-eight')})
test('partial values do not trigger equation feedback',()=>{assert.equal(equationState([4,null,1,null,2,null,3,null]),'incomplete')})
test('each side gets a sum only when its four digits are filled',()=>{
  const slots = [1,2,7,0,null,null,null,null]
  assert.equal(sideSum(slots,0),82)
  assert.equal(sideSum(slots,1),null)
  assert.equal(sideSum([1,null,7,0,2,3,4,5],0),null)
  assert.equal(sideSum([1,null,7,0,2,3,4,5],1),68)
  assert.equal(sideSum([0,3,1,2,null,null,null,null],0),15)
  assert.equal(numberWords(100),'one hundred')
  assert.equal(numberWords(sideSum([9,8,7,6,null,null,null,null],0)),'one hundred and seventy-four')
})
test('three-number addition uses six slots and the allowed digit bank',()=>{
  const question = {numberCount:3, digits:[1,2,3,4,5,6,7], sides:[[0,1],[2]]}
  assert.equal(emptySlots(question).length,6)
  assert.deepEqual(placeDigit(emptySlots(question),1,0,question),[1,null,null,null,null,null])
  assert.throws(()=>placeDigit(emptySlots(question),0,0,question))
  assert.throws(()=>placeDigit(emptySlots(question),7,6,question))
  assert.equal(sideSum([1,2,3,5,4,7],0,question),47)
  assert.equal(sideSum([1,2,3,5,4,7],1,question),47)
  assert.equal(equationState([1,2,3,5,4,7],question),'equal')
  assert.equal(equationState([1,2,3,4,5,7],question),'unequal')
  assert.equal(equationState([1,2,3,null,4,7],question),'incomplete')
})

test('sum square shares corner digits across all four equations',()=>{
  const question = {slotCount:8,digits:[0,1,2,3,4,5,6,7,8,9],lines:[
    {slots:[0,1,2]},{slots:[2,4,7]},{slots:[5,6,7]},{slots:[0,3,5]},
  ]}
  const equal = [1,9,2,8,6,3,5,4]
  assert.equal(emptySlots(question).length,8)
  assert.deepEqual(question.lines.map(line=>lineSum(equal,line.slots)),[12,12,12,12])
  assert.equal(equationState(equal,question),'equal')
  assert.equal(equationState([1,9,2,8,6,3,0,4],question),'unequal')
  assert.equal(lineSum([1,null,2],question.lines[0].slots),null)
  assert.equal(equationState([1,9,2,8,6,3,null,4],question),'incomplete')
  assert.deepEqual(placeDigit(equal,0,1,question),[1,0,2,8,6,3,5,4])
})
