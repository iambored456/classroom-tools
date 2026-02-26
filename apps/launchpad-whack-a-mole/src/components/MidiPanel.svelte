<script lang="ts">
  import { connect, selectOutput, midiState } from '../lib/midi.svelte.ts'

  async function handleConnect() {
    await connect()
  }

  function handleOutputChange(event: Event) {
    const select = event.target as HTMLSelectElement
    selectOutput(select.selectedIndex)
  }
</script>

<div class="midi-panel">
  <button
    onclick={handleConnect}
    disabled={midiState.status === 'connected' || midiState.status === 'connecting'}
  >
    {midiState.status === 'connecting'
      ? 'Connecting…'
      : midiState.status === 'connected'
        ? 'MIDI Connected'
        : 'Connect MIDI'}
  </button>
  {#if midiState.outputs.length > 0}
    <select onchange={handleOutputChange} aria-label="MIDI output device">
      {#each midiState.outputs as output, i (output.id)}
        <option value={i}>{output.name} ({output.manufacturer})</option>
      {/each}
    </select>
  {/if}
</div>
<p class="status-text">{midiState.statusMessage}</p>

<style>
  .midi-panel {
    margin: 20px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .status-text {
    margin-top: 10px;
    font-size: 16px;
    color: #ffcc00;
  }
</style>
