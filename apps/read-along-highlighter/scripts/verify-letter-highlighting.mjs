import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
const project = fileURLToPath(new URL('../../../', import.meta.url))
const require = createRequire(`${project}/package.json`)
const { chromium } = require('playwright')
const server = createServer(async (req,res) => {
  try {
    const path = new URL(req.url,'http://localhost').pathname
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(path)] ?? (path==='/' ? 'text/html' : 'application/octet-stream'))
    res.end(await readFile(join(project,'apps/read-along-highlighter/dist',path==='/'?'index.html':path.slice(1))))
  } catch { res.writeHead(404).end() }
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:1000,height:700}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const check = async () => page.evaluate(async () => {
    const input=document.querySelector('#text-input')
    input.value='go cat next'
    input.dispatchEvent(new Event('input',{bubbles:true}))
    document.querySelector('.word').click()
    const key=(key,shiftKey=true)=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key,shiftKey,bubbles:true}))
    key('ArrowRight'); key('ArrowRight')
    const word=document.querySelector('[data-index="1"]')
    const before={partial:word.querySelector('.character-highlighted').textContent,background:getComputedStyle(word.firstElementChild).backgroundColor,outline:document.querySelector('.leading-word').textContent}
    // Let the partial state paint before moving to its last letter.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    key('ArrowRight')
    const sample=()=>({background:getComputedStyle(word).backgroundColor,partial:!!word.firstElementChild,outline:document.querySelector('.leading-word').textContent,animations:word.getAnimations().map(a=>a.transitionProperty)})
    const frames=[sample()]
    for(let i=0;i<6;i++){await new Promise(requestAnimationFrame);frames.push(sample())}
    key('ArrowRight')
    const next={partial:document.querySelector('[data-index="2"] .character-highlighted')?.textContent,outline:document.querySelector('.leading-word').textContent}
    return {before,frames,next}
  })
  for (const palette of [null, {background:'#ffcc00',text:'#000000'}]) {
    if(palette) await page.evaluate(palette=>{
      document.documentElement.style.setProperty('--highlight-bg-color',palette.background)
      document.documentElement.style.setProperty('--highlight-text-color',palette.text)
    },palette)
    const result=await check()
    assert.equal(result.before.partial,'ca')
    assert(result.frames.every(frame=>frame.background===result.before.background && !frame.partial && frame.outline==='next' && frame.animations.length===0),'Completing a word must retain its highlight on every frame')
    assert.deepEqual(result.next,{partial:'n',outline:'next'})
    const reverse=await page.evaluate(()=>{
      const key=()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',shiftKey:true,bubbles:true}))
      key(); key()
      const word=document.querySelector('[data-index="1"]')
      const partial=word.querySelector('.character-highlighted')
      return {partial:partial.textContent,background:getComputedStyle(partial).backgroundColor,parentBackground:getComputedStyle(word).backgroundColor,outline:document.querySelector('.leading-word').textContent,animations:word.getAnimations().length}
    })
    assert.deepEqual(reverse,{partial:'ca',background:result.before.background,parentBackground:'rgba(0, 0, 0, 0)',outline:'cat',animations:0})
  }
  assert.deepEqual(errors,[])
  console.log('PASS: forward and backward letter navigation, word-boundary outline movement, and uninterrupted highlight across animation frames with default and custom colours.')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
