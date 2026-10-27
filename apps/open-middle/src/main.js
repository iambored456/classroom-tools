import './style.css'
import './targets.css'
import './sum-square.css'
import './numeric.css'
import './explorations.css'
import './manipulatives.css'
import './fraction-line.css'
import './collection.css'
import './theme.css'
import './question-previews.css'
import {mountQuestionPreviews} from './question-previews.js'
import {mountQrShare} from './qr-share.js'
import './qr-share.css'
import './drag-assist.css'
import {mountDigitDrag} from './drag-assist.js'
import {emptySlots, placeDigit, numberAt, equationState, numberWords, sideSum} from '@classroom-tools/open-middle-core'
import {baseTenBlocks as blocks} from '@classroom-tools/open-middle-core/blocks'
import {findQuestion, questions, questionLabel} from './questions/index.js'
import {renderSumSquare} from './sum-square.js'
import {fitToWindow} from './fit-to-window.js'
import {mountNumeric} from './numeric-view.js'
import {mountExploration} from './explorations.js'
import {mountManipulative} from './manipulatives.js'
const app = document.querySelector('#app')
let slots = emptySlots(), selected = null
let digitDrag = null
let dragAssistEnabled = false
try { dragAssistEnabled = localStorage.getItem('open-middle-drag-assist') === 'true' } catch {}
const supportsDragAssist = problem => problem && (!customQuestion(problem) || problem.layout === 'digit-task' || ['495','59'].includes(String(problem.id)))
function bindDragAssist(problem) {
 if (!supportsDragAssist(problem)) return
 const label = document.createElement('label')
 label.className = 'drag-assist-setting'
 label.innerHTML = `<input id="drag-assist" type="checkbox" ${dragAssistEnabled?'checked':''} aria-describedby="drag-assist-description"><span>Drag Assist<small id="drag-assist-description">Keep dragging through brief breaks in contact.</small></span>`
 document.querySelector('#spacing').closest('label').after(label)
 label.querySelector('input').onchange = event => {
  digitDrag?.cancel(); cleanupCustom?.cancelDrag?.()
  dragAssistEnabled = event.target.checked
  try { localStorage.setItem('open-middle-drag-assist', String(dragAssistEnabled)) } catch {}
 }
 document.querySelector('.help-copy').append(' With Drag Assist on in Settings, briefly lift and touch near the number to keep dragging. You can also tap a digit, then tap a space.')
}
let showSums = [false, false]
let activeQuestionId = null
let cleanupCustom = null
let windowFit = null
let landingPreviews = null
const customQuestion = problem => problem && (problem.layout === 'digit-task' || problem.layout === 'exploration' || problem.kind === 'manipulative')
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let doubleSpace = false
try { doubleSpace = localStorage.getItem('open-middle-double-space') === 'true' } catch {}
const icons = {fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',exitFullscreen:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3"/><path d="M12 17h.01"/>',home:'<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3z"/>',refresh:'<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6"/>',settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 1 2 4h4l1-3 3-1 3-3-2-2 1-4-3-1-2-4z"/><circle cx="11.5" cy="12" r="3"/>'}
const icon = (name,label) => `<button class="icon" id="${name}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg></button>`
const fullscreenControl = () => icon(document.fullscreenElement ? 'exitFullscreen' : 'fullscreen', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen').replace(/id="[^"]+"/, 'id="fullscreen"')
function bindFullscreen() {
 const button = document.querySelector('#fullscreen')
 button.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)))
 button.onclick = async () => {
  try {
   if (document.fullscreenElement) await document.exitFullscreen()
   else await document.documentElement.requestFullscreen()
  } catch {
   button.title = 'Fullscreen is unavailable in this browser'
  }
 }
}
document.addEventListener('fullscreenchange', () => {
 const button = document.querySelector('#fullscreen')
 if (!button) return
 button.outerHTML = fullscreenControl()
 bindFullscreen()
})
// Last question number in Kindergarten and Grades 1–7.
const gradeBoundaries = [13, 37, 50, 88, 156, 241, 326, 396]
const questionOrder = question => Number.parseInt(question.displayId ?? question.id, 10)
const questionNumber = question => `<span class="question-number">${escapeHtml(questionLabel(question).split(' - ')[0])}</span>`
const homeControls = question => `<nav class="home-controls" aria-label="Question navigation">${icon('home','Home')}${questionNumber(question)}</nav>`
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
 digitDrag?.destroy(); digitDrag=null
 windowFit?.cleanup(); windowFit=null
 landingPreviews?.cleanup(); landingPreviews=null
 const problem = findQuestion(location.hash)
 cleanupCustom?.(); cleanupCustom=null
 if ((problem?.id ?? null) !== activeQuestionId) {
   window.scrollTo({top:0,left:0})
   slots = emptySlots(problem); selected = null; showSums = [false, false]
   activeQuestionId = problem?.id ?? null
 }
 if (problem?.showSideSums) for (const side of [0,1]) if (sideSum(slots,side,problem) === null) showSums[side] = false
 app.className = [doubleSpace ? 'double-space' : '', customQuestion(problem)?`custom-question ${problem.layout==='digit-task'?'numeric-question':''}`:''].join(' ')
 document.title = problem ? `${questionLabel(problem)} · Open Middle` : 'Open Middle · Classroom Tools'
 if (!problem) {
  app.innerHTML = `<main class="landing"><div class="landing-heading"><h1>Open Middle Math</h1>${landingHome}</div><p class="collection-count">${questions.length} activities</p><div class="problem-list">${questions.map((question,index)=>`${index>0 && gradeBoundaries.some(boundary=>questionOrder(questions[index-1])<=boundary && questionOrder(question)>boundary)?'<hr class="grade-divider" aria-label="Grade boundary">':''}<a class="problem-link" href="#${question.id}">🚩${escapeHtml(questionLabel(question))}</a>`).join('')}</div></main>`
  mountQrShare(document.querySelector('.landing-heading'))
  landingPreviews=mountQuestionPreviews(document.querySelector('.problem-list'))
  return
 }
 if(customQuestion(problem)){
  const numeric=problem.layout==='digit-task'
  const feedbackCopy=problem.encourageAttempts?'Every complete arrangement turns green. Use the sum and distance from 100 to find ways to improve.':'Once every space is filled, green means the goal is met; red means keep exploring.'
  const helpCopy=numeric?`Drag a digit, or select a digit and then a space. Select a filled space to return its digit. You can also type digits and use the arrow keys, Backspace, or Delete. ${feedbackCopy} Calculated answers update automatically. Use the corner arrow to reset and Settings to save or compare arrangements.`:'Follow the question’s directions and explore different answers. Use the controls beside the activity to check or reset your work. Digit spaces support dragging, selecting, and typing. Work is saved in this browser as you go.'
  app.innerHTML=`${homeControls(problem)}<nav class="corner-tools" aria-label="Problem controls">${numeric?icon('refresh','Reset problem'):''}${icon('help','Help')}<div class="settings-controls">${fullscreenControl()}${icon('settings','Settings')}</div></nav><main class="workspace collection-workspace ${numeric?'':'fitted-question'}" aria-label="${escapeHtml(questionLabel(problem))}">${numeric?'':`<div class="window-fit-content"><h1 class="question-title">${escapeHtml(questionLabel(problem))}</h1>`}<div id="interactive-question"></div>${numeric?'':'</div>'}</main><dialog id="help-dialog" aria-labelledby="help-title"><form method="dialog"><div class="dialog-heading"><h2 id="help-title">How to play</h2><button aria-label="Close help" class="close">×</button></div><p class="help-copy">${helpCopy}</p></form></dialog><dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog"><div class="dialog-heading"><h2 id="settings-title">Settings</h2><button aria-label="Close settings" class="close">×</button></div><label><input id="spacing" type="checkbox" ${doubleSpace?'checked':''}> Double-space between words</label>${numeric?'<div id="numeric-secondary"></div>':''}</form></dialog>`
  bindFullscreen()
  document.querySelector('#home').onclick=()=>{location.hash=''}
  document.querySelector('#help').onclick=()=>document.querySelector('#help-dialog').showModal()
  document.querySelector('#settings').onclick=()=>document.querySelector('#settings-dialog').showModal()
  document.querySelector('#spacing').onchange=e=>{doubleSpace=e.target.checked;app.classList.toggle('double-space',doubleSpace);try{localStorage.setItem('open-middle-double-space',String(doubleSpace))}catch{}}
  const target=document.querySelector('#interactive-question')
  cleanupCustom=problem.layout==='digit-task'?mountNumeric(target,problem,{secondaryContainer:document.querySelector('#numeric-secondary'),dragAssistEnabled:()=>dragAssistEnabled}):problem.layout==='exploration'?mountExploration(target,problem):mountManipulative(target,problem,{dragAssistEnabled:()=>dragAssistEnabled})
  bindDragAssist(problem)
  if(numeric)document.querySelector('#refresh').onclick=()=>cleanupCustom.reset()
  else windowFit=fitToWindow(document.querySelector('.window-fit-content'),{allowVerticalScroll:true})
  return
 }
 app.innerHTML = `${homeControls(problem)}<nav class="corner-tools" aria-label="Problem controls">${icon('refresh','Reset problem')}${icon('help','Help')}<div class="settings-controls">${fullscreenControl()}${icon('settings','Settings')}</div></nav><main class="workspace ${problem.layout==='sum-square'?'':'fitted-question equation-question'}">${problem.layout === 'sum-square' ? bank(problem) + renderSumSquare(slots,problem) : `<div class="window-fit-content">${twoDigitEquation(problem)}</div>`}</main><dialog id="help-dialog" aria-labelledby="help-title"><form method="dialog"><div class="dialog-heading"><h2 id="help-title">How to play</h2><button aria-label="Close help" class="close">&times;</button></div><p class="help-copy">Drag a digit, or select a digit and then a space. Select a placed digit to return it.${problem.layout === 'sum-square' ? ' Each gray square shows its side’s total when all three digits are placed.' : ''}</p></form></dialog><dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog"><div class="dialog-heading"><h2 id="settings-title">Settings</h2><button aria-label="Close settings" class="close">×</button></div><label><input id="spacing" type="checkbox" ${doubleSpace?'checked':''}> Double-space between words</label></form></dialog>`
 if(problem.layout!=='sum-square')windowFit=fitToWindow(document.querySelector('.window-fit-content'))
 bindFullscreen()
 document.querySelector('#home').onclick = () => {location.hash=''}
 document.querySelector('#refresh').onclick = () => { slots=emptySlots(problem);selected=null;showSums=[false,false];render() }
 document.querySelector('#help').onclick = () => document.querySelector('#help-dialog').showModal()
 document.querySelector('#settings').onclick = () => document.querySelector('#settings-dialog').showModal()
 document.querySelector('#spacing').onchange = e => {doubleSpace=e.target.checked;app.classList.toggle('double-space',doubleSpace);try{localStorage.setItem('open-middle-double-space',String(doubleSpace))}catch{}}
 bindDragAssist(problem)
 digitDrag=mountDigitDrag(document.querySelector('.workspace'),{
  sourceSelector:'[data-digit]', targetSelector:'[data-slot],.bank', enabled:()=>dragAssistEnabled,
  readSource:element=>({digit:Number(element.dataset.digit)}),
  readTarget:element=>({element, index:element.hasAttribute('data-slot')?Number(element.dataset.slot):null}),
  commit(source,target){
   if(target.index!==null)slots=placeDigit(slots,source.digit,target.index,problem)
   else slots=slots.map(d=>d===source.digit?null:d)
   selected=null;render()
   if(target.index!==null)document.querySelector(`[data-slot="${target.index}"]`)?.focus()
  },
 })
}
function sumPanel(side, problem) {
 const sum = sideSum(slots,side,problem)
 if (sum === null) return ''
 const label = side === 0 ? 'left' : 'right', expanded = showSums[side]
 return `<div class="side-total" data-side="${side}"><button class="scale-toggle" data-toggle-sum="${side}" aria-label="${expanded?'Hide':'Show'} ${label} side sum" aria-expanded="${expanded}" aria-controls="sum-${side}" title="${expanded?'Hide':'Show'} ${label} side sum"><svg viewBox="0 0 40 44" aria-hidden="true"><circle cx="20" cy="4" r="2.5" fill="currentColor"/><path d="M20 6 3 36H37Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M3 36Q20 46 37 36Z" fill="currentColor"/></svg></button><div id="sum-${side}" class="sum-visual" ${expanded?'':'hidden'}><svg class="sum-arrows" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="sum-arrow-${side}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="m1 1 7 4-7 4"/></marker></defs><path d="M140 0 178 52" marker-end="url(#sum-arrow-${side})"/><path d="M260 0 222 52" marker-end="url(#sum-arrow-${side})"/></svg><div class="sum-words" aria-live="polite">${numberWords(sum)}</div>${blocks(sum)}</div></div>`
}
app.addEventListener('click',e=>{
 if(customQuestion(findQuestion(location.hash)))return
 const sumToggle=e.target.closest('[data-toggle-sum]')
 if(sumToggle){const side=Number(sumToggle.dataset.toggleSum);showSums[side]=!showSums[side];render();document.querySelector(`[data-toggle-sum="${side}"]`).focus();return}
 const slot=e.target.closest('[data-slot]'), digit=e.target.closest('[data-digit]')
 if(slot){const index=Number(slot.dataset.slot);if(selected!==null){slots=placeDigit(slots,selected,index,findQuestion(location.hash));selected=null}else if(slots[index]!==null){slots[index]=null}render();document.querySelector(`[data-slot="${index}"]`).focus()}
 else if(digit&&!digit.disabled){selected=selected===Number(digit.dataset.digit)?null:Number(digit.dataset.digit);render();document.querySelector(`.bank [data-digit="${digit.dataset.digit}"]`).focus()}
})
app.addEventListener('keydown',e=>{
 if(customQuestion(findQuestion(location.hash)))return
 const slot=e.target.closest('[data-slot]');if(!slot)return
 const i=Number(slot.dataset.slot)
 if(/^\d$/.test(e.key) && findQuestion(location.hash)?.digits.includes(Number(e.key))){e.preventDefault();slots=placeDigit(slots,Number(e.key),i,findQuestion(location.hash));render();document.querySelector(`[data-slot="${Math.min(slots.length-1,i+1)}"]`).focus()}
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();slots[i]=null;render();document.querySelector(`[data-slot="${i}"]`).focus()}
})
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
