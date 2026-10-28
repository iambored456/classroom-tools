import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(`${root}/package.json`)
const { chromium } = require('playwright')
const data = await readFile(join(root, 'src/ufli-texts.ts'), 'utf8')
const lessons = JSON.parse(data.slice(data.indexOf(' = ') + 3).replace(/ as const\s*$/, ''))
assert.equal(lessons.length, 131)
const server = createServer(async (req, res) => {
 try {
  const path = new URL(req.url, 'http://localhost').pathname
  const file = path === '/' ? 'index.html' : path.slice(1)
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)] ?? 'application/octet-stream')
  res.end(await readFile(join(root, 'dist', file)))
 } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
try {
 const page = await browser.newPage({viewport:{width:1000,height:760}})
 page.setDefaultTimeout(5000)
 const errors=[]
 page.on('pageerror', e=>errors.push(e.message))
 const origin = `http://127.0.0.1:${server.address().port}`
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.goto(origin)
 const open = async () => {
  await page.locator('#sidebar-toggle').click()
  await page.locator('#sidebar').waitFor({state:'visible'})
  await page.locator('#ufli-open').click()
 }
 await open()
 assert.equal(await page.locator('#ufli-grid button').count(), 131)
 assert.deepEqual(await page.locator('#ufli-grid button').allTextContents(),lessons.map(x=>x.id))
 await page.keyboard.press('Escape')
 assert.equal(await page.locator('#ufli-dialog').evaluate(el=>el.open),false)
 assert.equal(await page.evaluate(()=>document.activeElement.id),'ufli-open')
 // Check every mapping, full reader text, saved text, and first-word position.
 for (const lesson of lessons) {
  await page.locator('#ufli-open').click()
  await page.locator('#ufli-grid button').filter({hasText:new RegExp(`^${lesson.id}$`)}).click()
  await page.waitForFunction(()=>document.querySelector('#text-container').getAttribute('aria-busy')==='false')
  assert.equal(await page.locator('#text-input').inputValue(),lesson.text)
  assert.equal(await page.evaluate(()=>localStorage.getItem('readAlong:lastText')),lesson.text)
  assert.equal(await page.locator('#text-container').textContent(),lesson.text.replace(/\n/g,''))
  assert.equal(await page.locator('#text-container .word.highlighted').count(),1)
  assert.equal(await page.evaluate(()=>document.activeElement.id),'text-container')
  await page.locator('#sidebar-toggle').click()
 }
 await page.reload()
 assert.equal(await page.locator('#text-input').inputValue(),lessons.at(-1).text)
 await page.setViewportSize({width:320,height:640})
 await open()
 const bounds=await page.locator('#ufli-dialog').boundingBox()
 assert(bounds.x>=0 && bounds.x+bounds.width<=320)
 await page.locator('#ufli-grid button').last().scrollIntoViewIfNeeded()
 await page.screenshot({path:join(root,'ufli-mobile.png')})
 await page.locator('#ufli-close').click()
 assert.equal(await page.locator('#ufli-dialog').evaluate(el=>el.open),false)
 // Pending large custom text must not overwrite a newly selected lesson.
 await page.locator('#text-input').fill('Long text '.repeat(10000))
 await page.locator('#ufli-open').click()
 await page.locator('#ufli-grid button').first().click()
 await page.waitForTimeout(800)
 assert.equal(await page.locator('#text-input').inputValue(),lessons[0].text)
 assert.equal(await page.evaluate(()=>localStorage.getItem('readAlong:lastText')),lessons[0].text)
 assert.equal(await page.locator('#text-container .word').first().textContent(),'I')
 assert.deepEqual(errors,[])
 console.log('PASS: all 131 mappings, rendering, highlight reset, saving/reload, Escape/focus, mobile layout, close button, and pending paste cancellation.')
} finally {
 await browser.close()
 await new Promise(resolve=>server.close(resolve))
}




