<script lang="ts">
  import { connect, midiState } from '../lib/midi.svelte.ts'
  import { getOrCreateAudio, resumeAudio } from '../lib/audio.svelte.ts'

  async function handleConnect() {
    // Must create / resume AudioContext inside a user gesture
    getOrCreateAudio()
    resumeAudio()
    await connect()
  }
</script>

<div class="midi-connect">
  <button
    onclick={handleConnect}
    disabled={midiState.status === 'connected' || midiState.status === 'connecting'}
  >
    {midiState.status === 'connected'
      ? 'MIDI Connected'
      : midiState.status === 'connecting'
        ? 'Connecting…'
        : 'Connect MIDI'}
  </button>
  <p class="status-text" class:error={midiState.status === 'error'}>{midiState.statusMessage}</p>
</div>

<style>
  .midi-connect {
    margin-bottom: 1.5rem;
  }

  .status-text {
    font-size: 0.9rem;
    color: #aaaaaa;
    margin: 0.5rem 0 0;
  }

  .status-text.error {
    color: #ff6b6b;
  }
</style>
