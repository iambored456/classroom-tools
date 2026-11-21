<script module lang="ts">
  export const studioModes = [
    { name: 'Explore', icon: 'explore', note: '' },
    { name: 'Practice', icon: 'game', note: 'Build, match, and convert quantities in a game of your own.' },
    { name: 'Classroom', icon: 'class', note: 'Project a prompt. Give everyone time to predict, then reveal the values.' }
  ] as const
</script>
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { setAppFullscreen } from '../fullscreen'
  import Workspace from './Workspace.svelte'
  import Practice from './Practice.svelte'
  import Icon from './Icon.svelte'
  import './studio.css'
  let { mode, simplifyFractions }: { mode: number; simplifyFractions: boolean } = $props()
  let studio: HTMLElement
  let full = $state(false), screenMessage = $state('')
  onDestroy(() => {
    if (full && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  })
  async function fullscreen() {
    try {
      await setAppFullscreen(studio, !document.fullscreenElement)
    } catch { screenMessage = 'Use the browser’s full-screen option to enlarge the classroom view.' }
  }
</script>
<svelte:document onfullscreenchange={() => full = !!document.fullscreenElement} />
<main aria-label="Fraction Studio" class="studio" bind:this={studio}>
  <div class="studio-inner">
    {#if studioModes[mode].note || full}
    <div class="mode-lead"><p>{studioModes[mode].note}</p>
      {#if (mode === 2 || full) && document.fullscreenEnabled}<button class="quiet" onclick={fullscreen}><Icon name="expand"/>{full ? 'Exit full screen' : 'Full screen'}</button>{/if}
    </div>
    {/if}
    {#if screenMessage && mode === 2}<p role="status">{screenMessage}</p>{/if}
    <div hidden={mode !== 0}><Workspace {simplifyFractions} /></div>
    <div hidden={mode !== 1}><Practice {simplifyFractions} /></div>
    <div hidden={mode !== 2}><Workspace classroom {simplifyFractions} /></div>
  </div>
</main>

