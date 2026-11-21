<script lang="ts">
  import { visibleSurface } from './geometry'
  import type { Sides, PhysicalDie } from './roll'

  let { sides, numbered = false }: { sides: Sides; numbered?: boolean } = $props()
  let die: PhysicalDie = $derived({ sides: sides === 100 ? 10 : sides, face: sides === 100 ? 9 : sides,
    role: sides === 100 ? 'tens' : 'ordinary', pair: 0, logicalId: '' })
  let surface = $derived(visibleSurface(die, [sides === 6 ? -.25 : 0, sides === 6 ? .25 : 0, -.12]))
</script>

<svg viewBox="-1.13 -1.13 2.26 2.26" aria-hidden="true" focusable="false">
  <g transform="scale(1 -1)" stroke="#18312e" stroke-width=".031" stroke-linejoin="round">
    {#each surface.faces as side}
      <polygon points={side.points.map(p => p.slice(0,2).join(',')).join(' ')} fill={side.fill} />
    {/each}
  </g>
  {#if numbered}
    {#each surface.labels as label}
      <text transform={'matrix(' + [label.right[0],-label.right[1],-label.up[0],label.up[1],label.at[0],-label.at[1]].join(' ') + ')'}
        y={label.size*.33} font-size={label.size} font-weight="700" text-anchor="middle" fill="#162528">{label.text}</text>
    {/each}
  {/if}
</svg>
