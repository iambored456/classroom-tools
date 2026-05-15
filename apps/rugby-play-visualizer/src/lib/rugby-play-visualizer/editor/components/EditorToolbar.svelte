<script lang="ts">
  import type { DraftPass, DraftPlayerPath, EditorTool, Mode } from '../editorTypes'

  export let mode: Mode
  export let editorTool: EditorTool
  export let canUndo: boolean
  export let canRedo: boolean
  export let draftPlayerPath: DraftPlayerPath | null
  export let draftPass: DraftPass | null
  export let onSetMode: (mode: Mode) => void
  export let onSetTool: (tool: EditorTool) => void
  export let onUndo: () => void
  export let onRedo: () => void
  export let onFinishDraftPath: () => void
  export let onCancelDraft: () => void

  const tools: Array<{ id: EditorTool; label: string }> = [
    { id: 'select', label: 'Select' },
    { id: 'move-player', label: 'Move' },
    { id: 'draw-player-path', label: 'Draw Run' },
    { id: 'edit-player-path', label: 'Edit Run' },
    { id: 'add-pass', label: 'Add Pass' },
    { id: 'edit-ball-path', label: 'Edit Ball' },
    { id: 'erase', label: 'Erase' },
  ]
</script>

<section class="editor-card" aria-label="Editor tools">
  <div class="mode-switcher" aria-label="Mode">
    <button type="button" class:active={mode === 'view'} on:click={() => onSetMode('view')}>
      View Mode
    </button>
    <button type="button" class:active={mode === 'editor'} on:click={() => onSetMode('editor')}>
      Editor Mode
    </button>
  </div>

  {#if mode === 'editor'}
    <div class="tool-grid" aria-label="Editor tool">
      {#each tools as tool}
        <button
          type="button"
          class:active={editorTool === tool.id}
          on:click={() => onSetTool(tool.id)}
        >
          {tool.label}
        </button>
      {/each}
    </div>

    <div class="transport-row">
      <button type="button" class="icon-button" disabled={!canUndo} on:click={onUndo}>Undo</button>
      <button type="button" class="icon-button" disabled={!canRedo} on:click={onRedo}>Redo</button>
    </div>

    {#if draftPlayerPath}
      <div class="draft-actions">
        <p>Drawing run for {draftPlayerPath.playerId}. Click field waypoints, then finish.</p>
        <button type="button" class="icon-button primary" on:click={onFinishDraftPath}>Done Path</button>
        <button type="button" class="icon-button" on:click={onCancelDraft}>Cancel</button>
      </div>
    {/if}

    {#if draftPass?.fromPlayerId}
      <div class="draft-actions">
        <p>Adding pass from {draftPass.fromPlayerId}. Click the receiver.</p>
        <button type="button" class="icon-button" on:click={onCancelDraft}>Cancel</button>
      </div>
    {/if}
  {/if}
</section>
