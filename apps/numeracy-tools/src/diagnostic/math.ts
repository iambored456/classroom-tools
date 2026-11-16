import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { STATE } from '@mathjax/src/js/core/MathItem.js'
import type { MmlNode } from '@mathjax/src/js/core/MmlTree/MmlNode.js'
import { SerializedMmlVisitor } from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import { mathjax } from '@mathjax/src/js/mathjax.js'

RegisterHTMLHandler(liteAdaptor())
const document = mathjax.document('', {
  InputJax: new TeX({ packages: ['base'], formatError(_jax: unknown, error: Error) { throw error } }),
})
const visitor = new SerializedMmlVisitor()
const cache = new Map<string, string>()

// Only bundled question-bank expressions go through MathJax.
export function renderMath(tex: string): string {
  const previous = cache.get(tex)
  if (previous) return previous
  const math = document.convert(tex, { display: false, end: STATE.COMPILED }) as MmlNode
  const markup = visitor.visitTree(math)
  cache.set(tex, markup)
  return markup
}
