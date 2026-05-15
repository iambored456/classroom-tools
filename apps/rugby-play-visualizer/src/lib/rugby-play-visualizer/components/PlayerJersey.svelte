<script lang="ts">
  export let number: number
  export let x: number
  export let y: number
  export let hasBall: boolean
  export let isActive = false
</script>

<g
  class={`player-jersey ${hasBall ? 'has-ball' : ''} ${isActive ? 'is-active' : ''}`}
  transform={`translate(${x} ${y})`}
>
  {#if hasBall}
    <circle class="carrier-ring" r="5.25" />
  {/if}
  <path
    class="jersey-body"
    d="M-2.55 -2.35 -4.15 -0.7 -3.1 1.25 -2.05 0.55 -2.05 3.15 2.05 3.15 2.05 0.55 3.1 1.25 4.15 -0.7 2.55 -2.35 1.1 -2.85 0.62 -1.5 -0.62 -1.5 -1.1 -2.85Z"
  />
  <path class="jersey-collar" d="M-1.05 -2.7 0 -1.55 1.05 -2.7" />
  <text class="jersey-number" y="1.45" text-anchor="middle">{number}</text>
</g>
