import {test} from 'node:test'
import assert from 'node:assert/strict'
import {renderSumSquare} from './sum-square.js'
import {question34} from './questions/34.js'

test('each completed side fills its own endpoint', () => {
  const html = renderSumSquare([1,2,3,4,5,6,7,8], question34)
  for (const [side, column, row, sum] of [
    ['left',3,1,11], ['top',9,3,6], ['bottom',1,7,21], ['right',7,9,16],
  ]) {
    assert.match(html, new RegExp(`class="square-total total-${side}" style="--col:${column};--row:${row}"[^>]*>${sum}</output>`))
  }
  assert.match(html, /result-left[\s\S]*result-top[\s\S]*result-bottom[\s\S]*result-right/)
  assert.doesNotMatch(html, /class="blocks"/)
})

test('the left side auto-completes above its column while other sides stay empty', () => {
  const html = renderSumSquare([3,null,null,2,null,1,null,null], question34)
  assert.match(html, /class="square-total total-left" style="--col:3;--row:1"[^>]*>6<\/output>/)
  for (const side of ['top', 'bottom', 'right']) {
    assert.match(html, new RegExp(`class="square-total total-${side}"[^>]*></output>`))
  }
})
