<script lang="ts">
  import { onMount } from 'svelte'
  import MidiPanel from './components/MidiPanel.svelte'
  import ScoreBoard from './components/ScoreBoard.svelte'
  import GameControls from './components/GameControls.svelte'
  import PadGrid from './components/PadGrid.svelte'
  import { noteMapping, setNoteCallback } from './lib/midi.svelte.ts'
  import { handlePadPress, gameState } from './lib/game.svelte.ts'

  onMount(() => {
    setNoteCallback(handlePadPress)
  })
</script>

<div class="container">
  <ScoreBoard />
  <MidiPanel />
  <PadGrid
    {noteMapping}
    activeNote={gameState.activeNote}
    activePadColor={gameState.activePadColor?.hex ?? null}
  />
  <GameControls />
</div>

<style>
  .container {
    text-align: center;
    width: 90%;
    max-width: 800px;
  }
</style>
