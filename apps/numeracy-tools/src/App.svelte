<script lang="ts">
  import { onMount } from 'svelte'
  import { qrShare } from '@classroom-tools/qr-share'
  import TransformationsVisualization from './TransformationsVisualization.svelte'
  import SubstitutionVisualization from './SubstitutionVisualization.svelte'
  import ZerosCannonball from './ZerosCannonball.svelte'
  import { defaultExample, factorQuadratic } from './zeros-cannonball'

  import Studio, { studioModes } from './fraction-studio/Studio.svelte'
  import StudioIcon from './fraction-studio/Icon.svelte'
  let studioMode = $state(0)

  const studioRoute = 'fraction-studio'
  let studioOpen = $state(window.location.hash === '#' + studioRoute)
  const diagnosticRoute = 'cycle-4-diagnostic'
  const diagnosticTitle = 'Cycle 4 Math Diagnostic'
  let substitutionOpen = $state(window.location.hash === '#substitution-visualization')
  let transformationsOpen = $state(window.location.hash === '#transformations-visualization')
  let zerosOpen = $state(window.location.hash === '#zeros-cannonball')
  let diagnosticOpen = $state(window.location.hash === `#${diagnosticRoute}`)
  let diagnosticComponent: Promise<typeof import('./diagnostic/Diagnostic.svelte')> | undefined = $state()
  const toolOpen = $derived(studioOpen || substitutionOpen || transformationsOpen || zerosOpen || diagnosticOpen)
  const toolTitle = $derived(studioOpen ? 'Fraction Studio' : transformationsOpen ? 'Transformations Visualization' : substitutionOpen ? 'Substitution Visualization' : zerosOpen ? 'Zeros Cannonball' : diagnosticOpen ? diagnosticTitle : '')
  let settingsOpen = $state(false)
  let substitution: { openSettings: () => void } | undefined = $state()
  let transformations: { openSettings: () => void } | undefined = $state()
  let zeros: { openSettings: () => void } | undefined = $state()
  let zerosLesson = $state(factorQuadratic(defaultExample))
  function syncRoute() {
    settingsOpen = false
    studioOpen = window.location.hash === '#' + studioRoute
    if (!studioOpen) studioMode = 0
    transformationsOpen = window.location.hash === '#transformations-visualization'
    substitutionOpen = window.location.hash === '#substitution-visualization'
    zerosOpen = window.location.hash === '#zeros-cannonball'
    if (!zerosOpen) zerosLesson = factorQuadratic(defaultExample)
    diagnosticOpen = window.location.hash === `#${diagnosticRoute}`
    if (diagnosticOpen) diagnosticComponent ??= import('./diagnostic/Diagnostic.svelte')
    document.title = toolTitle ? `${toolTitle} · Numeracy Tools` : 'Numeracy Tools'
  }

  const themeKey = 'numeracy-tools.dark-mode'
  let darkMode = $state(true)
  const hubUrl = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:5173/`
    : new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname
  const featuredTools = [
    { id: 'numberle', name: 'Numberle', topic: 'Math', description: 'Guess the hidden equation in six tries. Daily, unlimited, and teacher-set math puzzles.', image: 'Numberle-preview.svg', color: '#d5eadc' },
    { id: 'open-middle', name: 'Open Middle Math', topic: 'Math', description: 'Solve interactive, open-ended math problems.', image: 'OpenMiddle-preview.svg', color: '#e5dcf2' },
  ]
  const tools = [
    { id: studioRoute, name: 'Fraction Studio', topic: 'Workplace numeracy', description: 'Paint tiles and practise fractions, decimals, percents, and money.', image: '', color: '#d8e9d9' },
    { id: 'transformations-visualization', name: 'Transformations Visualization', topic: 'Functions', description: 'Move, stretch, and reflect a parabola by changing its equation.', image: '', color: '#dceaf1' },
    { id: 'substitution-visualization', name: 'Substitution Visualization', topic: 'Algebra', description: 'Unpack substitution, one animated step at a time.', image: '', color: '#e5dcf2' },
    { id: 'zeros-cannonball', name: 'Zeros Cannonball', topic: 'Quadratics', description: 'Factor, find the zeros, and fire a cannonball along a parabola.', image: '', color: '#f0e3cb' },
    { id: diagnosticRoute, name: diagnosticTitle, topic: 'Grade 10 Academic Mathematics', description: 'Check factoring skills and build your next-practice checklist.', image: '', color: '#d5eadc' },
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
      const style = getComputedStyle(grid)
      const bounds = grid.getBoundingClientRect()
      const width = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const height = bounds.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const gap = parseFloat(style.columnGap)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const maxColumns = Math.min(tools.length, Math.max(1, Math.floor((width + gap) / (8.5 * rem + gap))))
      let columns = maxColumns
      let bestSize = 0

      for (let candidate = 1; candidate <= maxColumns; candidate++) {
        const rows = Math.ceil(featuredTools.length / candidate) + Math.ceil(tools.length / candidate)
        const cardWidth = (width - (candidate - 1) * gap) / candidate
        // The divider adds a 1px track and one extra gap.
        const cardHeight = (height - 1 - rows * gap) / rows
        if (cardHeight < 8 * rem) continue

        // Prefer the layout with the most room for previews and labels.
        const size = Math.min(cardWidth / 1.4, cardHeight)
        if (size > bestSize) {
          columns = candidate
          bestSize = size
        }
      }

      grid.style.setProperty('--columns', String(columns))
      grid.style.setProperty('--featured-rows', String(Math.ceil(featuredTools.length / columns)))
    }

    update()
    const resize = new ResizeObserver(update)
    resize.observe(grid)
    return {
      destroy() {
        resize.disconnect()
      },
    }
  }

</script>

<svelte:window onhashchange={syncRoute} />

<div class="app" class:landing={!toolOpen} class:dark-mode={darkMode}>
    <header class="sets-header" class:studio-header={studioOpen} class:transformations-header={transformationsOpen} class:zeros-header={zerosOpen}>
      <a class="icon-button" href={toolOpen ? "#" : hubUrl} aria-label={toolOpen ? "Return to Numeracy Tools" : "Return to Classroom Tools"} title={toolOpen ? "Numeracy Tools" : "Classroom Tools"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5M9.5 20v-6h5v6" /></svg>
      </a>
      {#if studioOpen}
        <nav class="studio-tabs" aria-label="Studio mode">
          {#each studioModes as item, i}
            <button aria-pressed={studioMode === i} onclick={() => studioMode = i}><StudioIcon name={item.icon}/>{item.name}</button>
          {/each}
        </nav>
      {/if}
      {#if zerosOpen}
        <button class="equation-button" onclick={() => zeros?.openSettings()} aria-label="Change equation" aria-haspopup="dialog" aria-expanded={settingsOpen}>
          y = {zerosLesson.standard}<span aria-hidden="true">✎</span>
        </button>
      {/if}
      <div class="header-actions">
      {#if transformationsOpen || substitutionOpen || zerosOpen}
        <button class="icon-button" onclick={() => (transformationsOpen ? transformations : zerosOpen ? zeros : substitution)?.openSettings()} aria-label={transformationsOpen ? 'Transformation settings' : 'Equation settings'} aria-haspopup="dialog" aria-expanded={settingsOpen} title="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 3-.7 2.4-2 .9-2.3-.6-2 3.5 1.6 1.8v2l-1.6 1.8 2 3.5 2.3-.6 2 .9.7 2.4h5l.7-2.4 2-.9 2.3.6 2-3.5-1.6-1.8v-2l1.6-1.8-2-3.5-2.3.6-2-.9-.7-2.4Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      {/if}
      <button class="icon-button" type="button" title="Show QR code" use:qrShare={{
        app: 'numeracy-tools',
        title: toolTitle || 'Numeracy Tools',
        hash: studioOpen ? studioRoute : transformationsOpen ? 'transformations-visualization' : substitutionOpen ? 'substitution-visualization' : zerosOpen ? 'zeros-cannonball' : diagnosticOpen ? diagnosticRoute : '',
      }}></button>
      <button class="icon-button" onclick={toggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      </button>
      </div>
    </header>
  {#if studioOpen}
    <Studio mode={studioMode} />
  {:else if transformationsOpen}
    <TransformationsVisualization bind:this={transformations} bind:settingsOpen />
  {:else if substitutionOpen}
    <SubstitutionVisualization bind:this={substitution} bind:settingsOpen />
  {:else if zerosOpen}
    <ZerosCannonball bind:this={zeros} bind:settingsOpen bind:lesson={zerosLesson} />
  {:else if diagnosticOpen}
    {#if diagnosticComponent}
      {#await diagnosticComponent}
        <p class="diagnostic-loading" role="status">Loading the diagnostic…</p>
      {:then { default: Diagnostic }}
        <Diagnostic />
      {:catch}
        <p class="diagnostic-loading" role="alert">The diagnostic could not load. Refresh the page to try again.</p>
      {/await}
    {/if}
  {:else}
  <main class="sets-main">
    <h1>Numeracy Tools</h1>
    <div class="set-grid" use:fitCards>
      {#each [...featuredTools, ...tools] as tool, index (tool.id)}
        {#if index === featuredTools.length}
          <hr class="set-divider" />
        {/if}
        <a class="set-card" href={tool.image ? `${hubUrl}${tool.id}/` : `#${tool.id}`} aria-label={`Open ${tool.name}`}>
          <span class="set-preview" style={`--preview-background: ${tool.color}`}>
            {#if tool.id === studioRoute}
              <div class="text-preview studio-preview" aria-hidden="true">
                <i></i><span>¾ = 75%</span>
              </div>
            {:else if tool.id === 'transformations-visualization'}
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
            {:else if tool.id === 'zeros-cannonball'}
              <svg class="card-art" viewBox="0 0 600 400" aria-hidden="true">
                <rect width="600" height="400" fill="#fffaf0" />
                <path d="M45 290H555M260 55V340" stroke="#bdb3a0" stroke-width="2" />
                <path d="M130 290Q300-100 470 290" fill="none" stroke="#7050b0" stroke-width="6" />
                <g transform="translate(130 290) rotate(-48)"><rect x="-85" y="-20" width="85" height="40" rx="12" fill="#586579" stroke="#273346" stroke-width="4" /><rect x="-14" y="-24" width="15" height="48" rx="4" fill="#8998ab" /></g>
                <circle cx="95" cy="305" r="24" fill="#e4b57b" stroke="#754929" stroke-width="6" />
                <circle cx="95" cy="305" r="7" fill="#754929" />
                <circle cx="345" cy="109" r="13" fill="#273346" />
                <circle cx="470" cy="290" r="8" fill="#7050b0" />
                <text x="130" y="360" text-anchor="middle" font-size="28" fill="#7050b0">(−2, 0)</text>
                <text x="470" y="360" text-anchor="middle" font-size="28" fill="#7050b0">(4, 0)</text>
                <text x="300" y="45" text-anchor="middle" font-size="29" fill="#7050b0">y = −(x + 2)(x − 4)</text>
              </svg>
            {:else if tool.id === diagnosticRoute}
              <div class="text-preview diagnostic-preview" aria-hidden="true">
                <span>x² − 5x + 6 = 0</span>
                <span>(x − 2)(x − 3) = 0</span>
              </div>
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
  .studio-preview { display: flex; align-items: center; justify-content: center; gap: .45em; background: #f9faf0; color: #153f31; font-size: clamp(1rem, min(13cqw, 21cqh), 3rem); }
  .studio-preview i { width: 1.75em; height: 1.75em; border-radius: 50%; background: conic-gradient(#39a58b 75%, #e3dcc7 0); }
  .studio-header { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:.5rem; }
  .studio-header > a { justify-self:start; }
  .studio-header .header-actions { justify-self:end; }
  .studio-tabs { display:flex; align-items:center; padding:.2rem; border:1px solid var(--line); border-radius:.95rem; background:var(--paper); gap:.15rem; }
  .studio-tabs button { display:flex; align-items:center; justify-content:center; gap:.4rem; min-height:2.4rem; padding:.35rem .75rem; border:0; border-radius:.65rem; font-size:.9rem; font-weight:700; color:var(--muted); background:transparent; }
  .studio-tabs button[aria-pressed=true] { background:#086449; color:white; }
  .dark-mode .studio-tabs button[aria-pressed=true] { background:#a5e2ba; color:#142b21; }
  .app:fullscreen { overflow:auto; }
  @media (max-width:40rem) {
    .studio-header { grid-template-columns:1fr auto; }
    .studio-header .header-actions { grid-column:2; grid-row:1; }
    .studio-tabs { grid-row:2; grid-column:1/-1; justify-self:center; max-width:100%; }
    .studio-tabs button { padding-inline:clamp(.3rem,2vw,.75rem); }
  }
  .header-actions { display: flex; align-items: center; gap: .6rem; }
  .zeros-header { display: grid; grid-template-columns: minmax(10.2rem, 1fr) minmax(0, 44rem) minmax(10.2rem, 1fr); align-items: center; column-gap: 1rem; }
  .zeros-header > a { justify-self: start; }
  .zeros-header .header-actions { justify-self: end; }
  .equation-button {
    display: flex; align-items: center; justify-self: center; gap: 1rem;
    max-width: 100%; padding: .6rem .8rem; border: 1px solid var(--line); border-radius: 10px;
    background: var(--paper); color: var(--ink); font-size: clamp(.85rem, 2vw, 1.15rem); text-align: center;
  }
  .equation-button:hover { background: var(--soft); }
  .equation-button span { color: #7050b0; }
  .dark-mode .equation-button span { color: #c8b0ff; }
  @media (max-width: 42rem) {
    .zeros-header { grid-template-columns: 1fr auto; row-gap: .75rem; }
    .equation-button { grid-column: 1 / -1; grid-row: 2; }
  }
  .transformations-header { padding-bottom: 0; }
  .diagnostic-loading { margin: 1.5rem auto; width: min(90%, 68rem); }
  .diagnostic-preview {
    align-content: center;
    gap: .48em;
    color: #225b50;
    background: #f6fbf5;
    box-shadow: 5px 8px 0 #a5c7b3, 9px 15px 24px #352b1c24;
    font-size: clamp(.9rem, min(10cqw, 16cqh), 2.35rem);
    font-weight: 700;
  }
  .diagnostic-preview span + span { padding-top: .35em; border-top: 1px solid #a5c7b3; }
</style>
