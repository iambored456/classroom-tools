<script lang="ts">
  export let x: number
  export let y: number
</script>

<g class="ball" transform={`translate(${x} ${y}) rotate(-18)`}>
  <ellipse cx="0" cy="0" rx="1.45" ry="0.82" />
  <path d="M-0.8 0h1.6" />
  <path d="M-0.25 -0.35v0.7M0.25 -0.35v0.7" />
</g>
