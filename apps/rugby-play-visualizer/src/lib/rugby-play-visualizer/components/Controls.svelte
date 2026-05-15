<script lang="ts">
  import type { PlayFamily, PlayVariation } from '../types'

  export let playFamilies: PlayFamily[]
  export let selectedFamily: PlayFamily
  export let selectedVariation: PlayVariation
  export let selectedFamilyId: string
  export let selectedVariationId: string
  export let currentTime: number
  export let isPlaying: boolean
  export let speed: number
  export let mirrored: boolean
  export let showPaths: boolean
  export let showPassLabels: boolean
  export let showBranchLabels: boolean
  export let onSelectFamily: (familyId: string) => void
  export let onSelectVariation: (variationId: string) => void
  export let onPlay: () => void
  export let onPause: () => void
  export let onRestart: () => void

  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ]

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value
  }

  function checkboxChecked(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked
  }

  function selectSpeed(event: Event): void {
    speed = Number(selectValue(event))
  }

  function formatTime(value: number): string {
    return `${value.toFixed(1)}s`
  }
</script>

<aside class="controls-panel" aria-label="Rugby play controls">
  <div class="control-group">
    <label class="field-label" for="play-family">Play family</label>
    <select
      id="play-family"
      class="select-control"
      value={selectedFamilyId}
      on:change={(event) => onSelectFamily(selectValue(event))}
    >
      {#each playFamilies as family}
        <option value={family.id}>{family.name}</option>
      {/each}
    </select>
  </div>

  <div class="control-group">
    <span class="field-label" id="play-branch-label">Branch</span>
    <div class="branch-buttons" role="radiogroup" aria-labelledby="play-branch-label">
      {#each selectedFamily.variations as variation}
        <button
          type="button"
          class="branch-button"
          class:is-selected={selectedVariationId === variation.id}
          role="radio"
          aria-checked={selectedVariationId === variation.id}
          aria-label={`${variation.name}: ${variation.description}`}
          title={variation.description}
          on:click={() => onSelectVariation(variation.id)}
        >
          <span>{variation.name}</span>
          <small>{variation.description}</small>
        </button>
      {/each}
    </div>
  </div>

  <div class="transport-row" aria-label="Playback controls">
    {#if isPlaying}
      <button type="button" class="icon-button primary" on:click={onPause} aria-label="Pause">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14M16 5v14" />
        </svg>
        <span>Pause</span>
      </button>
    {:else}
      <button type="button" class="icon-button primary" on:click={onPlay} aria-label="Play">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5l11 7-11 7Z" />
        </svg>
        <span>Play</span>
      </button>
    {/if}

    <button type="button" class="icon-button" on:click={onRestart} aria-label="Restart">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8a7 7 0 1 1-.25 7.5" />
        <path d="M5 3v5h5" />
      </svg>
      <span>Restart</span>
    </button>
  </div>

  <div class="control-grid">
    <label class="control-group" for="speed">
      <span class="field-label">Speed</span>
      <select id="speed" class="select-control" value={speed} on:change={selectSpeed}>
        {#each speedOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>

    <div class="time-readout" aria-label="Current play time">
      <span>Time</span>
      <strong>{formatTime(currentTime)} / {formatTime(selectedVariation.duration)}</strong>
    </div>
  </div>

  <div class="toggle-list">
    <label class="toggle-row">
      <input
        type="checkbox"
        checked={mirrored}
        on:change={(event) => (mirrored = checkboxChecked(event))}
      />
      <span>Mirror / symmetry</span>
    </label>

    <label class="toggle-row">
      <input
        type="checkbox"
        checked={showPaths}
        on:change={(event) => (showPaths = checkboxChecked(event))}
      />
      <span>Show paths</span>
    </label>

    <label class="toggle-row">
      <input
        type="checkbox"
        checked={showPassLabels}
        on:change={(event) => (showPassLabels = checkboxChecked(event))}
      />
      <span>Show pass labels</span>
    </label>

    <label class="toggle-row">
      <input
        type="checkbox"
        checked={showBranchLabels}
        on:change={(event) => (showBranchLabels = checkboxChecked(event))}
      />
      <span>Show branch labels</span>
    </label>
  </div>
</aside>
