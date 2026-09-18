import './style.css'
import './targets.css'
import './sum-square.css'
import {emptySlots, placeDigit, numberAt, equationState, numberWords, sideSum} from '@classroom-tools/open-middle-core'
import {baseTenBlocks as blocks} from '@classroom-tools/open-middle-core/blocks'
import {findQuestion, questions} from './questions/index.js'
import {renderSumSquare} from './sum-square.js'
const app = document.querySelector('#app')
let slots = emptySlots(), selected = null, drag = null, suppressClick = false
let showSums = [false, false]
let activeQuestionId = null
let doubleSpace = false
try { doubleSpace = localStorage.getItem('open-middle-double-space') === 'true' } catch {}
const icons = {help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3"/><path d="M12 17h.01"/>',home:'<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3z"/>',refresh:'<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6"/>',settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 1 2 4h4l1-3 3-1 3-3-2-2 1-4-3-1-2-4z"/><circle cx="11.5" cy="12" r="3"/>'}
const icon = (name,label) => `<button class="icon" id="${name}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg></button>`
const classroomToolsUrl = location.pathname.includes('/open-middle/')
  ? new URL('../', location.href).href
  : 'https://iambored456.github.io/classroom-tools/'
const landingHome = `<a class="icon landing-home" href="${classroomToolsUrl}" aria-label="Classroom Tools home" title="Classroom Tools home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons.home}</svg></a>`
const instructions = question => `<p class="instructions">${question.instruction}</p>`
const bank = problem => `<div class="bank" data-layout="${problem.layout}" aria-label="Available digits; drop here to return a digit">${problem.digits.map(d=>`<button class="digit ${slots.includes(d)?'used':''} ${selected===d?'selected':''}" data-digit="${d}" aria-label="Digit ${d}${slots.includes(d)?', already placed':''}" ${slots.includes(d)?'disabled':''}>${d}</button>`).join('')}</div>`
function twoDigitEquation(problem) {
 return `${problem.instructionPosition==='above'?instructions(problem):''}${bank(problem)}${problem.instructionPosition==='below'?instructions(problem):''}<section class="equation ${equationState(slots,problem)}" data-layout="${problem.layout}" aria-label="${problem.numberCount} two-digit numbers in an equation">${Array.from({length:problem.numberCount},(_,i)=>`${i?`<span class="operator">${i===problem.sides[1][0]?'=':'+'}</span>`:''}<div class="number"><div class="number-box"><svg class="number-outline" aria-hidden="true" width="100%" height="100%"><rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" /></svg>${[i*2,i*2+1].map(s=>`<button class="slot ${slots[s]!==null?'filled':''}" data-slot="${s}" ${slots[s]!==null?`data-digit="${slots[s]}"`:''} aria-label="Number ${i+1}, ${s%2?'ones':'tens'}: ${slots[s]??'empty'}"><svg class="slot-outline" aria-hidden="true" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" /></svg><span>${slots[s]??''}</span></button>`).join('')}</div><div class="words">${numberAt(slots,i)===null?'':numberWords(numberAt(slots,i))}</div>${blocks(numberAt(slots,i))}</div>`).join('')}${problem.showSideSums?sumPanel(0,problem)+sumPanel(1,problem):''}</section>`
}
function render() {
 const problem = findQuestion(location.hash)
 if ((problem?.id ?? null) !== activeQuestionId) {
   slots = emptySlots(problem); selected = null; showSums = [false, false]
   activeQuestionId = problem?.id ?? null
 }
 if (problem?.showSideSums) for (const side of [0,1]) if (sideSum(slots,side,problem) === null) showSums[side] = false
 app.className = doubleSpace ? 'double-space' : ''
 if (!problem) { app.innerHTML = `<main class="landing"><div class="landing-heading"><h1>Open Middle Math</h1>${landingHome}</div><div class="problem-list">${questions.map(question => `<a class="problem-link" href="#${question.id}">#${question.id} - ${question.title}</a>`).join('')}</div></main>`; return }
 app.innerHTML = `${icon('home','Home')}<nav class="corner-tools" aria-label="Problem controls">${icon('refresh','Reset problem')}${icon('help','Help')}${icon('settings','Settings')}</nav><main class="workspace">${problem.layout === 'sum-square' ? bank(problem) + renderSumSquare(slots,problem) : twoDigitEquation(problem)}</main><dialog id="help-dialog" aria-labelledby="help-title"><form method="dialog"><div class="dialog-heading"><h2 id="help-title">How to play</h2><button aria-label="Close help" class="close">&times;</button></div><p class="help-copy">Drag a digit, or select a digit and then a space. Select a placed digit to return it.${problem.layout === 'sum-square' ? ' Each gray square shows its side’s total when all three digits are placed.' : ''}</p></form></dialog><dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog"><div class="dialog-heading"><h2 id="settings-title">Settings</h2><button aria-label="Close settings" class="close">×</button></div><label><input id="spacing" type="checkbox" ${doubleSpace?'checked':''}> Double-space between words</label></form></dialog>`
 document.querySelector('#home').onclick = () => {location.hash=''}
 document.querySelector('#refresh').onclick = () => { slots=emptySlots(problem);selected=null;showSums=[false,false];render() }
 document.querySelector('#help').onclick = () => document.querySelector('#help-dialog').showModal()
 document.querySelector('#settings').onclick = () => document.querySelector('#settings-dialog').showModal()
 document.querySelector('#spacing').onchange = e => {doubleSpace=e.target.checked;app.classList.toggle('double-space',doubleSpace);try{localStorage.setItem('open-middle-double-space',String(doubleSpace))}catch{}}
}
function sumPanel(side, problem) {
 const sum = sideSum(slots,side,problem)
 if (sum === null) return ''
 const label = side === 0 ? 'left' : 'right', expanded = showSums[side]
 return `<div class="side-total" data-side="${side}"><button class="scale-toggle" data-toggle-sum="${side}" aria-label="${expanded?'Hide':'Show'} ${label} side sum" aria-expanded="${expanded}" aria-controls="sum-${side}" title="${expanded?'Hide':'Show'} ${label} side sum"><svg viewBox="0 0 40 44" aria-hidden="true"><circle cx="20" cy="4" r="2.5" fill="currentColor"/><path d="M20 6 3 36H37Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M3 36Q20 46 37 36Z" fill="currentColor"/></svg></button><div id="sum-${side}" class="sum-visual" ${expanded?'':'hidden'}><svg class="sum-arrows" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="sum-arrow-${side}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="m1 1 7 4-7 4"/></marker></defs><path d="M140 0 178 52" marker-end="url(#sum-arrow-${side})"/><path d="M260 0 222 52" marker-end="url(#sum-arrow-${side})"/></svg><div class="sum-words" aria-live="polite">${numberWords(sum)}</div>${blocks(sum)}</div></div>`
}
app.addEventListener('click',e=>{
 if(suppressClick){suppressClick=false;return}
 const sumToggle=e.target.closest('[data-toggle-sum]')
 if(sumToggle){const side=Number(sumToggle.dataset.toggleSum);showSums[side]=!showSums[side];render();document.querySelector(`[data-toggle-sum="${side}"]`).focus();return}
 const slot=e.target.closest('[data-slot]'), digit=e.target.closest('[data-digit]')
 if(slot){const index=Number(slot.dataset.slot);if(selected!==null){slots=placeDigit(slots,selected,index,findQuestion(location.hash));selected=null}else if(slots[index]!==null){slots[index]=null}render();document.querySelector(`[data-slot="${index}"]`).focus()}
 else if(digit&&!digit.disabled){selected=selected===Number(digit.dataset.digit)?null:Number(digit.dataset.digit);render();document.querySelector(`.bank [data-digit="${digit.dataset.digit}"]`).focus()}
})
app.addEventListener('keydown',e=>{
 const slot=e.target.closest('[data-slot]');if(!slot)return
 const i=Number(slot.dataset.slot)
 if(/^\d$/.test(e.key) && findQuestion(location.hash)?.digits.includes(Number(e.key))){e.preventDefault();slots=placeDigit(slots,Number(e.key),i,findQuestion(location.hash));render();document.querySelector(`[data-slot="${Math.min(slots.length-1,i+1)}"]`).focus()}
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();slots[i]=null;render();document.querySelector(`[data-slot="${i}"]`).focus()}
})
app.addEventListener('pointerdown',e=>{
 const el=e.target.closest('[data-digit]');if(!el||el.disabled||e.button!==0)return
 suppressClick=false;drag={el,x:e.clientX,y:e.clientY,id:e.pointerId,digit:Number(el.dataset.digit),active:false}
 el.setPointerCapture(e.pointerId)
})
app.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return
 if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){
   drag.active=true
   const bounds=drag.el.getBoundingClientRect(), style=getComputedStyle(drag.el)
   drag.ghost=drag.el.cloneNode(true)
   drag.ghost.removeAttribute('id')
   drag.ghost.setAttribute('aria-hidden','true')
   drag.ghost.classList.add('ghost')
   drag.ghost.style.width=bounds.width+'px'
   drag.ghost.style.height=bounds.height+'px'
   drag.ghost.style.fontSize=style.fontSize
   drag.ghost.style.wordSpacing=style.wordSpacing
   document.body.append(drag.ghost)
 }
 if(!drag.active)return
 drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px'
 document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))
 document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]')?.classList.add('drop-target')
})
function finishDrag(e,cancel=false){
 if(!drag)return
 const current=drag;drag=null;current.ghost?.remove();document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'))
 if(!current.active)return
 suppressClick=true
 if(!cancel){const target=document.elementFromPoint(e.clientX,e.clientY)
 const slot=target?.closest('[data-slot]');if(slot)slots=placeDigit(slots,current.digit,Number(slot.dataset.slot),findQuestion(location.hash));else if(target?.closest('.bank'))slots=slots.map(d=>d===current.digit?null:d)
 selected=null;render()}
 setTimeout(()=>{suppressClick=false},0)
}
app.addEventListener('pointerup',e=>finishDrag(e));app.addEventListener('pointercancel',e=>finishDrag(e,true))
window.addEventListener('hashchange',render);render()
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'place_open_middle_digit',
      description: 'Place a digit in a zero-based space in Open Middle problem 34, 38, or 40.',
      inputSchema: {
        type: 'object',
        properties: {
          questionId: { type: 'integer', enum: [34, 38, 40] },
          digit: { type: 'integer', minimum: 0, maximum: 9 },
          space: { type: 'integer', minimum: 0, maximum: 7 }
        },
        required: ['digit', 'space'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false },
      execute({ questionId = 38, digit, space }) {
        const question = questions.find(item => item.id === questionId)
        if (!question) throw new Error('Unknown question.')
        const currentSlots = activeQuestionId === questionId ? slots : emptySlots(question)
        const next = placeDigit(currentSlots, digit, space, question)
        activeQuestionId = questionId
        slots = next
        location.hash = String(questionId)
        render()
        return { slots, state: equationState(slots, question) }
      }
    })).catch(() => {})
  } catch {}
}
