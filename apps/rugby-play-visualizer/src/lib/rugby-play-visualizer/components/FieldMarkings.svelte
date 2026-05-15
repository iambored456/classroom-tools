<script lang="ts">
  const fullWidthLines = [10, 22, 34, 46, 58, 70, 82, 94]
  const hashRows = [16, 28, 40, 52, 64, 76, 88]
  const shortHashRows = [18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84]
</script>

<g class="field-markings">
  <rect class="field-background" x="0" y="0" width="100" height="100" rx="1.5" />
  <rect class="field-boundary" x="4" y="3" width="92" height="94" rx="0.8" />

  {#each fullWidthLines as y}
    <line class="major-field-line" x1="4" y1={y} x2="96" y2={y} />
  {/each}

  <line class="center-line" x1="4" y1="50" x2="96" y2="50" />

  {#each hashRows as y}
    <line class="hash-line" x1="18" y1={y} x2="28" y2={y} />
    <line class="hash-line" x1="72" y1={y} x2="82" y2={y} />
  {/each}

  {#each shortHashRows as y}
    <line class="short-hash" x1="39" y1={y} x2="43" y2={y} />
    <line class="short-hash" x1="57" y1={y} x2="61" y2={y} />
  {/each}

  <g class="goalpost goalpost-top">
    <line x1="43" y1="1.2" x2="43" y2="7.2" />
    <line x1="57" y1="1.2" x2="57" y2="7.2" />
    <line x1="43" y1="7.2" x2="57" y2="7.2" />
  </g>

  <g class="goalpost goalpost-bottom">
    <line x1="43" y1="98.8" x2="43" y2="92.8" />
    <line x1="57" y1="98.8" x2="57" y2="92.8" />
    <line x1="43" y1="92.8" x2="57" y2="92.8" />
  </g>

  <text class="attack-direction" x="50" y="12" text-anchor="middle">Attack</text>
  <path class="attack-arrow" d="M50 18v-7M47.6 13.2 50 10.8l2.4 2.4" />
</g>
