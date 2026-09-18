import {equationState, lineSum} from '@classroom-tools/open-middle-core'

const digitPositions = [
  [0, 3, 3], [1, 5, 3], [2, 7, 3],
  [3, 3, 5], [4, 7, 5],
  [5, 3, 7], [6, 5, 7], [7, 7, 7],
]
const operators = [
  ['+', 4, 3], ['+', 6, 3], ['=', 8, 3],
  ['=', 3, 2], ['+', 3, 4], ['+', 3, 6],
  ['+', 7, 4], ['+', 7, 6], ['=', 7, 8],
  ['=', 2, 7], ['+', 4, 7], ['+', 6, 7],
]
const totalPositions = {top:[9,3], right:[7,9], bottom:[1,7], left:[3,1]}
const summaryOrder = ['left', 'top', 'bottom', 'right']

export function renderSumSquare(slots, question) {
  const state = equationState(slots, question)
  const totals = Object.fromEntries(question.lines.map(line => [line.name, lineSum(slots, line.slots)]))
  return `<p class="square-instructions">${question.instruction}</p>
    <section class="sum-square ${state}" aria-label="Sum Square; ${state === 'incomplete' ? 'incomplete' : state === 'equal' ? 'all four sums equal' : 'sums do not all match'}">
      <div class="square-board">
        ${question.lines.map(line => `<div class="square-lane lane-${line.name}" aria-hidden="true"></div>`).join('')}
        ${digitPositions.map(([index, column, row]) => `<button class="square-digit ${slots[index] !== null ? 'filled' : ''}" data-slot="${index}" ${slots[index] !== null ? `data-digit="${slots[index]}"` : ''} style="--col:${column};--row:${row}" aria-label="${squarePosition(index)}: ${slots[index] ?? 'empty'}"><span>${slots[index] ?? ''}</span></button>`).join('')}
        ${operators.map(([symbol, column, row]) => `<span class="square-operator ${column === 3 && row === 2 || column === 7 && row === 8 ? 'vertical-equals' : ''}" style="--col:${column};--row:${row}" aria-hidden="true">${symbol}</span>`).join('')}
        ${question.lines.map(line => {const [column,row] = totalPositions[line.name], sum = totals[line.name]; return `<output class="square-total total-${line.name}" style="--col:${column};--row:${row}" aria-label="${line.name} sum: ${sum ?? 'not yet complete'}">${sum ?? ''}</output>`}).join('')}
      </div>
    </section>
    <div class="square-results" aria-label="Side sums">${summaryOrder.map(name => {
      const sum = totals[name]
      return `<div class="square-result result-${name}"><h2>${name} side</h2><div class="square-result-value">${sum ?? '—'}</div></div>`
    }).join('')}</div>`
}

function squarePosition(index) {
  return ['top left', 'top middle', 'top right', 'middle left', 'middle right', 'bottom left', 'bottom middle', 'bottom right'][index]
}
