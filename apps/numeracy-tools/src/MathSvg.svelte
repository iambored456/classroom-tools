<script lang="ts">
  import { mathAsset } from './math/layout'

  let { tex, x = 0, y = 0, size = 54, anchor = 'middle' }: {
    tex: string; x?: number; y?: number; size?: number; anchor?: 'start' | 'middle' | 'end'
  } = $props()
  const asset = $derived(mathAsset(tex))
  const width = $derived(asset.width * size / 1000)
  const offset = $derived(anchor === 'middle' ? -width / 2 : anchor === 'end' ? -width : 0)
</script>

<!-- Trusted, locally generated MathJax paths. Parent scene supplies the accessible description. -->
<svg class="math-svg" data-tex={tex} x={x + offset} y={y + asset.top * size / 1000} {width} height={asset.height * size / 1000} viewBox={asset.viewBox} overflow="visible" aria-hidden="true" focusable="false">
  {@html asset.markup}
</svg>
