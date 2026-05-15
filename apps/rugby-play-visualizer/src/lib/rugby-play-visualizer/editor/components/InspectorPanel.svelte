<script lang="ts">
  import { deriveTimedPathFromPace } from '../../playEngine'
  import type { PassEvent, PlayerPath, PlayVariation } from '../../types'
  import type { PassValidationIssue } from '../validation'
  import type { EditorTool, SelectedItem } from '../editorTypes'

  export let variation: PlayVariation
  export let selectedItem: SelectedItem
  export let editorTool: EditorTool
  export let mirrored: boolean
  export let validationIssues: PassValidationIssue[]
  export let exportText: string
  export let importText: string
  export let onUpdatePlayerPath: (path: PlayerPath) => void
  export let onDeleteSelected: () => void
  export let onClearSelectedPath: () => void
  export let onUpdatePass: (pass: PassEvent) => void
  export let onClearBallWaypoints: (passId: string) => void
  export let onDeletePass: (passId: string) => void
  export let onExportVariation: () => void
  export let onExportFamily: () => void
  export let onExportDocument: () => void
  export let onCopyJson: () => void
  export let onImportJson: () => void
  export let onResetDefault: () => void

  $: selectedPlayerId =
    selectedItem?.type === 'player' || selectedItem?.type === 'player-waypoint'
      ? selectedItem.playerId
      : null
  $: selectedPlayer = selectedPlayerId
    ? variation.players.find((player) => player.id === selectedPlayerId) ?? null
    : null
  $: selectedPath = selectedPlayerId
    ? variation.playerPaths.find((path) => path.playerId === selectedPlayerId) ?? null
    : null
  $: selectedPassId =
    selectedItem?.type === 'pass' || selectedItem?.type === 'ball-waypoint'
      ? selectedItem.passId
      : null
  $: selectedPass = selectedPassId
    ? variation.passes.find((pass) => pass.id === selectedPassId) ?? null
    : null
  $: selectedPassIssues = selectedPassId
    ? validationIssues.filter((issue) => issue.passId === selectedPassId || issue.passId === '')
    : validationIssues

  function numberFromInput(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value)
  }

  function textFromInput(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value
  }

  function updateSelectedPath(patch: Partial<PlayerPath>): void {
    if (!selectedPath) return
    onUpdatePlayerPath({ ...selectedPath, ...patch })
  }

  function updateSelectedPass(patch: Partial<PassEvent>): void {
    if (!selectedPass) return
    onUpdatePass({ ...selectedPass, ...patch })
  }
</script>

<section class="editor-card inspector" aria-label="Editor inspector">
  <div class="inspector-heading">
    <span>Editing</span>
    <strong>{variation.name}</strong>
  </div>

  {#if mirrored}
    <p class="editor-note">Mirror is preview-only. Coordinates are saved unmirrored, so editing is disabled while mirrored.</p>
  {/if}

  <p class="editor-note">Tool: {editorTool}</p>

  {#if selectedPlayer}
    <div class="inspector-section">
      <h3>Player {selectedPlayer.number}</h3>
      {#if selectedPath}
        <label class="stacked-field">
          <span>Start time</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max={variation.duration}
            value={selectedPath.startT}
            on:change={(event) => updateSelectedPath({ startT: numberFromInput(event) })}
          />
        </label>
        <label class="stacked-field">
          <span>Pace</span>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={selectedPath.pace}
            on:change={(event) => updateSelectedPath({ pace: numberFromInput(event) })}
          />
        </label>
        <div class="pace-presets">
          <button type="button" on:click={() => updateSelectedPath({ pace: 5 })}>Very Slow</button>
          <button type="button" on:click={() => updateSelectedPath({ pace: 8 })}>Slow</button>
          <button type="button" on:click={() => updateSelectedPath({ pace: 12 })}>Normal</button>
          <button type="button" on:click={() => updateSelectedPath({ pace: 16 })}>Fast</button>
          <button type="button" on:click={() => updateSelectedPath({ pace: 20 })}>Very Fast</button>
        </div>

        <div class="waypoint-list">
          {#each deriveTimedPathFromPace(selectedPath).points as waypoint, index}
            <span>Waypoint {index + 1}: t = {waypoint.t.toFixed(2)}s</span>
          {/each}
        </div>

        <div class="transport-row">
          <button type="button" class="icon-button" on:click={onClearSelectedPath}>Clear path</button>
          <button type="button" class="icon-button" on:click={onDeleteSelected}>Delete selected</button>
        </div>
      {:else}
        <p class="editor-note">No path yet. Use Draw Run to create one.</p>
      {/if}
    </div>
  {:else if selectedPass}
    <div class="inspector-section">
      <h3>Pass: {selectedPass.from} -> {selectedPass.to}</h3>
      <label class="stacked-field">
        <span>Label</span>
        <input
          type="text"
          value={selectedPass.label ?? ''}
          on:change={(event) => updateSelectedPass({ label: textFromInput(event) })}
        />
      </label>
      <label class="stacked-field">
        <span>Start time</span>
        <input
          type="number"
          step="0.1"
          min="0"
          max={variation.duration}
          value={selectedPass.startT}
          on:change={(event) => updateSelectedPass({ startT: numberFromInput(event) })}
        />
      </label>
      <label class="stacked-field">
        <span>End time</span>
        <input
          type="number"
          step="0.1"
          min="0"
          max={variation.duration}
          value={selectedPass.endT}
          on:change={(event) => updateSelectedPass({ endT: numberFromInput(event) })}
        />
      </label>
      <p class="editor-note">Flight duration: {(selectedPass.endT - selectedPass.startT).toFixed(2)}s</p>
      <div class="transport-row">
        <button type="button" class="icon-button" on:click={() => onClearBallWaypoints(selectedPass.id)}>
          Clear ball waypoints
        </button>
        <button type="button" class="icon-button" on:click={() => onDeletePass(selectedPass.id)}>
          Delete pass
        </button>
      </div>
    </div>
  {:else}
    <p class="editor-note">Select a player, waypoint, or pass to edit its details.</p>
  {/if}

  {#if selectedPassIssues.length > 0}
    <div class="validation-list">
      <strong>Warnings</strong>
      {#each selectedPassIssues as issue}
        <p class={`validation-${issue.severity}`}>{issue.message}</p>
      {/each}
    </div>
  {/if}

  <div class="json-panel">
    <div class="transport-row">
      <button type="button" class="icon-button" on:click={onExportVariation}>Export Variation</button>
      <button type="button" class="icon-button" on:click={onExportFamily}>Export Family</button>
    </div>
    <div class="transport-row">
      <button type="button" class="icon-button" on:click={onExportDocument}>Export Document</button>
      <button type="button" class="icon-button" on:click={onCopyJson}>Copy JSON</button>
    </div>
    <textarea class="json-textarea" bind:value={exportText} aria-label="Exported JSON"></textarea>
    <textarea class="json-textarea compact" bind:value={importText} aria-label="Import JSON placeholder"></textarea>
    <div class="transport-row">
      <button type="button" class="icon-button" on:click={onImportJson}>Import JSON</button>
      <button type="button" class="icon-button" on:click={onResetDefault}>Reset Default</button>
    </div>
  </div>
</section>
