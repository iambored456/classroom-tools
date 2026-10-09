import {evaluateNumeric,isUnique,placeNumeric} from './numeric-catalog.js'

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function mountNumeric(container,q) {
 const storageKey=`open-middle-work-v1-${q.id}`
 let slots=Array(q.slotCount).fill(null),mode=q.modes?.[0][0],attempts=[],selected=null,checked=false,drag=null,ignoreClick=false
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
  if(t.type==='output')return `<output class="nm-output" aria-label="Calculated result">${esc(result.value??'?')}</output>`
  if(t.type==='group')return `<span class="nm-group">${t.parts.map(v=>token(v,result,values,readOnly)).join('')}</span>`
  if(t.type==='fraction')return `<span class="nm-fraction"><span>${token(t.top,result,values,readOnly)}</span><span>${token(t.bottom,result,values,readOnly)}</span></span>`
  return `<span class="nm-number">${t.indices.map(i=>readOnly?`<span class="nm-history-digit">${values[i]}</span>`:`<button class="nm-slot ${values[i]!==null?'filled':''}" data-nslot="${i}" aria-label="Space ${i+1}: ${values[i]??'empty'}">${values[i]??''}</button>`).join('')}</span>`
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
  container.innerHTML=`<section class="nm-task"><p class="nm-instruction">${esc(q.instruction)}</p>${q.modes?`<label class="nm-mode">Challenge <select data-nmode>${q.modes.map(([value,label])=>`<option value="${value}" ${mode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`:''}
  <div class="nm-bank" aria-label="Digit bank; drop a digit here to return it">${q.digits.map(d=>`<button data-nbank="${d}" class="nm-digit ${selected===d?'selected':''}" ${isUnique(q,mode)&&slots.includes(d)?'disabled':''} aria-label="Digit ${d}" aria-pressed="${selected===d}">${d}</button>`).join('')}</div>
  <p class="nm-guidance">Drag a digit, or select a digit and a space. You can also type in a space. Click a filled space to clear it.</p>
  <div class="nm-equations ${q.rule==='equal-sums'?'nm-chain':''}">${q.rows.map(row=>`<div class="nm-row">${row.map(t=>token(t,result)).join('')}</div>`).join('')}</div>${visuals()}
  <div class="nm-actions"><button data-naction="check">Check</button><button data-naction="save" ${slots.includes(null)?'disabled':''}>Save attempt</button><button data-naction="reset">Clear spaces</button></div>
  <p class="nm-feedback ${checked?result.state:''}" role="status">${checked?esc(result.message):'Explore different arrangements, then check your work.'}</p>
  ${attempts.length?`<details class="nm-attempts"><summary>Saved attempts (${attempts.length})</summary><ol>${attempts.map(a=>{const r=evaluateNumeric(q,a.slots,a.mode);return `<li>${q.modes?`<p>${esc(q.modes.find(m=>m[0]===a.mode)?.[1]??'')}</p>`:''}<div class="nm-history-equation">${q.rows.map(row=>`<span>${row.map(t=>token(t,r,a.slots,true)).join('')}</span>`).join('')}</div><p>${esc(r.message)}</p></li>`}).join('')}</ol><button data-naction="clear-history">Clear saved attempts</button></details>`:''}</section>`
  if(restore)focus(restore)
 }
 function changed(restore){checked=false;save();render(restore)}
 const click=e=>{
  if(ignoreClick)return
  const bank=e.target.closest('[data-nbank]'),target=e.target.closest('[data-nslot]'),action=e.target.closest('[data-naction]')
  if(bank&&!bank.disabled){const d=Number(bank.dataset.nbank);selected=selected===d?null:d;render(`[data-nbank="${d}"]`)}
  if(target){const i=Number(target.dataset.nslot);if(selected!==null){slots=placeNumeric(slots,selected,i,q,mode);selected=null}else slots[i]=null;changed(`[data-nslot="${i}"]`)}
  if(action){
   const name=action.dataset.naction
   if(name==='check'){checked=true;render('[data-naction="check"]')}
   if(name==='reset'){slots=Array(q.slotCount).fill(null);selected=null;changed('[data-nslot="0"]')}
   if(name==='save'){if(!slots.includes(null)){if(!attempts.some(a=>a.mode===mode&&a.slots.join(',')===slots.join(',')))attempts.push({slots:[...slots],mode});attempts=attempts.slice(-20);checked=true;save();render('[data-naction="save"]')}}
   if(name==='clear-history'){attempts=[];save();render()}
  }
 }
 const key=e=>{const el=e.target.closest('[data-nslot]');if(!el)return;const i=Number(el.dataset.nslot)
  if(/^\d$/.test(e.key)&&q.digits.includes(Number(e.key))){e.preventDefault();slots=placeNumeric(slots,Number(e.key),i,q,mode);selected=null;changed(`[data-nslot="${Math.min(q.slotCount-1,i+1)}"]`)}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();slots[i]=null;changed(`[data-nslot="${i}"]`)}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();focus(`[data-nslot="${Math.max(0,Math.min(q.slotCount-1,i+(e.key==='ArrowRight'?1:-1)))}"]`)}
 }
 const change=e=>{if(e.target.matches('[data-nmode]')){mode=e.target.value;if(isUnique(q,mode)){const seen=new Set();slots=slots.map(d=>{if(d!==null&&seen.has(d))return null;seen.add(d);return d})}selected=null;changed('[data-nmode]')}}
 const down=e=>{const el=e.target.closest('[data-nslot],[data-nbank]');if(!el||el.disabled||e.button!==0)return;const source=el.hasAttribute('data-nslot')?Number(el.dataset.nslot):null,digit=source===null?Number(el.dataset.nbank):slots[source];if(digit===null)return;drag={el,source,digit,id:e.pointerId,x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId)}
 const move=e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){drag.ghost=document.createElement('span');drag.ghost.className='nm-ghost';drag.ghost.textContent=drag.digit;drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost)}if(drag.ghost){drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px'}}
 const finish=(e,cancel=false)=>{if(!drag)return;const d=drag;drag=null;if(!d.ghost)return;d.ghost.remove();ignoreClick=true;setTimeout(()=>ignoreClick=false,0);if(cancel)return;const el=document.elementFromPoint(e.clientX,e.clientY),slotEl=el?.closest('[data-nslot]');if(slotEl&&container.contains(slotEl)){const index=Number(slotEl.dataset.nslot);if(!isUnique(q,mode)&&d.source!==null)slots[d.source]=null;slots=placeNumeric(slots,d.digit,index,q,mode);selected=null;changed(`[data-nslot="${index}"]`)}else if(el?.closest('.nm-bank')&&d.source!==null){slots[d.source]=null;changed()}}
 const up=e=>finish(e),cancel=e=>finish(e,true)
 for(const [name,fn] of [['click',click],['keydown',key],['change',change],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]])container.addEventListener(name,fn)
 render()
 return ()=>{drag?.ghost?.remove();for(const [name,fn] of [['click',click],['keydown',key],['change',change],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]])container.removeEventListener(name,fn)}
}
