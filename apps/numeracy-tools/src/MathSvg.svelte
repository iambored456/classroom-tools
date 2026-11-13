<script lang="ts">
  import { mathAsset } from './math/layout'

  let { tex, x = 0, y = 0, size = 54, maxWidth = Infinity, maxHeight = Infinity, anchor = 'middle' }: {
    tex: string; x?: number; y?: number; size?: number; maxWidth?: number; maxHeight?: number; anchor?: 'start' | 'middle' | 'end'
  } = $props()
  const asset = $derived(mathAsset(tex))
  const scale = $derived(Math.min(size / 1000, maxWidth / asset.width, maxHeight / asset.height))
  const width = $derived(asset.width * scale)
  const offset = $derived(anchor === 'middle' ? -width / 2 : anchor === 'end' ? -width : 0)
</script>

<!-- Trusted, locally generated MathJax paths. Parent scene supplies the accessible description. -->
<svg class="math-svg" data-tex={tex} x={x + offset} y={y + asset.top * scale} {width} height={asset.height * scale} viewBox={asset.viewBox} overflow="visible" aria-hidden="true" focusable="false">
  {@html asset.markup}
</svg>
