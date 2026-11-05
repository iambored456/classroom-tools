import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
const appDir=join(dirname(fileURLToPath(import.meta.url)),'..')
const url=process.env.OPEN_MIDDLE_URL??'http://localhost:5194/open-middle/'
const capture=process.argv.includes('--capture')
const moneyOnly=process.argv.includes('--money-only')
const examples=[[89,[1,2,3,5,4,7]],[90,[1,5,2,6,4,3]],[107,[4,9,8,7,5,0,1,2]],[108,[4,9,8,7,5,0,1,3]],[117,[1,9,2,8,3,7,4,6]],[118,[7,3,4,6,8,9,1,2,5,0]],[119,[1,2,3,5,0]]]
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1200,height:1100}})
 const page=await context.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const goto=async id=>{await page.goto(`${url}#${id}`);await page.locator('.workspace').waitFor();await page.evaluate(()=>localStorage.clear());await page.reload();await page.evaluate(()=>document.fonts.ready)}
 const capturePreview=async id=>{
  if(!capture)return
  const style=await page.addStyleTag({content:'.home-controls,.corner-tools{visibility:hidden!important}.workspace{padding-top:24px!important}.mc-canvas{height:230px!important}'})
  await page.screenshot({path:join(appDir,'public/question-previews',`${id}.jpg`),type:'jpeg',quality:80,clip:{x:0,y:0,width:1200,height:840},animations:'disabled'})
  await style.evaluate(element=>element.remove())
 }
 if(capture)await mkdir(join(appDir,'public/question-previews'),{recursive:true})
 for(const [id,values] of moneyOnly?[]:examples){
  await goto(id);await page.locator('[data-nslot="0"]').waitFor();await capturePreview(id)
  assert.equal(await page.locator('[data-nslot]').count(),values.length)
  await page.locator('[data-nslot="0"]').focus()
  for(const digit of values)await page.keyboard.press(String(digit))
  assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'success',`#${id} valid arrangement`)
  await page.reload();assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'success',`#${id} restored`)
  await page.getByRole('button',{name:'Reset problem',exact:true}).click()
  assert.equal(await page.locator('.nm-board').getAttribute('data-state'),'incomplete')
 }
 const drag=async(source,x,y)=>{
  const box=await source.boundingBox();assert.ok(box)
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down()
  await page.mouse.move(x,y,{steps:12});await page.mouse.up()
 }
 const add=async(value,count)=>{for(let i=0;i<count;i++)await page.locator(`[data-mc-value="${value}"]`).click()}
 await goto(142);await capturePreview(142)
 assert.equal(await page.locator('[data-mc-value]').count(),3)
 let canvas=await page.locator('.mc-canvas').boundingBox()
 await drag(page.locator('[data-mc-value="5"]'),canvas.x+180,canvas.y+90)
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$0.05','drag adds exactly one coin')
 assert.equal(await page.locator('[data-mc-count]').textContent(),'1')
 await drag(page.locator('[data-mc-id]').first(),canvas.x+320,canvas.y+180)
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$0.05','moving a coin does not add its value again')
 const bank=await page.locator('.mc-bank').boundingBox()
 await drag(page.locator('[data-mc-id]').first(),bank.x+bank.width/2,bank.y+bank.height/2)
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$0.00','returning a coin subtracts it')
 await add(10,10)
 assert.equal(await page.locator('.mc-workspace').getAttribute('data-state'),'success')
 await page.locator('[data-mc-id]').first().focus();await page.keyboard.press('Delete')
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$0.90')
 await page.getByRole('button',{name:'Reset problem',exact:true}).click()
 assert.equal(await page.locator('[data-mc-count]').textContent(),'0')
 await goto(143);await capturePreview(143)
 for(const value of [1,5,10])await add(value,9)
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$1.44')
 assert.equal(await page.locator('[data-mc-count]').textContent(),'27')
 assert.equal(await page.locator('.mc-workspace').getAttribute('data-state'),'success')
 await page.reload();assert.equal(await page.locator('[data-mc-total]').textContent(),'$1.44')
 await page.locator('[data-mc-id]').first().focus();await page.keyboard.press('ArrowRight')
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$1.44')
 await page.keyboard.press('Delete')
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$1.43')
 assert.equal(await page.locator('.mc-workspace').getAttribute('data-state'),'working')
 await goto(144);await capturePreview(144)
 assert.equal(await page.locator('[data-mc-value]').count(),6)
 await add(25,4)
 assert.equal(await page.locator('[data-mc-total]').textContent(),'$1.00')
 assert.equal(await page.locator('.mc-workspace').getAttribute('data-state'),'working','total alone does not meet the 15-coin goal')
 await page.getByRole('button',{name:'Clear canvas',exact:true}).click()
 await add(5,10);await add(10,5)
 assert.equal(await page.locator('.mc-workspace').getAttribute('data-state'),'success')
 assert.equal(await page.locator('[data-mc-count]').textContent(),'15')
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844})
  for(const id of [...(moneyOnly?[]:examples.map(([id])=>id)),142,143,144]){
   await page.goto(`${url}#${id}`);await page.locator('.workspace').waitFor()
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`#${id} overflow at ${width}px`)
   if(id>=142){
    const overlap=await page.locator('.mc-bank').evaluate(bank=>bank.getBoundingClientRect().bottom>bank.nextElementSibling.getBoundingClientRect().top+1)
    assert.equal(overlap,false,`#${id} coin bank labels do not overlap the instructions`)
    await page.locator('[data-mc-value="1"]').click()
    const outside=await page.locator('.mc-canvas').evaluate(canvas=>{const r=canvas.getBoundingClientRect();return [...canvas.querySelectorAll('button')].some(el=>{const b=el.getBoundingClientRect();return b.left<r.left||b.right>r.right+1||b.top<r.top||b.bottom>r.bottom+1})})
    assert.equal(outside,false,`#${id} coins stay on phone canvas`)
   }
  }
 }
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
 const phone=await touch.newPage();await phone.goto(`${url}#142`)
 await phone.locator('[data-mc-value="5"]').tap()
 assert.equal(await phone.locator('[data-mc-total]').textContent(),'$0.05','tap adds one Canadian coin')
 await phone.locator('[data-mc-id]').tap();await phone.getByRole('button',{name:'Remove selected coin',exact:true}).tap()
 assert.equal(await phone.locator('[data-mc-total]').textContent(),'$0.00')
 await phone.locator('[data-mc-value="10"]').evaluate(coin=>coin.scrollIntoView({block:'center',behavior:'instant'}))
 const touchSource=await phone.locator('[data-mc-value="10"]').boundingBox(),touchCanvas=await phone.locator('.mc-canvas').boundingBox()
 const cdp=await touch.newCDPSession(phone)
 const start={x:touchSource.x+touchSource.width/2,y:touchSource.y+touchSource.height/2},end={x:touchCanvas.x+touchCanvas.width/2,y:Math.min(800,touchCanvas.y+50)}
 assert.ok(end.y>touchCanvas.y&&end.y<844,'touch drop point is visible on the canvas')
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]})
 for(let step=1;step<=8;step++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*step/8,y:start.y+(end.y-start.y)*step/8}]})
  await phone.evaluate(()=>new Promise(requestAnimationFrame))
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 assert.equal(await phone.locator('[data-mc-total]').textContent(),'$0.10','native touch drag adds a coin')
 assert.deepEqual(errors,[])
 console.log((moneyOnly?'Three Canadian coin canvases':'Seven number activities and three Canadian coin canvases')+' passed math feedback, drag/copy/move/return, exact totals, extra goal conditions, keyboard/tap removal, saved work, reset, and phone layout checks.')
}finally{await browser.close()}
