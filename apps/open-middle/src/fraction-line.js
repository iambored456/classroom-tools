import {mountDigitDrag} from './drag-assist.js'
import {DENOMINATORS,placeNumerator,evaluateFractionLine,linePosition,moveLinePosition} from './fraction-line-model.js'

const initial=()=>({digits:Array(5).fill(null),positions:Array(5).fill(null),max:3,parts:1,snap:false})
const mini=(n,d)=>`<span class="fl-small-fraction" aria-hidden="true"><span>${n}</span><span>${d}</span></span>`

export function mountFractionLine(container,q,{dragAssistEnabled=()=>false}={}){
 let state=initial(),selectedDigit=null,selectedFraction=null,cursor=0,result=null,message=''
 const key='open-middle:fractions-on-a-line:v1:59'
 try{
  const saved=JSON.parse(localStorage.getItem(key)),seen=new Set()
  if(saved&&saved.digits?.length===5&&saved.positions?.length===5){
   state.digits=saved.digits.map(n=>Number.isInteger(n)&&n>=0&&n<=5&&!seen.has(n)?(seen.add(n),n):null)
   state.max=[1,2,3].includes(saved.max)?saved.max:3
   state.parts=[1,2,3,4,6,8,24].includes(saved.parts)?saved.parts:1
   state.snap=saved.snap===true
   state.positions=saved.positions.map((p,i)=>state.digits[i]!==null&&Number.isFinite(p)&&p>=0&&p<=state.max?p:null)
  }
 }catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
 const name=i=>`${state.digits[i]}/${DENOMINATORS[i]}`
 const focus=selector=>container.querySelector(selector)?.focus({preventScroll:true})
 const clearFeedback=()=>{result=null;message=''}
 let observer
 const help=container.ownerDocument.querySelector('.help-copy')
 if(help){
  help.textContent='Use each digit 0–5 at most once in the five numerator spaces. Drag a completed fraction by its denominator or “Place on line” button onto the number line. Drag its label to move it. You can also tap a fraction, then tap the line. Equal fractions can share a point. Choose partitions and Snap to ticks for exact placement. Type digits in numerator spaces; Delete clears a space. On the line or a placed fraction, arrow keys move by 1/24 (or one tick with snapping), Home/End move to the endpoints, and Enter places the selected fraction. Delete removes a placed fraction. Check your line when you’re ready. Your work is saved in this browser. '
  const source=document.createElement('a');source.href=q.sourceUrl;source.target='_blank';source.rel='noreferrer';source.textContent='Original Open Middle problem';help.append(source)
 }
 function setDigit(index,digit){
  const next=digit===null?state.digits.map((n,i)=>i===index?null:n):placeNumerator(state.digits,digit,index)
  state.positions=state.positions.map((p,i)=>next[i]===state.digits[i]?p:null)
  state.digits=next;selectedDigit=null;selectedFraction=null;clearFeedback();save();render(`[data-fl-slot="${index}"]`)
 }
 function selectFraction(index){
  if(state.digits[index]===null)return
  selectedDigit=null;selectedFraction=selectedFraction===index?null:index;cursor=state.positions[index]??0
  message=selectedFraction===null?'':`${name(index)} selected. Tap the line to place it, or use arrow keys and Enter.`
  render(selectedFraction===null?`[data-fl-place="${index}"]`:'.fl-line')
 }
 function place(index,position){
  state.positions[index]=position;selectedFraction=null;clearFeedback();save();render(`[data-fl-marker="${index}"]`)
 }
 function render(restore){
  const built=state.digits.filter(n=>n!==null).length,placed=state.positions.filter(p=>p!==null).length
  container.innerHTML=`<section class="mp-workspace fl-workspace">
   <p class="nm-instruction">${q.prompt}</p>
   <div class="nm-bank fl-bank" aria-label="Digit bank; drop here to return a digit or fraction">${[0,1,2,3,4,5].map(n=>`<button class="nm-digit ${selectedDigit===n?'selected':''}" data-fl-digit="${n}" aria-label="Digit ${n}" aria-pressed="${selectedDigit===n}" ${state.digits.includes(n)?'disabled':''}>${n}</button>`).join('')}</div>
   <div class="fl-builders" aria-label="Build five fractions">${DENOMINATORS.map((d,i)=>`<div class="fl-piece ${state.digits[i]===null?'':'fl-ready'} ${selectedFraction===i?'fl-selected':''}" data-fl-fraction="${i}"><span class="nm-fraction"><span><button class="nm-slot ${state.digits[i]===null?'':'filled'}" data-fl-slot="${i}" aria-label="Numerator for denominator ${d}: ${state.digits[i]??'empty'}"><svg class="nm-slot-outline" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/></svg><span>${state.digits[i]??''}</span></button></span><span class="fl-denominator">${d}</span></span><button class="fl-place" data-fl-place="${i}" data-fl-fraction="${i}" ${state.digits[i]===null?'disabled':''} aria-label="${state.digits[i]===null?`Build fraction with denominator ${d}`:`Place fraction ${name(i)} on the line`}">${state.digits[i]===null?'Add a digit':state.positions[i]===null?'Place on line ↓':'Move on line ↔'}</button></div>`).join('')}</div>
   <div class="fl-options"><label>Line ends at <select data-fl-max aria-label="Number line maximum">${[1,2,3].map(n=>`<option ${state.max===n?'selected':''}>${n}</option>`).join('')}</select></label><label>Partitions <select data-fl-parts aria-label="Number line partitions">${[[1,'Whole numbers'],[2,'Halves'],[3,'Thirds'],[4,'Quarters'],[6,'Sixths'],[8,'Eighths'],[24,'Twenty-fourths']].map(([n,label])=>`<option value="${n}" ${state.parts===n?'selected':''}>${label}</option>`).join('')}</select></label><label><input type="checkbox" data-fl-snap ${state.snap?'checked':''}> Snap to ticks</label></div>
   <div class="fl-canvas ${result?.status==='success'?'equal':result?.status==='retry'?'unequal':''}"><div class="fl-line" tabindex="0" aria-label="Number line from 0 to ${state.max}${selectedFraction===null?'':`, ${name(selectedFraction)} selected; arrows move the cursor, Enter places it`}"><div class="fl-ticks"></div><div class="fl-axis" aria-hidden="true"></div><div class="fl-markers"></div>${placed===0&&selectedFraction===null?'<p class="fl-empty">Drag your completed fractions here.</p>':''}</div></div>
   <p class="fl-caption">${built} of 5 fractions built · ${placed} of 5 placed. Equal fractions can share a point.</p>
   <div class="mp-actions"><button data-fl-action="check">Check number line</button><button class="mp-secondary" data-fl-action="clear">Clear line</button><button class="mp-secondary" data-fl-action="reset">Reset</button></div>
   <p class="nm-feedback fl-feedback" role="status" aria-live="polite" aria-atomic="true">${message||result?.message||(selectedDigit!==null?`Digit ${selectedDigit} selected. Choose a numerator space.`:'')}</p>
  </section>`
  renderLine()
  observer?.disconnect();observer=new ResizeObserver(renderLine);observer.observe(container.querySelector('.fl-line'))
  if(restore)focus(restore)
 }
 function renderLine(){
  const line=container.querySelector('.fl-line');if(!line)return
  const width=line.clientWidth,axis=parseFloat(getComputedStyle(line).getPropertyValue('--fl-axis-y')),count=state.parts*state.max,compact=width/count<35
  line.querySelector('.fl-ticks').innerHTML=Array.from({length:count+1},(_,tick)=>{
   const whole=tick%state.parts===0,left=100*tick/count
   return `<i class="fl-tick ${whole?'fl-whole':''}" style="left:${left}%"></i>${whole||(!compact&&state.parts<=8)?`<span class="fl-tick-label ${whole?'':'fl-minor-label'}" style="left:${left}%">${whole?tick/state.parts:`${tick}/${state.parts}`}</span>`:''}`
  }).join('')
  const lanes=[],markerWidth=matchMedia('(max-width:650px)').matches?52:66
  line.querySelector('.fl-markers').innerHTML=state.positions.map((p,i)=>({p,i})).filter(({p})=>p!==null).sort((a,b)=>a.p-b.p||a.i-b.i).map(({p,i})=>{
   const x=p/state.max*width;let lane=lanes.findIndex(end=>x-end>markerWidth+10);if(lane<0)lane=lanes.length;lanes[lane]=x
   const top=axis-62-lane*48,correct=result?.correct?.[i]
   return `<div class="fl-point" style="left:${p/state.max*100}%"><span class="fl-stem" style="top:${top+44}px;height:${axis-top-44}px"></span><span class="fl-dot"></span><button class="fl-marker ${correct===true?'fl-correct':correct===false?'fl-revisit':''}" data-fl-marker="${i}" data-fl-fraction="${i}" style="top:${top}px" role="slider" aria-label="Fraction ${name(i)}${correct===true?', correctly placed':correct===false?', revisit this position':''}" aria-valuemin="0" aria-valuemax="${state.max}" aria-valuenow="${Number(p.toFixed(5))}" aria-valuetext="${Number(p.toFixed(3))}; arrow keys move, Delete removes" title="Drag to move; arrow keys adjust; Delete removes">${mini(state.digits[i],DENOMINATORS[i])}${correct===true?'<span class="fl-check" aria-hidden="true">✓</span>':''}</button></div>`
  }).join('')+(selectedFraction===null?'':`<div class="fl-cursor" style="left:${cursor/state.max*100}%" aria-hidden="true"></div>`)
 }
 const digitDrag=mountDigitDrag(container,{
  sourceSelector:'[data-fl-slot],[data-fl-digit],[data-fl-fraction]',targetSelector:'[data-fl-slot],.fl-bank,.fl-line,.fl-builders',enabled:dragAssistEnabled,
  readSource(element){
   if(element.hasAttribute('data-fl-digit'))return {kind:'digit',digit:Number(element.dataset.flDigit),index:null}
   if(element.hasAttribute('data-fl-slot')){const index=Number(element.dataset.flSlot);return state.digits[index]===null?null:{kind:'digit',digit:state.digits[index],index}}
   const index=Number(element.dataset.flFraction);return state.digits[index]===null?null:{kind:'fraction',digit:name(index),index}
  },
  readTarget(element,source,point){
   if(source.kind==='fraction'){
    if(element.matches('.fl-line'))return {element,kind:'line',position:linePosition(point.clientX,element.getBoundingClientRect(),state.max,state.parts,state.snap)}
    return {element,kind:'return'}
   }
   if(element.hasAttribute('data-fl-slot'))return {element,kind:'slot',index:Number(element.dataset.flSlot)}
   if(element.matches('.fl-bank'))return {element,kind:'return'}
   return null
  },
  renderGhost(source,ghost){if(source.kind==='fraction'){ghost.classList.add('fl-fraction-ghost');ghost.innerHTML=mini(state.digits[source.index],DENOMINATORS[source.index]);}},
  commit(source,target){
   if(source.kind==='fraction'){if(target.kind==='line')place(source.index,target.position);else{state.positions[source.index]=null;selectedFraction=null;clearFeedback();save();render();}}
   else if(target.kind==='slot')setDigit(target.index,source.digit)
   else if(source.index!==null)setDigit(source.index,null)
  },
 })
 const click=event=>{
  const digit=event.target.closest('[data-fl-digit]'),slot=event.target.closest('[data-fl-slot]'),piece=event.target.closest('[data-fl-place],[data-fl-marker]'),action=event.target.closest('[data-fl-action]')
  if(digit&&!digit.disabled){const n=Number(digit.dataset.flDigit);selectedDigit=selectedDigit===n?null:n;selectedFraction=null;message='';render(`[data-fl-digit="${n}"]`)}
  else if(slot){const index=Number(slot.dataset.flSlot);setDigit(index,selectedDigit)}
  else if(piece)selectFraction(Number(piece.dataset.flFraction))
  else if(action){
   digitDrag.cancel()
   if(action.dataset.flAction==='reset')reset()
   else if(action.dataset.flAction==='clear'){state.positions.fill(null);selectedFraction=null;clearFeedback();save();render()}
   else{result=evaluateFractionLine(state.digits,state.positions);message='';selectedFraction=null;render('[data-fl-action="check"]')}
  }else if(event.target.closest('.fl-line')&&selectedFraction!==null){const line=container.querySelector('.fl-line');place(selectedFraction,linePosition(event.clientX,line.getBoundingClientRect(),state.max,state.parts,state.snap))}
 }
 const onKey=event=>{
  const slot=event.target.closest('[data-fl-slot]'),marker=event.target.closest('[data-fl-marker]')
  if(event.key==='Escape'){selectedDigit=null;selectedFraction=null;message='';render();return}
  if(slot){const i=Number(slot.dataset.flSlot)
   if(/^[0-5]$/.test(event.key)){event.preventDefault();setDigit(i,Number(event.key));focus(`[data-fl-slot="${Math.min(4,i+1)}"]`)}
   else if(['Backspace','Delete'].includes(event.key)){event.preventDefault();setDigit(i,null)}
   else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();focus(`[data-fl-slot="${Math.max(0,Math.min(4,i+(event.key==='ArrowLeft'?-1:1)))}"]`)}
  }else if(marker){const i=Number(marker.dataset.flMarker)
   if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();place(i,moveLinePosition(state.positions[i],event.key,state.max,state.parts,state.snap))}
   else if(['Backspace','Delete'].includes(event.key)){event.preventDefault();state.positions[i]=null;clearFeedback();save();render(`[data-fl-place="${i}"]`)}
  }else if(event.target.matches('.fl-line')&&selectedFraction!==null){
   if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();cursor=moveLinePosition(cursor,event.key,state.max,state.parts,state.snap);renderLine()}
   else if(event.key==='Enter'||event.key===' '){event.preventDefault();place(selectedFraction,cursor)}
  }
 }
 const change=event=>{
  if(event.target.matches('[data-fl-max]')){const max=Number(event.target.value);if(state.positions.some(p=>p!==null&&p>max)){message='Clear or move points beyond that endpoint before shortening the line.';render();return}state.max=max;cursor=Math.min(cursor,max);save();render()}
  else if(event.target.matches('[data-fl-parts]')){state.parts=Number(event.target.value);save();renderLine()}
  else if(event.target.matches('[data-fl-snap]')){state.snap=event.target.checked;save()}
 }
 function reset(){digitDrag.cancel();state=initial();selectedDigit=null;selectedFraction=null;clearFeedback();save();render()}
 container.addEventListener('click',click);container.addEventListener('keydown',onKey);container.addEventListener('change',change)
 render()
 const cleanup=()=>{digitDrag.destroy();observer?.disconnect();container.removeEventListener('click',click);container.removeEventListener('keydown',onKey);container.removeEventListener('change',change)}
 cleanup.cancelDrag=digitDrag.cancel;cleanup.reset=reset
 return cleanup
}
