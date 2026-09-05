<script lang="ts">
  import {
    connect,
    getDeviceLabel,
    getOutputLabel,
    isMidiSupported,
    isSelectedHardwareReady,
    midiState,
    selectOutput,
    testSelectedOutput,
  } from '../lib/midi.svelte.ts'

  const supported = isMidiSupported()
  const hardwareReady = $derived(isSelectedHardwareReady())

  function handleOutputChange(event: Event): void {
    selectOutput((event.target as HTMLSelectElement).value)
  }
</script>

<section class="device-card" class:connected={hardwareReady}>
  <div class="section-heading">
    <div>
      <p class="section-kicker">Hardware</p>
      <h2>{getDeviceLabel(midiState.selectedOutput)}</h2>
    </div>
    <span class="device-status" title={hardwareReady ? 'Launchpad ready' : 'Launchpad not connected'}>
      <span></span>
      {hardwareReady ? 'Ready' : 'Optional'}
    </span>
  </div>

  {#if midiState.outputs.length > 0}
    <label class="device-select">
      <span>Launchpad and output</span>
      <select value={midiState.selectedOutput?.id ?? ''} onchange={handleOutputChange}>
        {#each midiState.outputs as output (output.id)}
          <option value={output.id}>{getOutputLabel(output)}</option>
        {/each}
      </select>
      <small>Try each port; the correct one will flash the 8x8 grid.</small>
    </label>
  {/if}

  <p class="device-message" class:error={midiState.status === 'error'}>{midiState.statusMessage}</p>

  <div class="device-actions">
    <button
      class="connect-button"
      onclick={() => void connect()}
      disabled={!supported || midiState.status === 'connecting' || midiState.status === 'connected'}
    >
      {midiState.status === 'connecting'
        ? 'Connecting...'
        : hardwareReady
          ? 'Launchpad connected'
          : midiState.status === 'connected'
            ? 'MIDI access granted'
            : supported
              ? 'Connect Launchpad'
              : 'Web MIDI unavailable'}
    </button>

    {#if midiState.selectedOutput}
      <button class="test-output-button" onclick={testSelectedOutput}>Flash selected output</button>
    {/if}
  </div>
</section>
