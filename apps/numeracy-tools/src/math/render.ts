import { mathjax } from '@mathjax/src/js/mathjax.js'
import { TeX } from '@mathjax/src/js/input/tex.js'
import { SVG } from '@mathjax/src/js/output/svg.js'
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { MathJaxFiraFont } from '@mathjax/mathjax-fira-font/js/svg.js'
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import type { MathAsset } from './layout'

// All supported inputs use the locally bundled base TeX package and Fira glyphs.
const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)
const document = mathjax.document('', {
  InputJax: new TeX({ packages: ['base'], formatError(_jax: unknown, error: Error) { throw error } }),
  OutputJax: new SVG({ fontData: MathJaxFiraFont, fontCache: 'none' }),
})

export function renderExpressions(expressions: string[]): Record<string, MathAsset> {
  const assets: Record<string, MathAsset> = {}
  for (const tex of expressions) {
    const node = document.convert(tex, { display: true, em: 16, ex: 8, containerWidth: 16000 })
    const svg = adaptor.firstChild(node)
    if (!(svg instanceof LiteElement) || svg.kind !== 'svg') throw new Error('Expected a MathJax SVG.')
    const viewBox = adaptor.getAttribute(svg, 'viewBox')
    const [, top, width, height] = viewBox.split(/\s+/).map(Number)
    const markup = adaptor.innerHTML(svg)
    if (![top, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || /data-mml-node="merror"|<script|<foreignObject|(?:href|src)=/.test(markup)) {
      throw new Error('The equations could not be rendered.')
    }
    assets[tex] = { viewBox, top, width, height, markup }
  }
  return assets
}
