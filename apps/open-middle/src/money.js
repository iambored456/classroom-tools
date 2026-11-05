import {mountDigitDrag} from './drag-assist.js'
import {CANADIAN_COINS,MAX_COINS,clampPosition,evaluateMoney,formatMoney,restoreCoins} from './money-model.js'

// Original illustrations of the familiar Canadian reverse designs.
const motifs={
 maple:'<path d="m50 27 5 12 8-5-2 12 10 1-16 13 1 8-6-2-6 2 1-8-16-13 10-1-2-12 8 5z"/><path d="M50 58v16" fill="none" stroke="currentColor" stroke-width="2"/>',
 beaver:'<ellipse cx="48" cy="51" rx="18" ry="11"/><circle cx="62" cy="44" r="7"/><path d="m31 49-14 9 4 7 16-8M35 62h32" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="64" cy="43" r="1.5" fill="var(--coin-face)"/>',
 ship:'<path d="M22 60h54L64 69H34zM49 25v34M45 29 28 53h17zM54 32v21h18z"/><path d="M21 74q7-5 14 0t14 0 14 0 14 0" fill="none" stroke="currentColor" stroke-width="2"/>',
 caribou:'<path d="m44 68-3-18-7-5 1-9 10 6h10l10-6 1 9-7 5-3 18zM35 38 25 28l-1-9M27 30l-10-1M65 38l10-10 1-9M73 30l10-1" fill="none" stroke="currentColor" stroke-width="3"/><path d="m46 56 4 7 4-7z"/>',
 loon:'<path d="M22 60q12-18 35-6l5-17 8-4 7 4-7 4-3 19q-25 14-45 0z"/><path d="M22 71h55M30 76h39" fill="none" stroke="currentColor" stroke-width="2"/>',
 bear:'<path d="m23 58 4-13 9-8h23l8 6 9 1 4 7-9 5-7-1-2 15h-7l-2-12H41l-3 12h-7l1-14z"/><circle cx="65" cy="43" r="4"/>',
}
export function coinArt(value){
 const coin=CANADIAN_COINS.find(coin=>coin.value===value)
 return `<svg class="mc-art mc-${coin.tone}" viewBox="0 0 100 100" aria-hidden="true"><circle class="mc-rim" cx="50" cy="50" r="47"/><circle class="mc-face" cx="50" cy="50" r="41"/><text x="50" y="22" text-anchor="middle">CANADA</text><g class="mc-motif">${motifs[coin.motif]}</g><text class="mc-value" x="50" y="88" text-anchor="middle">${coin.label}</text></svg>`
}

export function mountMoney(container,question,{dragAssistEnabled=()=>false}={}){
 const storageKey=`open-middle-canadian-coins-v1-${question.id}`
 let coins=[],selected=null,notice=''
 try{coins=restoreCoins(question,JSON.parse(localStorage.getItem(storageKey)))}catch{}
 let nextId=Math.max(-1,...coins.map(coin=>coin.id))+1
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(coins))}catch{}}
 const focus=selector=>container.querySelector(selector)?.focus({preventScroll:true})
 const help=container.ownerDocument.querySelector('.help-copy')
 if(help)help.textContent='Drag a coin from the bank onto the canvas to add a copy. Tap or press Enter on a bank coin to add it to the next open position. Drag placed coins to move them, or return them to the bank to remove them. Select a coin and press Delete, or use Remove selected coin. Arrow keys move a focused coin. The total and coin counts update automatically. Your work is saved in this browser.'
 function render(restore){
  const result=evaluateMoney(question,coins)
  container.innerHTML=`<section class="mc-workspace" data-money-question="${question.id}" data-state="${result.status}">
   <p class="nm-instruction">${question.prompt}</p>
   <div class="mc-bank" aria-label="Canadian coin bank; drag placed coins here to return them">${CANADIAN_COINS.filter(coin=>question.denominations.includes(coin.value)).map(coin=>`<button class="mc-bank-coin" data-mc-value="${coin.value}" aria-label="Add Canadian ${coin.name.toLowerCase()}, ${coin.label}">${coinArt(coin.value)}<span>${coin.name}</span></button>`).join('')}</div>
   <p class="mc-note">Canadian penny included for this activity. Drag a coin onto the canvas, or tap it to add.</p>
   <div class="mc-totals"><div><span>Total (CAD)</span><output data-mc-total aria-live="polite" aria-atomic="true">${formatMoney(result.totalCents)}</output></div><div><span>Coins</span><output data-mc-count>${result.count}</output></div><div><span>Target</span><strong>${formatMoney(question.targetCents)}${question.targetCount?` · ${question.targetCount} coins`:''}</strong></div></div>
   <div class="mc-canvas" role="group" aria-label="Coin canvas">${coins.length?'':'<p class="mc-empty">Drag Canadian coins here</p>'}${coins.map(coin=>`<button class="mc-placed ${selected===coin.id?'mc-selected':''}" data-mc-id="${coin.id}" style="left:calc(${coin.x} * (100% - var(--mc-size)));top:calc(${coin.y} * (100% - var(--mc-size)))" aria-label="Canadian ${CANADIAN_COINS.find(c=>c.value===coin.value).name.toLowerCase()}, ${formatMoney(coin.value)}; arrow keys move, Delete removes" aria-pressed="${selected===coin.id}">${coinArt(coin.value)}</button>`).join('')}</div>
   <div class="mc-counts" aria-label="Coin counts">${CANADIAN_COINS.filter(coin=>question.denominations.includes(coin.value)).map(coin=>`<span>${coin.name}: <strong data-mc-denomination="${coin.value}">${result.counts[coin.value]}</strong></span>`).join('')}</div>
   <div class="mp-actions mc-actions"><button data-mc-action="remove" ${selected===null?'disabled':''}>Remove selected coin</button><button class="mp-secondary" data-mc-action="clear">Clear canvas</button></div>
   <p class="nm-feedback" role="status" aria-live="polite" aria-atomic="true">${notice||result.message}</p>
  </section>`
  if(restore)focus(restore)
 }
 const autoPosition=()=>{
  const canvas=container.querySelector('.mc-canvas'),size=parseFloat(getComputedStyle(canvas).getPropertyValue('--mc-size'))
  const columns=Math.max(1,Math.floor((canvas.clientWidth-12)/(size+10))),rows=Math.max(1,Math.floor((canvas.clientHeight-12)/(size+10)))
  const positions=Array.from({length:columns*rows},(_,index)=>({x:(index%columns+.15)/columns,y:(Math.floor(index/columns)+.15)/rows}))
  return positions.find(point=>coins.every(coin=>Math.abs(coin.x-point.x)>.8/columns||Math.abs(coin.y-point.y)>.8/rows))??positions[coins.length%positions.length]
 }
 function add(value,position=autoPosition()){
  if(coins.length>=MAX_COINS){notice=`The canvas holds up to ${MAX_COINS} coins. Remove a coin to add another.`;render();return}
  const id=nextId++;coins.push({id,value,...position});selected=id;notice='';save();render(`[data-mc-id="${id}"]`)
 }
 function remove(id){coins=coins.filter(coin=>coin.id!==id);selected=null;notice='';save();render('[data-mc-action="clear"]')}
 function reset(){drag.cancel();coins=[];selected=null;notice='';save();render('[data-mc-value]')}
 const drag=mountDigitDrag(container,{
  sourceSelector:'[data-mc-value],[data-mc-id]',targetSelector:'.mc-canvas,.mc-bank',enabled:dragAssistEnabled,
  readSource(element){
   const id=element.hasAttribute('data-mc-id')?Number(element.dataset.mcId):null
   const value=id===null?Number(element.dataset.mcValue):coins.find(coin=>coin.id===id)?.value
   return value===undefined?null:{id,value,digit:formatMoney(value)}
  },
  readTarget(element,source,point){
   if(element.matches('.mc-bank'))return {element,bank:true}
   const rect=element.getBoundingClientRect(),size=parseFloat(getComputedStyle(element).getPropertyValue('--mc-size'))*rect.width/element.offsetWidth
   return {element,position:{x:clampPosition((point.clientX-rect.left-size/2)/Math.max(1,rect.width-size)),y:clampPosition((point.clientY-rect.top-size/2)/Math.max(1,rect.height-size))}}
  },
  renderGhost(source,ghost){ghost.classList.add('mc-ghost');ghost.innerHTML=coinArt(source.value)},
  commit(source,target){
   if(target.bank){if(source.id!==null)remove(source.id);return}
   if(source.id===null)add(source.value,target.position)
   else{coins=coins.map(coin=>coin.id===source.id?{...coin,...target.position}:coin);selected=source.id;notice='';save();render(`[data-mc-id="${source.id}"]`)}
  },
 })
 const click=event=>{
  const bank=event.target.closest('[data-mc-value]'),placed=event.target.closest('[data-mc-id]'),action=event.target.closest('[data-mc-action]')
  if(bank){add(Number(bank.dataset.mcValue));focus(`[data-mc-value="${bank.dataset.mcValue}"]`)}
  else if(placed){selected=Number(placed.dataset.mcId);render(`[data-mc-id="${selected}"]`)}
  else if(action?.dataset.mcAction==='clear')reset()
  else if(action?.dataset.mcAction==='remove'&&selected!==null)remove(selected)
 }
 const key=event=>{
  const placed=event.target.closest('[data-mc-id]');if(!placed)return
  const id=Number(placed.dataset.mcId)
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove(id)}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
   event.preventDefault();selected=id
   coins=coins.map(coin=>coin.id===id?{...coin,x:clampPosition(coin.x+(event.key==='ArrowLeft'?-.025:event.key==='ArrowRight'?.025:0)),y:clampPosition(coin.y+(event.key==='ArrowUp'?-.025:event.key==='ArrowDown'?.025:0))}:coin)
   save();render(`[data-mc-id="${id}"]`)
  }
 }
 container.addEventListener('click',click);container.addEventListener('keydown',key)
 render()
 const cleanup=()=>{drag.destroy();container.removeEventListener('click',click);container.removeEventListener('keydown',key)}
 cleanup.cancelDrag=drag.cancel;cleanup.reset=reset
 return cleanup
}
