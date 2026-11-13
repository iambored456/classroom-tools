<script lang="ts">
  import { onMount } from 'svelte'
  import { qrShare } from '@classroom-tools/qr-share'
  import TransformationsVisualization from './TransformationsVisualization.svelte'
  import SubstitutionVisualization from './SubstitutionVisualization.svelte'

  let substitutionOpen = $state(window.location.hash === '#substitution-visualization')
  let transformationsOpen = $state(window.location.hash === '#transformations-visualization')
  const toolOpen = $derived(substitutionOpen || transformationsOpen)
  let settingsOpen = $state(false)
  let substitution: { openSettings: () => void } | undefined = $state()
  let transformations: { openSettings: () => void } | undefined = $state()
  function syncRoute() {
    settingsOpen = false
    transformationsOpen = window.location.hash === '#transformations-visualization'
    substitutionOpen = window.location.hash === '#substitution-visualization'
    document.title = transformationsOpen ? 'Transformations Visualization · Numeracy Tools' : substitutionOpen ? 'Substitution Visualization · Numeracy Tools' : 'Numeracy Tools'
  }

  const themeKey = 'numeracy-tools.dark-mode'
  let darkMode = $state(true)
  const hubUrl = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:5173/`
    : new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname
  const tools = [
    { id: 'transformations-visualization', name: 'Transformations Visualization', topic: 'Functions', description: 'Move, stretch, and reflect a parabola by changing its equation.', image: '', color: '#dceaf1' },
    { id: 'substitution-visualization', name: 'Substitution Visualization', topic: 'Algebra', description: 'Unpack substitution, one animated step at a time.', image: '', color: '#e5dcf2' },
    { id: 'coordinates', name: 'Coordinates', topic: 'Coordinate geometry', description: 'Read and plot ordered pairs on a coordinate plane.', image: 'Coordinates-screenshot.png', color: '#d7ebf0' },
    { id: 'simple-compound-interest', name: 'Simple & Compound Interest', topic: 'Financial literacy', description: 'Compare how savings grow with simple and compound interest.', image: 'SimpleCompoundInterest-screenshot.png', color: '#f0e1d1' },
    { id: 'tax-brackets-marble-visual', name: 'Tax Brackets', topic: 'Financial literacy', description: 'Explore deductions, tax brackets, and take-home pay.', image: 'TaxBracketsMarbleVisual-screenshot.png', color: '#d6e9e2' },
  ]

  onMount(() => {
    syncRoute()
    try { darkMode = localStorage.getItem(themeKey) !== 'false' } catch { /* Use the default theme. */ }
  })

  function toggleTheme() {
    darkMode = !darkMode
    try { localStorage.setItem(themeKey, String(darkMode)) } catch { /* The theme still works for this visit. */ }
  }

  function fitCards(grid: HTMLElement) {
    function update() {
      const count = grid.childElementCount
      if (!count) return

      const style = getComputedStyle(grid)
      const bounds = grid.getBoundingClientRect()
      const width = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const height = bounds.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const gap = parseFloat(style.columnGap)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const maxColumns = Math.min(count, Math.max(1, Math.floor((width + gap) / (8.5 * rem + gap))))
      let columns = maxColumns
      let bestSize = 0

      for (let candidate = 1; candidate <= maxColumns; candidate++) {
        const rows = Math.ceil(count / candidate)
        const cardWidth = (width - (candidate - 1) * gap) / candidate
        const cardHeight = (height - (rows - 1) * gap) / rows
        if (cardHeight < 8 * rem) continue

        // Prefer the layout with the most room for previews and labels.
        const size = Math.min(cardWidth / 1.4, cardHeight)
        if (size > bestSize) {
          columns = candidate
          bestSize = size
        }
      }

      grid.style.setProperty('--columns', String(columns))
    }

    update()
    const resize = new ResizeObserver(update)
    resize.observe(grid)
    const cards = new MutationObserver(update)
    cards.observe(grid, { childList: true })
    return {
      destroy() {
        resize.disconnect()
        cards.disconnect()
      },
    }
  }

</script>

<svelte:window onhashchange={syncRoute} />

<div class="app" class:landing={!toolOpen} class:dark-mode={darkMode}>
    <header class="sets-header">
      <a class="icon-button" href={toolOpen ? "#" : hubUrl} aria-label={toolOpen ? "Return to Numeracy Tools" : "Return to Classroom Tools"} title={toolOpen ? "Numeracy Tools" : "Classroom Tools"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5M9.5 20v-6h5v6" /></svg>
      </a>
      <div class="header-actions">
      {#if toolOpen}
        <button class="icon-button" onclick={() => (transformationsOpen ? transformations : substitution)?.openSettings()} aria-label={transformationsOpen ? 'Transformation settings' : 'Equation settings'} aria-haspopup="dialog" aria-expanded={settingsOpen} title="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 3-.7 2.4-2 .9-2.3-.6-2 3.5 1.6 1.8v2l-1.6 1.8 2 3.5 2.3-.6 2 .9.7 2.4h5l.7-2.4 2-.9 2.3.6 2-3.5-1.6-1.8v-2l1.6-1.8-2-3.5-2.3.6-2-.9-.7-2.4Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      {/if}
      <button class="icon-button" type="button" title="Show QR code" use:qrShare={{
        app: 'numeracy-tools',
        title: transformationsOpen ? 'Transformations Visualization' : substitutionOpen ? 'Substitution Visualization' : 'Numeracy Tools',
        hash: transformationsOpen ? 'transformations-visualization' : substitutionOpen ? 'substitution-visualization' : '',
      }}></button>
      <button class="icon-button" onclick={toggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      </button>
      </div>
    </header>
  {#if transformationsOpen}
    <TransformationsVisualization bind:this={transformations} bind:settingsOpen />
  {:else if substitutionOpen}
    <SubstitutionVisualization bind:this={substitution} bind:settingsOpen />
  {:else}
  <main class="sets-main">
    <h1>Numeracy Tools</h1>
    <div class="set-grid" use:fitCards>
      {#each tools as tool (tool.id)}
        <a class="set-card" href={['substitution-visualization', 'transformations-visualization'].includes(tool.id) ? `#${tool.id}` : `${hubUrl}${tool.id}/`} aria-label={`Open ${tool.name}`}>
          <span class="set-preview" style={`--preview-background: ${tool.color}`}>
            {#if tool.id === 'transformations-visualization'}
              <svg class="card-art" viewBox="0 0 600 400" aria-hidden="true">
                <rect width="600" height="400" fill="#faf7ff" />
                <path d="M60 290H550M260 55V360" stroke="#afa6bd" stroke-width="2" />
                <path d="M110 65Q260 515 410 65" fill="none" stroke="#bdb1ce" stroke-width="4" stroke-dasharray="10 8" />
                <path d="M240 65Q360 375 480 65" fill="none" stroke="#7050b0" stroke-width="6" />
                <text x="300" y="370" text-anchor="middle" font-size="30" fill="#7050b0">y = a(x − h)² + k</text>
              </svg>
            {:else if tool.id === 'substitution-visualization'}
              <svg class="card-art" viewBox="0 0 600 400" aria-hidden="true">
                <rect width="600" height="400" fill="#faf7ff" />
                <text x="300" y="85" text-anchor="middle" font-size="39" font-weight="700" fill="#7050b0">y = −2x + 7</text>
                <path d="M365 115Q425 180 332 212" stroke="#a48ac7" stroke-width="5" stroke-dasharray="9 7" fill="none" />
                <text x="100" y="260" font-size="42" font-weight="700" fill="#252033">4x +</text>
                <text x="410" y="260" font-size="42" font-weight="700" fill="#252033">= 5</text>
                <rect x="250" y="209" width="120" height="75" rx="9" fill="#b5783e" stroke="#704323" stroke-width="4" />
                <path d="M250 215V200Q250 167 310 167Q370 167 370 200V215Z" fill="#dfaa66" stroke="#704323" stroke-width="4" />
                <path d="M269 183V282M351 183V282" stroke="#efce84" stroke-width="10" />
                <rect x="294" y="229" width="32" height="35" rx="4" fill="#ffe7a7" />
                <text x="310" y="255" text-anchor="middle" font-size="30" font-weight="700" fill="#553219">y</text>
                <text x="300" y="350" text-anchor="middle" font-size="23" fill="#766889">Same value. A different form.</text>
              </svg>
            {:else}
            <img src={`${hubUrl}images/${tool.image}`} alt="" width="1200" height="800" />
            {/if}
          </span>
          <span class="set-copy">
            <span class="set-count">{tool.topic}</span>
            <span class="set-title">{tool.name} <span aria-hidden="true">↗</span></span>
            <span class="set-bottom">{tool.description}</span>
          </span>
        </a>
      {/each}
    </div>
  </main>
  {/if}
</div>

<style>
  .header-actions { display: flex; align-items: center; gap: .6rem; }
</style>
