import {fitToWindow} from './fit-to-window.js'
import {mountDigitDrag} from './drag-assist.js'
import {evaluateNumeric,evaluateNumericPairs,isUnique,placeNumeric,subtractionDigits} from './numeric-catalog.js'
import {numberAt} from '@classroom-tools/open-middle-core'
import {baseTenBlocks} from '@classroom-tools/open-middle-core/blocks'
import {subtractionModel,subtractionVisual} from './subtraction-visual.js'

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function mountNumeric(container,q,{secondaryContainer,dragAssistEnabled=()=>false,nested=false,onChange=()=>{}}={}) {
 if(q.pairCount===2)return mountNumericPairs(container,q,{secondaryContainer,dragAssistEnabled})
 container.innerHTML='<div class="nm-view"></div><p class="nm-feedback" role="status" aria-live="polite" aria-atomic="true"></p>'
 const view=container.querySelector('.nm-view'),status=container.querySelector('.nm-feedback')
 const windowFit=nested?{fit(){},cleanup(){}}:fitToWindow(container)
 const storageKey=`open-middle-work-v1-${q.id}`
 let slots=Array(q.slotCount).fill(null),mode=q.modes?.[0][0],attempts=[],selected=null
 try {const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){
  if(Array.isArray(saved.slots)&&saved.slots.length===q.slotCount&&saved.slots.every(x=>x===null||q.digits.includes(x)))slots=saved.slots
  if(q.modes?.some(x=>x[0]===saved.mode))mode=saved.mode
  if(Array.isArray(saved.attempts))attempts=saved.attempts.filter(x=>Array.isArray(x.slots)&&x.slots.length===q.slotCount&&x.slots.every(v=>q.digits.includes(v))).slice(-20)
 }}catch{}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify({slots,mode,attempts}))}catch{}}
 const savedTitle=`nm-saved-title-${String(q.id).replace(/[^a-z0-9-]/gi,'-')}`
 const focus=selector=>container.querySelector(selector)?.focus()
 function token(t,result,values=slots,readOnly=false) {
  if(typeof t==='string')return `<span class="nm-symbol">${esc(t)}</span>`
  if(t.type==='label')return `<span class="nm-label">${esc(t.text)}</span>`
  if(t.type==='output'){
   const value=q.visual==='subtraction'&&!values.includes(null)?subtractionModel(subtractionDigits(q,values)).value:result.value
   return `<output class="nm-output" aria-label="Calculated result">${esc(value??'')}</output>`
  }
  if(t.type==='group')return `<span class="nm-group">${t.parts.map(v=>token(v,result,values,readOnly)).join('')}</span>`
  if(t.type==='fraction')return `<span class="nm-fraction"><span>${token(t.top,result,values,readOnly)}</span><span>${token(t.bottom,result,values,readOnly)}</span></span>`
  const digits=`<span class="nm-number ${t.indices.length>1?'nm-multi':''}">${t.indices.map(i=>readOnly?`<span class="nm-history-digit">${values[i]}</span>`:`<button class="nm-slot ${values[i]!==null?'filled':''}" data-nslot="${i}" aria-label="Space ${i+1}: ${values[i]??'empty'}"><svg class="nm-slot-outline" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/></svg><span>${values[i]??''}</span></button>`).join('')}</span>`
  return q.baseTen&&!readOnly&&t.indices.length===2?`<div class="nm-amount">${digits}${baseTenBlocks(numberAt(t.indices.map(i=>values[i]),0))}</div>`:digits
 }
 function visuals(){
  if(!q.visual)return ''
  if(q.visual==='subtraction')return subtractionVisual(slots.every(v=>v===null)?Array(6).fill(null):subtractionDigits(q,slots))
  if(q.visual==='decimal-line'){
   const values=[slots.slice(0,4),slots.slice(4,6),slots.slice(6,10)]
   const labels=values.map((a,i)=>a.includes(null)?['Left tick','Middle tick','Right tick'][i]:i===0?`${a[0]}.${a.slice(1).join('')}`:i===1?`10.${a.join('')}`:`${a.slice(0,2).join('')}.${a.slice(2).join('')}`)
   return `<figure class="nm-decimal-line"><svg viewBox="0 0 700 110" role="img" aria-label="Number line: ${labels.map(esc).join(', ')}. Not drawn to scale."><path d="M15 65H685M28 56L15 65 28 74M672 56L685 65 672 74" fill="none" stroke="currentColor" stroke-width="2"/>${[90,350,610].map((x,i)=>`<path d="M${x} 53V77" stroke="currentColor" stroke-width="2"/><text x="${x}" y="35" text-anchor="middle">${esc(labels[i])}</text>`).join('')}</svg><figcaption>Number line not drawn to scale.</figcaption></figure>`
  }
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
  view.innerHTML=`<section class="nm-task" data-question="${esc(q.id)}"><p class="nm-instruction">${q.modes?q.instruction.split('{mode}').map(esc).join(`<label class="nm-mode"><select data-nmode aria-label="Challenge">${q.modes.map(([value,label])=>`<option value="${value}" ${mode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`):esc(q.instruction)}</p>
  <div class="nm-bank" aria-label="Digit bank; drop a digit here to return it">${q.digits.map(d=>`<button data-nbank="${d}" class="nm-digit ${selected===d?'selected':''}" ${isUnique(q,mode)&&slots.includes(d)?'disabled':''} aria-label="Digit ${d}" aria-pressed="${selected===d}">${d}</button>`).join('')}</div>
  <div class="nm-board ${q.baseTen?'nm-base-ten':''} ${q.visual==='subtraction'?'nm-centered-subtraction':''} ${result.state==='incomplete'?'':positive?'equal':'unequal'}" data-state="${result.state}"><div class="nm-equations ${q.rule==='equal-sums'?'nm-chain':''}">${q.rows.map(row=>`<div class="nm-row">${row.map(t=>token(t,result)).join('')}</div>`).join('')}</div>${visuals()}</div>
  </section>`
  const message=result.state==='incomplete'?'':result.message
  if(status.textContent!==message)status.textContent=message
  if(secondaryContainer)secondaryContainer.innerHTML=`<section class="nm-saved-work" aria-labelledby="${savedTitle}"><h3 id="${savedTitle}">Saved attempts</h3><p>Save an arrangement to compare later. Your current work is saved automatically.</p><button type="button" data-naction="save" ${slots.includes(null)?'disabled':''}>Save current arrangement</button><p class="nm-save-status" role="status"></p>${attempts.length?`<ol class="nm-attempts">${attempts.map(a=>{const r=evaluateNumeric(q,a.slots,a.mode);return `<li>${q.modes?`<p>${esc(q.modes.find(m=>m[0]===a.mode)?.[1]??'')}</p>`:''}<div class="nm-history-equation">${q.rows.map(row=>`<span>${row.map(t=>token(t,r,a.slots,true)).join('')}</span>`).join('')}</div><p>${esc(r.message)}</p></li>`}).join('')}</ol><button type="button" data-naction="clear-history">Clear saved attempts</button>`:'<p>No saved attempts yet.</p>'}</section>`
  windowFit.fit()
  if(restore)focus(restore)
  onChange([...slots])
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

function mountNumericPairs(container,q,{secondaryContainer,dragAssistEnabled}) {
 container.innerHTML=`<p class="nm-instruction">${esc(q.instruction)}</p><div class="nm-pairs">${['First pair','Second pair'].map((label,i)=>`<section class="nm-pair" aria-label="${label}"><h2>${label}</h2><div data-pair="${i}"></div></section>`).join('')}</div><p class="nm-feedback nm-pairs-feedback" role="status" aria-live="polite" aria-atomic="true"></p>`
 if(secondaryContainer)secondaryContainer.innerHTML='<section aria-label="First pair saved attempts"><h3>First pair</h3><div data-pair-history="0"></div></section><section aria-label="Second pair saved attempts"><h3>Second pair</h3><div data-pair-history="1"></div></section>'
 const states=Array.from({length:2},()=>Array(q.slotCount).fill(null))
 const status=container.querySelector('.nm-pairs-feedback')
 const windowFit=fitToWindow(container)
 const children=[0,1].map(i=>mountNumeric(container.querySelector(`[data-pair="${i}"]`),{...q,pairCount:undefined,id:`${q.id}-pair-${i+1}`,instruction:'Use each movable digit at most once. Complete the equation.'},{
  secondaryContainer:secondaryContainer?.querySelector(`[data-pair-history="${i}"]`),dragAssistEnabled,nested:true,
  onChange(values){states[i]=values;const result=evaluateNumericPairs(q,states);status.textContent=result.message;status.dataset.state=result.state;windowFit.fit()},
 }))
 const cleanup=()=>{children.forEach(child=>child());windowFit.cleanup()}
 cleanup.cancelDrag=()=>children.forEach(child=>child.cancelDrag())
 cleanup.reset=()=>children.forEach(child=>child.reset())
 return cleanup
}
