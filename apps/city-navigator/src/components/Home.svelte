<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { DirectionMode, RepresentationMode } from '../lib/types'

  export let directionMode: DirectionMode
  export let representation: RepresentationMode

  const dispatch = createEventDispatcher<{
    levels: void
    builder: void
    mode: DirectionMode
    representation: RepresentationMode
    export: void
    import: { file: File; mode: 'merge' | 'replace' }
  }>()
  let importMode: 'merge' | 'replace' = 'merge'
  const classroomToolsHref = (() => {
    const destination = new URL('..', window.location.href)
    const localDevelopment = destination.hostname === 'localhost' || destination.hostname === '127.0.0.1'
    if (localDevelopment && destination.port === '5185') destination.port = '5173'
    return destination.toString()
  })()

  const chooseFile = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (file) dispatch('import', { file, mode: importMode })
    input.value = ''
  }
</script>

<main class="home-screen">
  <header class="home-header">
    <div class="home-mark" aria-hidden="true">
      <span class="home-road vertical"></span><span class="home-road horizontal"></span><b>▲</b>
    </div>
    <div class="home-copy">
      <p class="eyebrow">Classroom navigation lab</p>
      <h1>City <em>Routes</em></h1>
    </div>
    <a class="title-home-button" href={classroomToolsHref} aria-label="Back to Classroom Learning Tools" title="Back to Classroom Learning Tools">
      <img
        src="assets/home-icon.svg"
        alt=""
        width="48"
        height="48"
        data-icon-source="music-learning-tools/packages/diatonic-compass-ui/public/assets/home-icon.svg"
      />
      <span>Home</span>
    </a>
  </header>

  <section class="home-actions">
    <button class="launch-card levels-launch" type="button" on:click={() => dispatch('levels')}>
      <span class="launch-icon">▦</span>
      <span><b>Choose a level</b></span>
      <i>→</i>
    </button>

    <button class="launch-card builder-launch" type="button" on:click={() => dispatch('builder')}>
      <span class="launch-icon">✎</span>
      <span><b>Level Builder</b></span>
      <i>→</i>
    </button>
  </section>

  <section class="setup-panel">
    <div class="setup-heading">
      <span>1</span>
      <div><h2>Direction mode</h2></div>
    </div>
    <div class="choice-grid direction-choices">
      <button class:active={directionMode === 'cardinal'} type="button" on:click={() => dispatch('mode', 'cardinal')}>
        <span class="compass-icon"><i>N</i><small>W&nbsp;&nbsp; E</small><i>S</i></span>
        <strong>Cardinal</strong><small>North · East · South · West</small>
      </button>
      <button class:active={directionMode === 'relative'} type="button" on:click={() => dispatch('mode', 'relative')}>
        <span class="turn-icon"><i>↰</i><b>↑</b><i>↱</i></span>
        <strong>Relative</strong><small>Left · Forward · Right · U-turn</small>
      </button>
    </div>
  </section>

  <section class="setup-panel representation-panel">
    <div class="setup-heading">
      <span>2</span>
      <div><h2>Direction symbols</h2></div>
    </div>
    <div class="choice-grid representation-choices">
      <button class:active={representation === 'letters'} type="button" on:click={() => dispatch('representation', 'letters')}><b>N</b><strong>Letters</strong></button>
      <button class:active={representation === 'arrows'} type="button" on:click={() => dispatch('representation', 'arrows')}><b>↑</b><strong>Arrows</strong></button>
      <button class:active={representation === 'letters-arrows'} type="button" on:click={() => dispatch('representation', 'letters-arrows')}><b>↑ N</b><strong>Both</strong></button>
    </div>
  </section>

  <section class="backup-bar">
    <div><strong>Your cities stay on this browser</strong><small>Download a backup before clearing browser data.</small></div>
    <button type="button" on:click={() => dispatch('export')}>⇩ Export JSON</button>
    <label class="import-button">⇧ Import JSON<input type="file" accept="application/json,.json" on:change={chooseFile} /></label>
    <select bind:value={importMode} aria-label="Import behaviour"><option value="merge">Merge</option><option value="replace">Replace</option></select>
  </section>
</main>
