import { writeFile, readFile } from 'node:fs/promises'
import { mathjax } from '@mathjax/src/js/mathjax.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import { SVG } from '@mathjax/src/js/output/svg.js'
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { MathJaxFiraFont } from '@mathjax/mathjax-fira-font/js/svg.js'
import '@mathjax/src/js/util/asyncLoad/esm.js'
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import { buildLesson, presets, lessonExpressions } from '../src/math/system.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)
const document = mathjax.document('', {
  InputJax: new TeX({ packages: ['base'], formatError(_jax, error) { throw error } }),
  OutputJax: new SVG({ fontData: MathJaxFiraFont, fontCache: 'none' }),
})
const expressions = new Set(presets.flatMap(preset => lessonExpressions(buildLesson(preset.config))))
for (const tex of ['y =', '(x -', ')^2 +', '(x +', ')^2 -']) expressions.add(tex)
const assets = {}
for (const tex of expressions) {
  const result = await document.convertPromise(tex, { display: true, em: 16, ex: 8, containerWidth: 16000 })
  const svg = adaptor.firstChild(result)
  const viewBox = adaptor.getAttribute(svg, 'viewBox')
  const [left, top, width, height] = viewBox.split(/\s+/).map(Number)
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error(`Invalid MathJax geometry: ${tex}`)
  const markup = adaptor.innerHTML(svg)
  if (/data-mml-node="merror"|<script|<foreignObject|(?:href|src)=/.test(markup)) throw new Error(`Unexpected MathJax output: ${tex}`)
  assets[tex] = { viewBox, top, width, height, markup }
}
const output = JSON.stringify(assets, null, 2) + '\n'
const target = new URL('../src/math/generated.json', import.meta.url)
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== output) throw new Error('Math SVG assets are stale. Run pnpm --filter numeracy-tools generate:math.')
  console.log(`Verified ${expressions.size} MathJax equations.`)
} else {
  await writeFile(target, output)
  console.log(`Generated ${expressions.size} MathJax equations with Fira Math.`)
}
