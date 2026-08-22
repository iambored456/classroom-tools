<svelte:options namespace="svg" />

<script lang="ts">
  import { combinedDirectionSymbol } from '../lib/direction-symbol'
  import type { Command } from '../lib/types'

  export let command: Command
  export let map = false

  $: symbol = combinedDirectionSymbol(command)
</script>

<svg
  class:map-direction-symbol={map}
  class="combined-direction-symbol"
  x={map ? -2.05 : undefined}
  y={map ? -2.05 : undefined}
  width={map ? 4.1 : undefined}
  height={map ? 4.1 : undefined}
  viewBox="0 0 32 32"
  aria-hidden="true"
>
  <path class="combined-arrow-outline" d={symbol.path} transform={symbol.pathTransform} />
  <text class="combined-arrow-letter" x={symbol.letterX} y={symbol.letterY}>{symbol.letter}</text>
</svg>
