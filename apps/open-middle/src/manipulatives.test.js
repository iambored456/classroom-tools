import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DOMINO_SETS,dominoSideTotals,evaluateDominoes,classifyLines,evaluateCoordinates} from './manipulatives.js'

test('domino sides share corners and count three cells, including zero-pip halves',()=>{
 assert.deepEqual(dominoSideTotals('21',[0,1,2,3]),[8,9,12,12])
 assert.deepEqual(dominoSideTotals('21',[0,null,null,null]),[null,null,null,null])
 assert.equal(evaluateDominoes('20',[0,0,1,2]).status,'invalid')
 assert.equal(evaluateDominoes('20',[0,1,2,null]).status,'incomplete')
})
test('the exact source dominoes admit the four source target totals',()=>{
 for(const [set,targets] of [['20',[13,14]],['21',[11,12]]]){
  const found=new Set()
  for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++)for(let d=0;d<5;d++){
   const placements=[a,b,c,d];if(new Set(placements).size!==4)continue
   for(let mask=0;mask<32;mask++){
    const flips=Array.from({length:5},(_,i)=>Boolean(mask&(1<<i)))
    const result=evaluateDominoes(set,placements,flips)
    if(result.status==='success'){
     found.add(result.totals[0])
     const pairs=placements.map(t=>flips[t]?[...DOMINO_SETS[set][t]].reverse():DOMINO_SETS[set][t])
     assert.deepEqual(result.totals,pairs.map((p,i)=>p[0]+p[1]+pairs[(i+1)%4][0]))
    }
   }
  }
  for(const total of targets)assert.ok(found.has(total),`${set} can form ${total}`)
 }
})
test('line comparisons handle vertical, horizontal, coincident and degenerate cases',()=>{
 assert.equal(classifyLines([1,0],[1,5],[3,0],[3,8]),'parallel')
 assert.equal(classifyLines([1,0],[1,5],[0,3],[8,3]),'perpendicular')
 assert.equal(classifyLines([0,0],[1,1],[2,2],[3,3]),'coincident')
 assert.equal(classifyLines([0,0],[0,0],[2,2],[3,3]),'degenerate')
 assert.equal(classifyLines([0,0],[2,1],[0,1],[2,3]),'neither')
})
test('same eight unique digits can make both relations by changing the pairing',()=>{
 const values=[0,3,2,7,6,5,4,1]
 assert.equal(evaluateCoordinates(values,'parallel',0).status,'success')
 assert.equal(evaluateCoordinates(values,'perpendicular',1).status,'success')
 assert.equal(evaluateCoordinates(values,'both').status,'success')
 assert.equal(evaluateCoordinates([0,3,2,7,6,5,4,0],'both').status,'invalid')
 assert.equal(evaluateCoordinates([0,3,2,7,6,5,4,null],'both').status,'incomplete')
})
