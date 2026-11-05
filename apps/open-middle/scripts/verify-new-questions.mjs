import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const appDir=join(dirname(fileURLToPath(import.meta.url)),'..')
const url=process.env.OPEN_MIDDLE_URL??'http://localhost:5194/open-middle/'
const capture=process.argv.includes('--capture')
const examples=[
 [29,[1,2,4,0,5,6,7,8,9,3]],
 [51,[9,8,7,6,5,4]],
 [73,[3,2,4]],
 [81,[4,6,9,5,3,2]],
 [82,[5,4,9]],
 [85,[8,7,1,5,4,2]],
 [86,[1,3,4,2,6,5,8]],
]
const browser=await chromium.launch({headless:true})
try {
 const context=await browser.newContext({viewport:{width:1200,height:900}})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(url)
 for(const [id] of examples){
  await page.locator(`a.problem-link[href="#${id}"]`).waitFor()
  if(!capture){
   const response=await page.request.get(new URL(`question-previews/${id}.jpg`,url).href)
   assert.equal(response.status(),200,`#${id} hover preview exists`)
   assert.match(response.headers()['content-type'],/image\/jpeg/,`#${id} hover preview is an image`)
  }
 }
 if(capture) await mkdir(join(appDir,'public/question-previews'),{recursive:true})
 for(const [id,values] of examples){
  await page.goto(`${url}#${id}`)
  await page.locator('[data-nslot="0"]').waitFor()
  await page.evaluate(()=>localStorage.clear())
  await page.reload()
  await page.evaluate(()=>document.fonts.ready)
  assert.equal(await page.locator('[data-nslot]').count(),values.length,`#${id} digit spaces`)
  if(capture){
   const style=await page.addStyleTag({content:'.home-controls,.corner-tools{visibility:hidden!important}.workspace{padding-top:24px!important}'})
   await page.screenshot({path:join(appDir,'public/question-previews',`${id}.jpg`),type:'jpeg',quality:80,clip:{x:0,y:0,width:1200,height:840},animations:'disabled'})
   await style.evaluate(element=>element.remove())
  }
  await page.locator('[data-nslot="0"]').focus()
  for(const digit of values) await page.keyboard.press(String(digit))
  assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'success',`#${id} valid math`)
  await page.getByRole('button',{name:'Help and settings',exact:true}).click()
  await page.getByRole('button',{name:'Save current arrangement',exact:true}).click()
  assert.equal(await page.locator('.nm-attempts li').count(),1,`#${id} saved attempt`)
  await page.getByRole('button',{name:'Close help',exact:true}).click()
  await page.reload()
  assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'success',`#${id} restored work`)
  if(id===51){
   await page.locator('[data-nmode]').selectOption('less')
   assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'progress')
   await page.locator('[data-nmode]').selectOption('greater')
  }
  if(id===86){
   await page.locator('[data-nmode]').selectOption('smallest')
   assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'progress')
   await page.locator('[data-nmode]').selectOption('greatest')
  }
  await page.getByRole('button',{name:'Reset problem',exact:true}).click()
  assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'incomplete',`#${id} reset`)
 }
 await page.goto(`${url}#84`)
 await page.evaluate(()=>localStorage.clear());await page.reload()
 assert.equal(await page.locator('.nm-pair').count(),2,'existing #84 keeps both equations')
 for(const [pair,values] of [[0,[4,2,6,1,3,5]],[1,[4,2,7,1,3,6]]]){
  await page.locator(`[data-pair="${pair}"] [data-nslot="0"]`).focus()
  for(const digit of values)await page.keyboard.press(String(digit))
 }
 assert.equal(await page.locator('.nm-pairs-feedback').getAttribute('data-state'),'success')
 await page.getByRole('button',{name:'Reset problem',exact:true}).click()
 assert.equal(await page.locator('.nm-pairs-feedback').getAttribute('data-state'),'incomplete')
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844})
  for(const [id] of examples){
   await page.goto(`${url}#${id}`)
   await page.locator('[data-nslot="0"]').waitFor()
   const bounds=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,slots:[...document.querySelectorAll('[data-nslot]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}})}))
   assert.ok(bounds.scroll<=width+1,`#${id} horizontal overflow at ${width}px: ${bounds.scroll}`)
   assert.ok(bounds.slots.every(r=>r.left>=0&&r.right<=width+1&&r.width>=30),`#${id} readable digit controls at ${width}px`)
  }
 }
 assert.deepEqual(errors,[])
 console.log('Seven single-board questions and existing two-pair #84 passed keyboard, math feedback, saved attempts, reload, reset, challenge modes, and 320px/390px layout checks.'+(capture?' Captured eight landing-page previews.':''))
}finally{await browser.close()}
