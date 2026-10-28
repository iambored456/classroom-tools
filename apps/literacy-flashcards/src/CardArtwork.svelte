<script lang="ts">
  import type { ArtworkCrop } from './artwork'

  type Props = {
    src: string
    crop: ArtworkCrop
    label: string
    clipId: string
    onerror?: () => void
  }
  let { src, crop, label, clipId, onerror = () => {} }: Props = $props()
</script>

<svg class="card-art" width={crop.width} height={crop.height}
  viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
  preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
  <defs>
    <clipPath id={`${clipId}-clip`} clipPathUnits="userSpaceOnUse">
      <rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} />
    </clipPath>
    {#if crop.exclusions.length}
      <mask id={`${clipId}-mask`} maskUnits="userSpaceOnUse"
        x={crop.x} y={crop.y} width={crop.width} height={crop.height}>
        <rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} fill="white" />
        {#each crop.exclusions as exclusion}
          <rect x={exclusion.x} y={exclusion.y} width={exclusion.width} height={exclusion.height} fill="black" />
        {/each}
      </mask>
    {/if}
  </defs>
  <image href={src} width={crop.sourceWidth} height={crop.sourceHeight}
    clip-path={`url(#${clipId}-clip)`}
    mask={crop.exclusions.length ? `url(#${clipId}-mask)` : undefined} {onerror} />
</svg>
