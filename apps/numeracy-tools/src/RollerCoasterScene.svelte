<script lang="ts">
  import { coasterPose } from './roller-coaster'
  import type { graphGeometry } from './zeros-cannonball'

  let { graph, progress = 0, playing = false, onstart }: {
    graph: ReturnType<typeof graphGeometry>; progress?: number; playing?: boolean
    onstart: () => void
  } = $props()
  const pose = $derived(coasterPose(graph, progress))
  const carScale = .65
</script>

<g class="coaster-car" role="button" tabindex="0" aria-label="Start roller coaster" aria-disabled={playing}
  onclick={onstart} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onstart() } }}
  transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle})`}>
  <title>Click to ride the roller coaster</title>
  <rect class="car-target" x="-40" y="-60" width="80" height="74" rx="15" />
  <g class="coaster-art" transform={`scale(${carScale})`}>
    <!-- Riders and restraints stay on the upper side of the tangent. -->
    <path d="M-23-33V-49Q-23-54-18-54H-10V-33M5-33V-49Q5-54 10-54H18V-33" fill="#374a64" stroke="#233249" stroke-width="2" />
    <path d="M-20-29V-42Q-16-48-12-42L-7-29" fill="#72c7de" />
    <path d="M7-29V-42Q11-48 15-42L21-29" fill="#f7c964" />
    <circle cx="-16" cy="-52" r="7" fill="#e7ae80" stroke="#5c4232" stroke-width="1.5" />
    <path d="M-23-54Q-19-63-10-56L-10-52Q-17-56-23-51" fill="#503b30" />
    <circle cx="12" cy="-52" r="7" fill="#a66a46" stroke="#51392d" stroke-width="1.5" />
    <path d="M5-54Q8-64 18-57L19-52Q11-57 5-51" fill="#2c2928" />
    <path d="M-21-43L-30-55-31-64M17-43L27-55 28-64" fill="none" stroke="#d99d72" stroke-width="3" stroke-linecap="round" />
    <path d="M-22-42Q-13-37-8-42M6-42Q15-37 20-42" fill="none" stroke="#24364b" stroke-width="4" stroke-linecap="round" />
    <path d="M-34-34H33L29-13Q0-6-29-13Z" fill="#ee7652" stroke="#713d38" stroke-width="2.5" />
    <path d="M-30-29H29L27-23H-28Z" fill="#ffc77b" />
    <path d="M-23-15H23" stroke="#27364b" stroke-width="4" />
    <path d="m0-29 3 5 6 1-4 4 1 5-6-3-6 3 1-5-4-4 6-1Z" fill="#fff1b7" />
    {#each [-21, 21] as x}
      <g transform={`translate(${x} -6) rotate(${pose.wheelAngle / carScale})`}>
        <circle r="6" fill="#27364b" stroke="#c8d4df" stroke-width="2" />
        <path d="M-4 0H4M0-4V4" stroke="#b7c7d7" stroke-width="1.5" />
      </g>
    {/each}
  </g>
</g>

<style>
  .coaster-car { cursor: pointer; outline: none; }
  .car-target { fill: transparent; stroke: transparent; stroke-width: 2; }
  .coaster-car:hover .car-target, .coaster-car:focus-visible .car-target { stroke: var(--accent); stroke-dasharray: 4 4; }
</style>
