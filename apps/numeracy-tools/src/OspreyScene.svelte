<script lang="ts">
  import { ospreyPose } from './osprey'
  import type { graphGeometry } from './zeros-cannonball'

  let { graph, progress, started, playing, onstart }: {
    graph: ReturnType<typeof graphGeometry>; progress: number; started: boolean; playing: boolean; onstart: () => void
  } = $props()
  const pose = $derived(ospreyPose(graph, started ? progress : 0))
  const fish = $derived(graph.point(.5))
</script>

{#snippet fishArt()}
  <path d="M-15 0L-28-9-25 0-28 9Z" fill="#e4a355" stroke="#374952" stroke-width="1.5" />
  <path d="M-19 0Q-4-17 18-1Q7 14-19 0Z" fill="#95d8cc" stroke="#374952" stroke-width="1.5" />
  <path d="M-9-7L-3-15 5-9M-2 7L3 13 8 7" fill="#e4a355" stroke="#374952" stroke-width="1.5" />
  <path d="M-12 1Q0 7 12 1" fill="none" stroke="#e7fff7" stroke-width="2" />
  <circle cx="11" cy="-2" r="2" fill="#152b32" />
{/snippet}

<g class="osprey-scene" data-phase={pose.phase} data-has-fish={pose.carryingFish}>
  {#if !pose.carryingFish}
    <g class="waiting-fish" transform={`translate(${fish.x + 5} ${fish.y + 23})`}>
      {@render fishArt()}
    </g>
  {/if}
  {#each [pose.entrySplash, pose.exitSplash] as splash, index}
    {#if started && splash > 0}
      <g class="splash" transform={`translate(${graph.point(index).x} ${graph.yPixel(0)})`} opacity={splash}>
        <ellipse rx={12 + 23 * (1 - splash)} ry={3 + 5 * (1 - splash)} />
        <path d={`M-7-2Q-19 ${-25 * splash}-24 ${-14 * splash}M0-3V${-32 * splash}M8-2Q20 ${-24 * splash}27 ${-13 * splash}`} />
      </g>
    {/if}
  {/each}
  {#if started && (pose.phase === 'dive' || pose.phase === 'swim')}
    <g class="bubbles" aria-hidden="true">
      {#each [1, 2, 3] as bubble}
        <circle cx={pose.x - 12 * bubble} cy={pose.y - 8 - 6 * bubble} r={2 + bubble} opacity={.7 - bubble * .13} />
      {/each}
    </g>
  {/if}
  <g class="osprey" role="button" tabindex="0" aria-label="Start osprey dive" aria-disabled={playing} onclick={onstart}
    onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onstart() } }}
    transform={`translate(${pose.x} ${pose.y})`}>
    <title>Click the osprey to dive for a fish</title>
    <rect class="bird-target" x="-49" y="-43" width="94" height="88" rx="20" />
    <g class="bird-art" transform={`rotate(${pose.angle})`} opacity={pose.opacity}>
      <path d="M-10-5Q-21-29-38-36L-31-18-38-22-27-4Z" fill="#8b7963" stroke="#463c33" stroke-width="1.5" transform={`rotate(${-pose.wing * .65} -8 -4)`} />
      <path d="M-19 2L-40-4-34 5-40 10-18 10Z" fill="#54483b" stroke="#302c29" stroke-width="1.5" />
      <ellipse cx="-5" cy="2" rx="24" ry="13" fill="#f4efe2" stroke="#463c33" stroke-width="1.8" />
      <path d="M-27 0Q-9-20 15-4L7 3-8-1Z" fill="#6a5845" />
      <path d="M-7-5Q-20-26-29-37L-35-42-32-27-40-34-35-18-43-23Q-29 3-7 8Z" fill="#64513f" stroke="#302c29" stroke-width="1.8" stroke-linejoin="round" transform={`rotate(${pose.wing} -7 -5)`} />
      <path d="M11-7Q14-21 28-15Q37-10 30 0L14 5Z" fill="#fffaf0" stroke="#463c33" stroke-width="1.5" />
      <path d="M12-10L29-9 30-5 13-4Z" fill="#493c32" />
      <circle cx="26" cy="-8" r="3" fill="#f1c94b" /><circle cx="27" cy="-8" r="1.5" fill="#17262a" />
      <path d="M32-8Q45-7 36 2L36-3 30-3Z" fill="#343b40" />
      <path d="M0 12L3 20M10 11L12 20M-1 23L3 20 7 23M8 23L12 20 16 23" fill="none" stroke="#b6a376" stroke-width="2.5" stroke-linecap="round" />
      {#if pose.carryingFish}<g class="caught-fish" transform="translate(5 24) scale(.8)">{@render fishArt()}</g>{/if}
    </g>
  </g>
</g>

<style>
  .splash { fill: none; stroke: #72cfe8; stroke-width: 3; stroke-linecap: round; }
  .bubbles { fill: #c8f5ff; stroke: #479ab3; stroke-width: 1; pointer-events: none; }
  .osprey { cursor: pointer; outline: none; }
  .bird-target { fill: transparent; stroke: transparent; stroke-width: 2; }
  .osprey:hover .bird-target, .osprey:focus-visible .bird-target { stroke: var(--accent); stroke-dasharray: 4 4; }
</style>
