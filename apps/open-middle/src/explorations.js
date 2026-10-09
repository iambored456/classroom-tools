// Source prompts are transcribed from the supplied worksheets. Teacher answers
// are used only for validation, never as student-facing instructions.
export const explorationQuestions = [
  {id: '31', title: 'Parts Unknown Story Problems', category: 'Addition & subtraction', layout: 'exploration', exploration: 'apples', instruction: 'Complete the stories by filling in the blanks and circling.', sourceFiles: ['OM #31 - Parts Unknown Story Problems.docx']},
  {id: 'qf-dice-4-5', title: 'Adding Two 4-Sided or 5-Sided Dice', category: 'Probability', layout: 'exploration', exploration: 'dice', sides: [4, 5], instruction: 'Chart out all the outcomes of rolling two 4-sided dice. What’s the probability of rolling a sum of 7? What’s the most likely outcome? Then investigate two 5-sided dice and a sum of 4.', sourceFiles: ['OM #QF - Adding Two 4 Sided, 5 Sided Dice.docx']},
  {id: 'qf-dice-6', title: 'Adding Two 6-Sided Dice', category: 'Probability', layout: 'exploration', exploration: 'dice', sides: [6], instruction: 'Use two dice to fill in the addition table below.', sourceFiles: ['OM #QF - Adding Two 6 Sided Dice.docx']},
  {id: 'qf-cow', title: 'Cow Roped in a Square Field', category: 'Geometry & measurement', layout: 'exploration', exploration: 'cow', instruction: 'A cow is tied by a rope to one corner of a 20m square field. The cow can move inside half the area of the field. How long is the rope?', sourceFiles: ['OM #QF - Cow Roped in Square Field.docx']},
  {id: 'qf-backpay', title: 'Determining Backpay From Pay Stubs', category: 'Money & estimation', layout: 'exploration', exploration: 'backpay', instruction: 'You’re expecting to receive ‘back-pay’ on April 17th from work completed several months ago. Here are your most recent salary pay stubs: April 3rd: $976.80. April 17th: $1689.70. How much was there in backpay? Do not use a calculator. Round everything to the nearest hundred.', sourceFiles: ['OM #QF - Determining Backpay From Pay Stubs.docx']},
  {id: 'qf-coins', title: 'How Many Coins Can Fit in This Tray?', category: 'Geometry & measurement', layout: 'exploration', exploration: 'coins', instruction: '1) The diameter of a quarter is 18mm. What is this in centimeters? 2) How many quarters can lie flat, side by side, on a 16cm tall and 16cm wide plastic sheet?', sourceFiles: ['OM #QF - How Many Coins Can Fit In This Tray.docx']},
]

export function diceDistribution(sides) {
  if (!Number.isInteger(sides) || sides < 2 || sides > 20) throw new Error('Choose 2 to 20 sides.')
  const counts = Array(2 * sides + 1).fill(0)
  for (let a = 1; a <= sides; a++) for (let b = 1; b <= sides; b++) counts[a + b]++
  return counts
}

export function parseProbability(value) {
  const text = String(value).trim()
  if (!text) return null
  const fraction = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  let result
  if (fraction) result = Number(fraction[2]) > 0 ? Number(fraction[1]) / Number(fraction[2]) : NaN
  else if (/^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(text)) result = Number(text.slice(0, -1)) / 100
  else if (/^\d+(?:\.\d+)?$|^\.\d+$/.test(text)) result = Number(text)
  return Number.isFinite(result) && result >= 0 && result <= 1 ? result : null
}

export function checkDice(sides, cells, probability = '', mode = '') {
  let correct = 0, filled = 0
  const incorrect = []
  for (let i = 0; i < sides * sides; i++) {
    if (String(cells[i] ?? '').trim()) {
      filled++
      if (Number(cells[i]) === Math.floor(i / sides) + i % sides + 2) correct++
      else incorrect.push(i)
    }
  }
  const target = sides === 4 ? 7 : 4
  const expected = diceDistribution(sides)[target] / (sides * sides)
  const probabilityCorrect = sides === 6 || (parseProbability(probability) !== null && Math.abs(parseProbability(probability) - expected) < 0.00001)
  const modeCorrect = sides === 6 || Number(mode) === sides + 1
  return {correct, filled, incorrect, total: sides * sides, probabilityCorrect, modeCorrect, success: correct === sides * sides && probabilityCorrect && modeCorrect}
}

export const quarterCircleArea = radius => Math.PI * radius * radius / 4
export const halfFieldRope = side => Math.sqrt(2 * side * side / Math.PI)
export const roundedBackpay = (ordinary = 976.8, withBackpay = 1689.7) => Math.round(withBackpay / 100) * 100 - Math.round(ordinary / 100) * 100

export function coinArrangement(rows, columns, layout = 'grid', diameter = 1.8, side = 16) {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1 || rows > 20 || columns > 20 || !['grid', 'staggered'].includes(layout) || diameter <= 0 || side <= 0) throw new Error('Invalid coin arrangement.')
  const radius = diameter / 2
  const rowHeight = layout === 'staggered' ? diameter * Math.sqrt(3) / 2 : diameter
  const coins = []
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = radius + column * diameter + (layout === 'staggered' && row % 2 ? radius : 0)
    const y = radius + row * rowHeight
    coins.push({x, y, fits: x + radius <= side + 1e-9 && y + radius <= side + 1e-9})
  }
  return {coins, count: coins.length, inside: coins.filter(coin => coin.fits).length, fits: coins.every(coin => coin.fits), width: columns * diameter + (layout === 'staggered' && rows > 1 ? radius : 0), height: diameter + (rows - 1) * rowHeight}
}

export function storyIsCorrect(lucy, marcus, relation) {
  if (String(lucy).trim() === '' || String(marcus).trim() === '') return false
  const l = Number(lucy), m = Number(marcus)
  return Number.isSafeInteger(l) && Number.isSafeInteger(m) && l >= 0 && m >= 0 && (relation === 'more' ? l - m === 9 : relation === 'less' ? m - l === 9 : false)
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]))
const finiteInput = value => String(value ?? '').trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null
const near = (value, expected, tolerance = 0.001) => finiteInput(value) !== null && Math.abs(Number(value) - expected) <= tolerance
const field = (key, label, value, {type = 'number', min = 0, max, step = 'any', suffix = '', placeholder = ''} = {}) => `<label class="ex-field"><span>${label}</span><span class="ex-input-row"><input data-ex-field="${key}" type="${type}" value="${escape(value)}" ${type === 'number' ? `min="${min}" step="${step}" ${max === undefined ? '' : `max="${max}"`}` : ''} ${placeholder ? `placeholder="${escape(placeholder)}"` : ''} ${type === 'text' ? 'inputmode="text"' : ''}>${suffix ? `<span>${suffix}</span>` : ''}</span></label>`
const svg = (label, content, viewBox = '0 0 400 350') => `<svg class="ex-diagram" viewBox="${viewBox}" role="img" aria-label="${escape(label)}">${content}</svg>`

function freshState(question) {
  return {
    sides: question.sides?.[0] ?? 4,
    dice: Object.fromEntries([4, 5, 6].map(sides => [sides, {cells: Array(sides * sides).fill(''), probability: '', mode: '', roll: [1, 1]}])),
    stories: Array.from({length: 3}, (_, i) => ({lucy: '', marcus: '', relation: i === 0 ? 'more' : i === 1 ? 'less' : ''})),
    radius: 10, halfArea: '', rope: '', pay3: '', pay17: '', backpay: '', diameter: '', rows: 4, columns: 4, layout: 'grid', estimate: '', notes: '', attempts: [],
  }
}

function restoreState(question, saved) {
  const state = freshState(question)
  if (!saved || typeof saved !== 'object') return state
  for (const key of ['halfArea', 'rope', 'pay3', 'pay17', 'backpay', 'diameter', 'estimate', 'notes']) if (typeof saved[key] === 'string') state[key] = saved[key].slice(0, key === 'notes' ? 3000 : 80)
  for (const [key, low, high] of [['radius', 0, 20], ['rows', 1, 10], ['columns', 1, 10]]) if (Number.isFinite(Number(saved[key]))) state[key] = Math.max(low, Math.min(high, Number(saved[key])))
  state.rows = Math.round(state.rows); state.columns = Math.round(state.columns)
  if (saved.layout === 'staggered') state.layout = saved.layout
  if (question.sides?.includes(saved.sides)) state.sides = saved.sides
  for (const sides of [4, 5, 6]) {
    const prior = saved.dice?.[sides]
    if (!prior) continue
    if (Array.isArray(prior.cells)) state.dice[sides].cells = Array.from({length: sides * sides}, (_, i) => typeof prior.cells[i] === 'string' ? prior.cells[i].slice(0, 8) : '')
    for (const key of ['probability', 'mode']) if (typeof prior[key] === 'string') state.dice[sides][key] = prior[key].slice(0, 80)
  }
  for (let i = 0; i < 3; i++) {
    const story = saved.stories?.[i]
    if (!story) continue
    for (const key of ['lucy', 'marcus']) if (typeof story[key] === 'string') state.stories[i][key] = story[key].slice(0, 8)
    if (i === 2 && ['more', 'less'].includes(story.relation)) state.stories[i].relation = story.relation
  }
  if (Array.isArray(saved.attempts)) state.attempts = saved.attempts.filter(item => item && typeof item.summary === 'string').slice(-12).map(item => ({summary: item.summary.slice(0, 1500)}))
  return state
}

export function mountExploration(container, question) {
  if (!container || !question?.exploration) throw new Error('An exploration question and container are required.')
  const storageKey = `open-middle-exploration-v1-${question.id}`
  let saved
  try { saved = JSON.parse(localStorage.getItem(storageKey)) } catch {}
  let state = restoreState(question, saved), feedback = null, checked = false, saveAvailable = true
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); saveAvailable = true } catch { saveAvailable = false } }

  function renderDice() {
    const n = state.sides, work = state.dice[n], target = n === 4 ? 7 : 4
    const result = checked ? checkDice(n, work.cells, work.probability, work.mode) : null
    return `${question.sides.length > 1 ? `<div class="ex-tabs" role="group" aria-label="Choose a dice investigation">${question.sides.map(sides => `<button type="button" data-ex-sides="${sides}" aria-pressed="${sides === n}">Two ${sides}-sided dice</button>`).join('')}</div>` : ''}
      <p class="ex-prompt">${n === 6 ? 'Use two dice to fill in the addition table below.' : `Chart out all the outcomes of rolling two ${n}-sided dice.`}</p>
      <p class="ex-note">The dice are fair, independent, and numbered 1 to ${n}. Rows are the first die; columns are the second. Enter the sum in each cell.</p>
      <div class="ex-dice-controls"><span>Try a roll:</span><button type="button" data-ex-action="die1" aria-label="First die ${work.roll[0]}; click to increase">${work.roll[0]}</button><span>+</span><button type="button" data-ex-action="die2" aria-label="Second die ${work.roll[1]}; click to increase">${work.roll[1]}</button><button type="button" class="ex-secondary" data-ex-action="roll">Roll both</button><span class="ex-note">Find this cell and enter its sum.</span></div>
      <div class="ex-table-wrap"><table class="ex-dice-table"><caption>Addition outcomes for two ${n}-sided dice</caption><thead><tr><th scope="col" aria-label="First die plus second die">+</th>${Array.from({length: n}, (_, i) => `<th scope="col">${i + 1}</th>`).join('')}</tr></thead><tbody>${Array.from({length: n}, (_, row) => `<tr><th scope="row">${row + 1}</th>${Array.from({length: n}, (_, col) => { const i = row * n + col; return `<td class="${work.roll[0] === row + 1 && work.roll[1] === col + 1 ? 'ex-current-roll' : ''}"><input type="number" min="2" max="${2 * n}" step="1" inputmode="numeric" data-ex-cell="${i}" value="${escape(work.cells[i])}" aria-label="Die one ${row + 1} plus die two ${col + 1}" ${result?.incorrect.includes(i) ? 'aria-invalid="true"' : ''}></td>` }).join('')}</tr>`).join('')}</tbody></table></div>
      ${n === 6 ? '' : `<div class="ex-answer-grid">${field('probability', `What’s the probability of rolling a sum of ${target}?`, work.probability, {type: 'text', placeholder: 'Fraction, decimal, or percent'})}${field('mode', 'What’s the most likely outcome?', work.mode, {min: 2, max: 2 * n, step: 1, suffix: 'sum'})}</div>`}`
  }

  function renderCow() {
    const radius = Number(state.radius), r = radius * 13, area = quarterCircleArea(radius)
    return `<p class="ex-prompt">A cow is tied by a rope to one corner of a 20m square field.</p><p class="ex-prompt">The cow can move inside half the area of the field.</p><p class="ex-prompt">How long is the rope?</p>
      <div class="ex-split"><div>${svg(`20 metre square field, with a ${radius.toFixed(2)} metre rope tied at the bottom left. The shaded quarter-circle is the area the cow can reach.`, `<rect x="58" y="40" width="260" height="260" class="ex-field-land"/><path d="M58 300 L${58 + r} 300 A${r} ${r} 0 0 0 58 ${300 - r} Z" class="ex-grazed"/><line x1="58" y1="300" x2="${58 + r / Math.sqrt(2)}" y2="${300 - r / Math.sqrt(2)}" class="ex-rope"/><circle cx="58" cy="300" r="5" fill="#111"/><text x="188" y="25" text-anchor="middle">20 m</text><text x="338" y="175" text-anchor="middle" transform="rotate(90 338 175)">20 m</text><text x="58" y="327">Rope tied here</text>`)}
      <label class="ex-slider"><span>Explore rope length: <output>${radius.toFixed(2)} m</output></span><input type="range" min="0" max="20" step="0.01" value="${radius}" data-ex-range="radius" aria-label="Explore rope length"></label><p class="ex-note">At this length, the cow reaches ${area.toFixed(2)} m². The diagram assumes level ground and a rope tied exactly at the corner.</p></div>
      <div class="ex-answer-grid">${field('halfArea', 'Half the field’s area', state.halfArea, {suffix: 'm²'})}${field('rope', 'My rope length, to the nearest 0.01 m', state.rope, {suffix: 'm', max: 20})}<p class="ex-note">The reachable region is one quarter of a circle. Use the diagram to test your estimate, then enter your answer.</p></div></div>`
  }

  function renderBackpay() {
    return `<p class="ex-prompt">You’re expecting to receive ‘back-pay’ on April 17th from work completed several months ago.</p><p class="ex-prompt">Here are your most recent salary pay stubs:</p><div class="ex-pay-stubs"><div><span>April 3rd</span><strong>$976.80</strong></div><div><span>April 17th</span><strong>$1689.70</strong></div></div><p class="ex-prompt">How much was there in backpay?</p><p class="ex-rule">Do not use a calculator. Round everything to the nearest hundred.</p><div class="ex-answer-grid">${field('pay3', 'April 3rd, rounded to the nearest hundred', state.pay3, {suffix: '$', step: 100})}${field('pay17', 'April 17th, rounded to the nearest hundred', state.pay17, {suffix: '$', step: 100})}${field('backpay', 'Estimated backpay: subtract the rounded amounts', state.backpay, {suffix: '$', step: 100})}</div><p class="ex-note">Assume the regular salary portion is the same on both pay stubs. Your answer is an estimate using rounded amounts.</p>`
  }

  function renderCoins() {
    const arrangement = coinArrangement(state.rows, state.columns, state.layout)
    return `<p class="ex-prompt">1) The diameter of a quarter is 18mm. What is this in centimeters?</p>${field('diameter', 'Diameter in centimeters', state.diameter, {suffix: 'cm'})}<p class="ex-prompt">2) How many quarters can lie flat, side by side, on a 16cm tall and 16cm wide plastic sheet?</p><p class="ex-note">Use the worksheet’s 18 mm diameter for this model. Coins are identical flat circles in one layer, with no overlap and no overhang. Try straight rows and staggered rows.</p>
      <div class="ex-split"><div>${svg(`16 centimetre square sheet containing ${arrangement.count} coins. ${arrangement.inside} fit inside the sheet.`, `<rect x="42" y="28" width="256" height="256" class="ex-tray"/>${arrangement.coins.map(coin => `<circle cx="${42 + coin.x * 16}" cy="${28 + coin.y * 16}" r="14.4" class="${coin.fits ? 'ex-coin' : 'ex-coin-outside'}"/>`).join('')}<text x="170" y="18" text-anchor="middle">16 cm</text><text x="20" y="156" transform="rotate(-90 20 156)" text-anchor="middle">16 cm</text>`, '0 0 360 350')}<p class="ex-arrangement-status">${arrangement.count} coins arranged · ${arrangement.fits ? 'all fit inside' : `${arrangement.count - arrangement.inside} extend beyond the sheet`}</p></div><div><div class="ex-tabs" role="group" aria-label="Coin row layout"><button type="button" data-ex-layout="grid" aria-pressed="${state.layout === 'grid'}">Straight rows</button><button type="button" data-ex-layout="staggered" aria-pressed="${state.layout === 'staggered'}">Staggered rows</button></div><label class="ex-slider"><span>Rows: <output>${state.rows}</output></span><input type="range" min="1" max="10" step="1" value="${state.rows}" data-ex-range="rows" aria-label="Rows"></label><label class="ex-slider"><span>Coins in each row: <output>${state.columns}</output></span><input type="range" min="1" max="10" step="1" value="${state.columns}" data-ex-range="columns" aria-label="Coins in each row"></label>${field('estimate', 'Number of coins in my proposed arrangement', state.estimate, {step: 1})}<p class="ex-note">Can you fit more? A working arrangement shows that at least this many fit. These two regular layouts do not prove an absolute maximum for every possible packing.</p></div></div>`
  }

  function applePicture(value, person) {
    const count = finiteInput(value)
    if (count === null || !Number.isInteger(count) || count < 0) return `<div class="ex-apple-model"><strong>${person}</strong><span>Choose a number of apples.</span></div>`
    return `<div class="ex-apple-model"><strong>${person}: ${count} apples</strong><div class="ex-apple-dots" aria-hidden="true">${'<span>●</span>'.repeat(Math.min(count, 30))}</div>${count > 30 ? '<small>First 30 apples shown.</small>' : count === 0 ? '<span>No apples</span>' : ''}</div>`
  }

  function renderApples() {
    return `<p class="ex-prompt">Complete the stories by filling in the blanks and circling.</p>${state.stories.map((story, i) => `<fieldset class="ex-story"><legend>Version ${i + 1}</legend><p>Lucy has <input type="number" min="0" max="999" step="1" value="${escape(story.lucy)}" data-ex-story="${i}" data-ex-person="lucy" aria-label="Version ${i + 1}: Lucy’s apples"> apples.</p><p>She has nine ${i < 2 ? story.relation : `<select data-ex-relation="2" aria-label="Version 3: choose more or less"><option value="">Choose…</option><option value="more" ${story.relation === 'more' ? 'selected' : ''}>more</option><option value="less" ${story.relation === 'less' ? 'selected' : ''}>less</option></select>`} than Marcus.</p><p>Marcus has <input type="number" min="0" max="999" step="1" value="${escape(story.marcus)}" data-ex-story="${i}" data-ex-person="marcus" aria-label="Version ${i + 1}: Marcus’s apples"> apples.</p><div class="ex-apple-pair" data-ex-apple-model="${i}">${applePicture(story.lucy, 'Lucy')}${applePicture(story.marcus, 'Marcus')}</div></fieldset>`).join('')}`
  }

  function render() {
    const views = {dice: renderDice, cow: renderCow, backpay: renderBackpay, coins: renderCoins, apples: renderApples}
    container.innerHTML = `<section class="ex-workspace" aria-label="${escape(question.title)}">${views[question.exploration]()}<label class="ex-notes">Explain your thinking<textarea data-ex-notes rows="3" maxlength="3000" placeholder="What did you notice? How can you justify your answer?">${escape(state.notes)}</textarea></label><div class="ex-actions"><button type="button" class="ex-primary" data-ex-action="check">Check</button><button type="button" data-ex-action="save">Save attempt</button><button type="button" data-ex-action="reset">Reset</button></div><p class="ex-feedback ${feedback ? `ex-${feedback.kind}` : ''}" role="status" aria-live="polite">${escape(feedback?.text ?? '')}</p><p class="ex-save-note">${saveAvailable ? 'Your work is saved on this device as you go.' : 'Browser storage is unavailable. Your work will remain here until you leave this page.'}</p>${state.attempts.length ? `<details class="ex-attempts"><summary>Saved attempts (${state.attempts.length})</summary><ol>${state.attempts.map(attempt => `<li>${escape(attempt.summary)}</li>`).join('')}</ol></details>` : ''}</section>`
  }

  function assess() {
    const result = (success, text) => ({kind: success ? 'success' : 'try-again', text})
    if (question.exploration === 'dice') {
      const n = state.sides, work = state.dice[n], check = checkDice(n, work.cells, work.probability, work.mode)
      const messages = [`${check.correct} of ${check.total} table cells are correct.`]
      if (check.filled < check.total) messages.push(`Fill the ${check.total - check.filled} empty cells.`)
      if (check.incorrect.length) messages.push('Revisit the outlined cells: add the row heading and column heading.')
      if (n !== 6) {
        messages.push(check.probabilityCorrect ? 'Your probability is correct.' : 'For the probability, count the outcomes with the requested sum and divide by all equally likely outcomes. Fractions, decimals and percents are accepted.')
        messages.push(check.modeCorrect ? 'Your most likely sum is correct.' : 'For the most likely outcome, find the sum appearing most often.')
      }
      return result(check.success, messages.join(' '))
    }
    if (question.exploration === 'apples') {
      const good = state.stories.map(story => storyIsCorrect(story.lucy, story.marcus, story.relation))
      return result(good.every(Boolean), good.map((ok, i) => `Version ${i + 1}: ${ok ? 'correct.' : 'use non-negative whole numbers and check which person has nine more apples.'}`).join(' '))
    }
    if (question.exploration === 'cow') {
      const areaGood = near(state.halfArea, 200), ropeGood = near(state.rope, halfFieldRope(20), 0.005)
      return result(areaGood && ropeGood, areaGood && ropeGood ? 'Correct. Half the field is 200 m². A quarter-circle with a radius of about 15.96 m has this area.' : `${areaGood ? 'Your target area is correct.' : 'Find the area of the 20 m × 20 m field, then take half.'} ${ropeGood ? 'Your rope length is correct.' : 'Use one quarter of π × radius² for the reachable area. Enter the radius to the nearest 0.01 m.'}`)
    }
    if (question.exploration === 'backpay') {
      const a = near(state.pay3, 1000), b = near(state.pay17, 1700), c = near(state.backpay, roundedBackpay())
      return result(a && b && c, a && b && c ? 'Correct: $1,700 − $1,000 = $700 in estimated backpay, using the rounded pay stubs.' : `${a ? 'April 3rd is rounded correctly.' : 'Recheck April 3rd: which hundred is closest to $976.80?'} ${b ? 'April 17th is rounded correctly.' : 'Recheck April 17th: which hundred is closest to $1689.70?'} ${c ? 'Your estimated difference is correct.' : 'Subtract the rounded regular pay from the rounded pay including backpay.'}`)
    }
    const arrangement = coinArrangement(state.rows, state.columns, state.layout), conversionGood = near(state.diameter, 1.8), countGood = near(state.estimate, arrangement.count)
    const ok = conversionGood && countGood && arrangement.fits
    return result(ok, `${conversionGood ? 'Your unit conversion is correct.' : 'Check the conversion: 10 millimeters make 1 centimeter.'} ${arrangement.fits ? countGood ? `Your arrangement shows that ${arrangement.count} coins fit.` : `Count the ${state.rows} rows of ${state.columns} coins and enter your proposed total.` : 'Some coins extend past the sheet. Reduce the row or column count, or change the layout.'} ${ok ? 'Try another arrangement to see whether more coins can fit; this check does not establish a global maximum.' : ''}`)
  }

  function attemptSummary() {
    if (question.exploration === 'dice') { const work = state.dice[state.sides]; return `${state.sides}-sided dice: ${work.cells.filter(cell => cell !== '').length} cells filled${state.sides === 6 ? '' : `; probability ${work.probability || 'blank'}; most likely sum ${work.mode || 'blank'}`}. ${assess().text}` }
    if (question.exploration === 'apples') return state.stories.map((story, i) => `V${i + 1}: Lucy ${story.lucy || 'blank'}, ${story.relation || 'choose relation'}, Marcus ${story.marcus || 'blank'}`).join('; ')
    if (question.exploration === 'cow') return `Half-area ${state.halfArea || 'blank'} m²; rope ${state.rope || 'blank'} m. ${state.notes}`
    if (question.exploration === 'backpay') return `Rounded stubs $${state.pay3 || 'blank'} and $${state.pay17 || 'blank'}; estimated backpay $${state.backpay || 'blank'}. ${state.notes}`
    return `${state.layout}, ${state.rows} × ${state.columns}: diameter ${state.diameter || 'blank'} cm; proposed count ${state.estimate || 'blank'}. ${state.notes}`
  }

  function clearFeedback() {
    feedback = null; checked = false
    const status = container.querySelector('.ex-feedback')
    if (status) { status.textContent = ''; status.className = 'ex-feedback' }
    container.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'))
  }

  function onInput(event) {
    const target = event.target
    if (!target.matches('input, textarea, select')) return
    clearFeedback()
    if (target.hasAttribute('data-ex-cell')) state.dice[state.sides].cells[Number(target.dataset.exCell)] = target.value
    else if (target.hasAttribute('data-ex-field')) {
      const key = target.dataset.exField
      if (key === 'probability' || key === 'mode') state.dice[state.sides][key] = target.value
      else state[key] = target.value
    } else if (target.hasAttribute('data-ex-notes')) state.notes = target.value
    else if (target.hasAttribute('data-ex-story')) {
      const i = Number(target.dataset.exStory)
      state.stories[i][target.dataset.exPerson] = target.value
      const story = state.stories[i]
      container.querySelector(`[data-ex-apple-model="${i}"]`).innerHTML = applePicture(story.lucy, 'Lucy') + applePicture(story.marcus, 'Marcus')
    } else if (target.hasAttribute('data-ex-relation')) state.stories[2].relation = target.value
    else if (target.hasAttribute('data-ex-range')) {
      const key = target.dataset.exRange
      state[key] = Number(target.value)
      // Preserve the range element during pointer and keyboard gestures.
      if (key === 'radius') {
        const oldDiagram = container.querySelector('.ex-diagram'), temporary = document.createElement('div')
        temporary.innerHTML = renderCow()
        oldDiagram.replaceWith(temporary.querySelector('.ex-diagram'))
        target.closest('label').querySelector('output').textContent = `${state.radius.toFixed(2)} m`
        target.closest('label').nextElementSibling.textContent = `At this length, the cow reaches ${quarterCircleArea(state.radius).toFixed(2)} m². The diagram assumes level ground and a rope tied exactly at the corner.`
      } else {
        const temporary = document.createElement('div'); temporary.innerHTML = renderCoins()
        container.querySelector('.ex-diagram').replaceWith(temporary.querySelector('.ex-diagram'))
        container.querySelector('.ex-arrangement-status').replaceWith(temporary.querySelector('.ex-arrangement-status'))
        target.closest('label').querySelector('output').textContent = state[key]
      }
    }
    persist()
  }

  function reset() { const attempts = state.attempts; state = freshState(question); state.attempts = attempts; feedback = null; checked = false; persist(); render() }

  function onClick(event) {
    const button = event.target.closest('button')
    if (!button || !container.contains(button)) return
    if (button.hasAttribute('data-ex-sides')) { state.sides = Number(button.dataset.exSides); feedback = null; checked = false }
    else if (button.hasAttribute('data-ex-layout')) { state.layout = button.dataset.exLayout; feedback = null; checked = false }
    else {
      const action = button.dataset.exAction
      if (action === 'check') { checked = true; feedback = assess() }
      else if (action === 'save') { state.attempts = [...state.attempts, {summary: attemptSummary()}].slice(-12); feedback = {kind: 'saved', text: 'Attempt saved. Keep experimenting, or use Reset to start a new attempt.'} }
      else if (action === 'reset') { const attempts = state.attempts; state = freshState(question); state.attempts = attempts; feedback = null; checked = false }
      else if (action === 'roll') state.dice[state.sides].roll = [Math.floor(Math.random() * state.sides) + 1, Math.floor(Math.random() * state.sides) + 1]
      else if (action === 'die1' || action === 'die2') { const i = action === 'die1' ? 0 : 1; state.dice[state.sides].roll[i] = state.dice[state.sides].roll[i] % state.sides + 1 }
      else return
    }
    const focusSelector = button.hasAttribute('data-ex-sides') ? `[data-ex-sides="${button.dataset.exSides}"]` : button.hasAttribute('data-ex-layout') ? `[data-ex-layout="${button.dataset.exLayout}"]` : `[data-ex-action="${button.dataset.exAction}"]`
    persist(); render(); container.querySelector(focusSelector)?.focus()
  }

  persist(); render()
  container.addEventListener('input', onInput)
  container.addEventListener('click', onClick)
  const cleanup = () => { container.removeEventListener('input', onInput); container.removeEventListener('click', onClick) }
  cleanup.reset = reset
  return cleanup
}
