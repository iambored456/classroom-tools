<script lang="ts">
  import type { ArtworkCrop } from './artwork'

  type Props = {
    src: string
    crop: ArtworkCrop
    label: string
    clipId: string
    consistentScale?: boolean
    onerror?: () => void
  }
  let { src, crop, label, clipId, consistentScale = false, onerror = () => {} }: Props = $props()

  // Centre the clipped artwork in a common canvas instead of enlarging each
  // tight crop to fill the card. Normalise by source width to allow for scans
  // at different resolutions. Landing previews keep their compact crops.
  const frameWidth = $derived(consistentScale ? crop.sourceWidth : crop.width)
  const frameHeight = $derived(consistentScale ? Math.max(crop.height, crop.sourceWidth * 2 / 3) : crop.height)
  const frameX = $derived(crop.x + (crop.width - frameWidth) / 2)
  const frameY = $derived(crop.y + (crop.height - frameHeight) / 2)
</script>

<svg class="card-art" width={crop.width} height={crop.height}
  viewBox={`${frameX} ${frameY} ${frameWidth} ${frameHeight}`}
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
