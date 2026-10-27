import {fitToWindow} from './fit-to-window.js'
import {mountDigitDrag} from './drag-assist.js'
import {evaluateNumeric,isUnique,placeNumeric} from './numeric-catalog.js'
import {numberAt} from '@classroom-tools/open-middle-core'
import {baseTenBlocks} from '@classroom-tools/open-middle-core/blocks'

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function mountNumeric(container,q,{secondaryContainer,dragAssistEnabled=()=>false}={}) {
 container.innerHTML='<div class="nm-view"></div><p class="nm-feedback" role="status" aria-live="polite" aria-atomic="true"></p>'
 const view=container.querySelector('.nm-view'),status=container.querySelector('.nm-feedback')
 const windowFit=fitToWindow(container)
 const storageKey=`open-middle-work-v1-${q.id}`
 let slots=Array(q.slotCount).fill(null),mode=q.modes?.[0][0],attempts=[],selected=null
 try {const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){
  if(Array.isArray(saved.slots)&&saved.slots.length===q.slotCount&&saved.slots.every(x=>x===null||q.digits.includes(x)))slots=saved.slots
  if(q.modes?.some(x=>x[0]===saved.mode))mode=saved.mode
  if(Array.isArray(saved.attempts))attempts=saved.attempts.filter(x=>Array.isArray(x.slots)&&x.slots.length===q.slotCount&&x.slots.every(v=>q.digits.includes(v))).slice(-20)
 }}catch{}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify({slots,mode,attempts}))}catch{}}
 const focus=selector=>container.querySelector(selector)?.focus()
 function token(t,result,values=slots,readOnly=false) {
  if(typeof t==='string')return `<span class="nm-symbol">${esc(t)}</span>`
  if(t.type==='label')return `<span class="nm-label">${esc(t.text)}</span>`
  if(t.type==='output')return `<output class="nm-output" aria-label="Calculated result">${esc(result.value??'')}</output>`
  if(t.type==='group')return `<span class="nm-group">${t.parts.map(v=>token(v,result,values,readOnly)).join('')}</span>`
  if(t.type==='fraction')return `<span class="nm-fraction"><span>${token(t.top,result,values,readOnly)}</span><span>${token(t.bottom,result,values,readOnly)}</span></span>`
  const digits=`<span class="nm-number ${t.indices.length>1?'nm-multi':''}">${t.indices.map(i=>readOnly?`<span class="nm-history-digit">${values[i]}</span>`:`<button class="nm-slot ${values[i]!==null?'filled':''}" data-nslot="${i}" aria-label="Space ${i+1}: ${values[i]??'empty'}"><svg class="nm-slot-outline" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/></svg><span>${values[i]??''}</span></button>`).join('')}</span>`
  return q.baseTen&&!readOnly&&t.indices.length===2?`<div class="nm-amount">${digits}${baseTenBlocks(numberAt(t.indices.map(i=>values[i]),0))}</div>`:digits
 }
 function visuals(){
  if(!q.visual)return ''
  if(q.visual==='marbles'){
   const red=slots[0],blue=slots[1],redB=slots[2],green=slots[3]===null||slots[4]===null?null:slots[3]*10+slots[4]
   return `<div class="nm-bags">${[[red,blue,'A','blue'],[redB,green,'B','green']].map(([r,c,name,color])=>`<div class="nm-bag"><strong>Bag ${name}</strong><div class="nm-marbles" role="img" aria-label="${r??'Unknown'} red and ${c??'unknown'} ${color} marbles">${r===null||c===null?'<span>Fill the spaces to see the marbles.</span>':Array.from({length:r+c},(_,i)=>`<i class="${i<r?'red':color}"></i>`).join('')}</div></div>`).join('')}</div>`
  }
  const sets=q.visual==='rectangle'?[[slots[0]===null||slots[1]===null?null:slots[0]*10+slots[1],slots[2],'Rectangle']]:[[slots[0],slots[1],'Smaller'],[slots[2],slots[3],'Larger']]
  const scale=Math.max(10,...sets.flatMap(([w,h])=>[w??0,h??0]))
  return `<div class="nm-shapes">${sets.map(([w,h,label])=>`<figure><svg viewBox="0 0 360 270" role="img" aria-label="${label}: ${w??'unknown'} by ${h??'unknown'}"><rect x="45" y="35" width="${w===null?220:w/scale*190}" height="${h===null?150:h/scale*190}" fill="#eee" stroke="#111" stroke-width="2"/><text x="180" y="250" text-anchor="middle">${w??'?'} × ${h??'?'}</text></svg><figcaption>${label} · dimensions drawn to a common scale</figcaption></figure>`).join('')}</div>`
 }
 function render(restore){
  const result=evaluateNumeric(q,slots,mode)
  const positive=result.state==='success'||(q.encourageAttempts&&result.state==='progress')
  view.innerHTML=`<section class="nm-task"><p class="nm-instruction">${esc(q.instruction)}</p>${q.modes?`<label class="nm-mode">Challenge <select data-nmode>${q.modes.map(([value,label])=>`<option value="${value}" ${mode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`:''}
  <div class="nm-bank" aria-label="Digit bank; drop a digit here to return it">${q.digits.map(d=>`<button data-nbank="${d}" class="nm-digit ${selected===d?'selected':''}" ${isUnique(q,mode)&&slots.includes(d)?'disabled':''} aria-label="Digit ${d}" aria-pressed="${selected===d}">${d}</button>`).join('')}</div>
  <div class="nm-board ${q.baseTen?'nm-base-ten':''} ${result.state==='incomplete'?'':positive?'equal':'unequal'}" data-state="${result.state}"><div class="nm-equations ${q.rule==='equal-sums'?'nm-chain':''}">${q.rows.map(row=>`<div class="nm-row">${row.map(t=>token(t,result)).join('')}</div>`).join('')}</div>${visuals()}</div>
  </section>`
  const message=result.state==='incomplete'?'':result.message
  if(status.textContent!==message)status.textContent=message
  if(secondaryContainer)secondaryContainer.innerHTML=`<section class="nm-saved-work" aria-labelledby="nm-saved-title"><h3 id="nm-saved-title">Saved attempts</h3><p>Save an arrangement to compare later. Your current work is saved automatically.</p><button type="button" data-naction="save" ${slots.includes(null)?'disabled':''}>Save current arrangement</button><p class="nm-save-status" role="status"></p>${attempts.length?`<ol class="nm-attempts">${attempts.map(a=>{const r=evaluateNumeric(q,a.slots,a.mode);return `<li>${q.modes?`<p>${esc(q.modes.find(m=>m[0]===a.mode)?.[1]??'')}</p>`:''}<div class="nm-history-equation">${q.rows.map(row=>`<span>${row.map(t=>token(t,r,a.slots,true)).join('')}</span>`).join('')}</div><p>${esc(r.message)}</p></li>`}).join('')}</ol><button type="button" data-naction="clear-history">Clear saved attempts</button>`:'<p>No saved attempts yet.</p>'}</section>`
  windowFit.fit()
  if(restore)focus(restore)
 }
 function changed(restore){save();render(restore)}
 function reset(){digitDrag.cancel();slots=Array(q.slotCount).fill(null);selected=null;changed('[data-nslot="0"]')}
 const click=e=>{
  const bank=e.target.closest('[data-nbank]'),target=e.target.closest('[data-nslot]'),action=e.target.closest('[data-naction]')
  if(bank&&!bank.disabled){const d=Number(bank.dataset.nbank);selected=selected===d?null:d;render(`[data-nbank="${d}"]`)}
  if(target){const i=Number(target.dataset.nslot);if(selected!==null){slots=placeNumeric(slots,selected,i,q,mode);selected=null}else slots[i]=null;changed(`[data-nslot="${i}"]`)}
  if(action){
   const name=action.dataset.naction
   if(name==='save'){if(!slots.includes(null)){const duplicate=attempts.some(a=>a.mode===mode&&a.slots.join(',')===slots.join(','));if(!duplicate)attempts.push({slots:[...slots],mode});attempts=attempts.slice(-20);save();render();secondaryContainer?.querySelector('[data-naction="save"]')?.focus();const status=secondaryContainer?.querySelector('.nm-save-status');if(status)status.textContent=duplicate?'This arrangement is already saved.':'Arrangement saved.'}}
   if(name==='clear-history'){attempts=[];save();render();secondaryContainer?.querySelector('[data-naction="save"]')?.focus()}
  }
 }
 const key=e=>{const el=e.target.closest('[data-nslot]');if(!el)return;const i=Number(el.dataset.nslot)
  if(/^\d$/.test(e.key)&&q.digits.includes(Number(e.key))){e.preventDefault();slots=placeNumeric(slots,Number(e.key),i,q,mode);selected=null;changed(`[data-nslot="${Math.min(q.slotCount-1,i+1)}"]`)}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();slots[i]=null;changed(`[data-nslot="${i}"]`)}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();focus(`[data-nslot="${Math.max(0,Math.min(q.slotCount-1,i+(e.key==='ArrowRight'?1:-1)))}"]`)}
 }
 const change=e=>{if(e.target.matches('[data-nmode]')){mode=e.target.value;if(isUnique(q,mode)){const seen=new Set();slots=slots.map(d=>{if(d!==null&&seen.has(d))return null;seen.add(d);return d})}selected=null;changed('[data-nmode]')}}
 const digitDrag=mountDigitDrag(container,{
  sourceSelector:'[data-nslot],[data-nbank]',targetSelector:'[data-nslot],.nm-bank',enabled:dragAssistEnabled,
  readSource(element){
   const source=element.hasAttribute('data-nslot')?Number(element.dataset.nslot):null
   const digit=source===null?Number(element.dataset.nbank):slots[source]
   return digit===null?null:{digit,source}
  },
  readTarget:element=>({element,index:element.hasAttribute('data-nslot')?Number(element.dataset.nslot):null}),
  commit(d,target){
   if(target.index!==null){
    if(!isUnique(q,mode)&&d.source!==null)slots[d.source]=null
    slots=placeNumeric(slots,d.digit,target.index,q,mode);selected=null;changed(`[data-nslot="${target.index}"]`)
   }else if(d.source!==null){slots[d.source]=null;selected=null;changed()}
  },
 })
 const handlers=[['click',click],['keydown',key],['change',change]]
 for(const [name,fn] of handlers)container.addEventListener(name,fn)
 secondaryContainer?.addEventListener('click',click)
 render()
 const cleanup=()=>{digitDrag.destroy();windowFit.cleanup();secondaryContainer?.removeEventListener('click',click);for(const [name,fn] of handlers)container.removeEventListener(name,fn)}
 cleanup.cancelDrag=digitDrag.cancel
 cleanup.reset=reset
 return cleanup
}
