<script lang="ts">
  import MidiConnect from './components/MidiConnect.svelte'
  import PadGrid from './components/PadGrid.svelte'
  import { midiState, noteMapping } from './lib/midi.svelte.ts'
</script>

<main class="controller">
  <header>
    <h1>Launchpad Controller</h1>
  </header>
  <MidiConnect />
  {#if midiState.status === 'connected'}
    <PadGrid {noteMapping} activePads={midiState.activePads} />
  {:else}
    <div class="grid-placeholder" aria-label="Connect a MIDI device to see the grid"></div>
  {/if}
</main>

<style>
  .controller {
    text-align: center;
    padding: 2rem 1.5rem;
  }

  h1 {
    font-size: clamp(1.5rem, 4vw, 2.4rem);
    margin: 0 0 1.5rem;
  }

  .grid-placeholder {
    width: calc(8 * 60px + 7 * 10px);
    height: calc(8 * 60px + 7 * 10px);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    margin: 0 auto;
  }

  @media (max-width: 600px) {
    .grid-placeholder {
      width: calc(8 * 40px + 7 * 8px);
      height: calc(8 * 40px + 7 * 8px);
    }
  }
</style>
