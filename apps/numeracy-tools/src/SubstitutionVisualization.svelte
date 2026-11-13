<script lang="ts">
  import { watchMotionPreference } from '../../../packages/motion-preference/index'
  import { onMount } from 'svelte'
  import MathSvg from './MathSvg.svelte'
  import { buildLesson, defaultSystem, presets, systemPreview, validateSystem, lessonExpressions } from './math/system.js'
  import { mathWidth, layoutSolution, prepareMath, solutionEqualsX } from './math/layout'
  import { chestTransferPath, chestPose, expressionPose, phase, solutionPose, solutionLineOpacity, replacementSpacing } from './substitution'

  let lesson = $state(buildLesson(defaultSystem))
  let draft = $state({ ...defaultSystem })
  let settingsDialog: HTMLDialogElement
  let { settingsOpen = $bindable(false) }: { settingsOpen?: boolean } = $props()
  let applying = $state(false)
  let settingsError = $state('')
  const fragments = $derived(lesson.fragments)
  const steps = $derived(lesson.steps)
  const solutionLayout = $derived(layoutSolution(lesson.solutionLines))
  const solutionRows = $derived(solutionLayout.rows)
  const solutionSize = $derived(solutionLayout.size)
  const expressionSize = $derived(Math.min(54, 260 / mathWidth(fragments.expression, 54) * 54))
  const expressionWidth = $derived(mathWidth(fragments.expression, expressionSize))
  const prefixSize = $derived(Math.min(54, 210 / (mathWidth(fragments.prefix, 54) || 1) * 54))
  const equationGap = $derived(mathWidth(fragments.equals, solutionSize) / 2 + 12)
  const variableWidth = $derived(mathWidth(fragments.variable, 54))
  const equalsWidth = $derived(mathWidth(fragments.equals, 54))
  const expandedEqualsX = $derived(replacementSpacing(2, 1, variableWidth, expressionWidth, equalsWidth).equalsX)

  export function openSettings() {
    playing = false
    draft = { ...lesson.config }
    settingsError = ''
    settingsOpen = true
    settingsDialog.showModal()
  }

  function closeSettings() {
    settingsDialog.close()
  }

  async function applySettings(event: SubmitEvent) {
    event.preventDefault()
    settingsError = validateSystem(draft)
    if (settingsError) return
    applying = true
    try {
      const next = buildLesson(draft)
      await prepareMath(lessonExpressions(next))
      // Render the entire new lesson before swapping any visible state.
      layoutSolution(next.solutionLines)
      lesson = next
      reset()
      closeSettings()
    } catch {
      settingsError = 'The equations could not be prepared. Please try again.'
    } finally {
      applying = false
    }
  }

  let step = $state(0)
  let progress = $state(0)
  let playing = $state(false)
  let speed = $state(1)
  let reducedMotion = $state(false)
  const chest = $derived(chestPose(step, progress))
  const expression = $derived(expressionPose(step === 3 ? 2 : step, step === 3 ? 1 : progress))
  const spacing = $derived(replacementSpacing(step, progress, variableWidth, expressionWidth, equalsWidth))
  const solution = $derived(solutionPose(step === 3 ? progress : 0, solutionSize, expandedEqualsX))

  function selectStep(next: number) {
    step = Math.max(0, Math.min(steps.length - 1, next))
    progress = reducedMotion ? 1 : 0
    playing = !reducedMotion
  }

  function togglePlay() {
    if (progress >= 1) progress = 0
    playing = !playing
  }

  function scrub(event: Event) {
    playing = false
    progress = Number((event.target as HTMLInputElement).value) / 1000
  }

  function reset() {
    step = 0
    progress = 0
    playing = false
  }

  function keyboard(event: KeyboardEvent) {
    if (settingsOpen) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLElement && event.target.closest('button, input, select, a, textarea, [contenteditable]')) return
    if (event.code === 'Space') { event.preventDefault(); togglePlay() }
    if (event.key === 'ArrowRight') { event.preventDefault(); selectStep(step + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); selectStep(step - 1) }
    if (/^[1-9]$/.test(event.key) && Number(event.key) <= steps.length) selectStep(Number(event.key) - 1)
    if (event.key.toLowerCase() === 'r') reset()
  }

  onMount(() => {
    const stopWatchingMotion = watchMotionPreference(state => {
      reducedMotion = state.reducedMotion
      if (reducedMotion) playing = false
    })
    let frame: number
    let previous = 0
    function tick(now: number) {
      const elapsed = previous ? Math.min(now - previous, 80) : 0
      previous = now
      if (playing) {
        progress = Math.min(1, progress + elapsed * speed / steps[step].duration)
        if (progress === 1) playing = false
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); stopWatchingMotion() }
  })
</script>

<svelte:window onkeydown={keyboard} />

<main class="substitution" aria-label="Substitution Visualization">
  <dialog class="settings-dialog" bind:this={settingsDialog} aria-labelledby="settings-title" onclose={() => { settingsOpen = false }} oncancel={(event) => { if (applying) event.preventDefault() }}>
    <form onsubmit={applySettings}>
      <div class="settings-heading"><h2 id="settings-title">Equation settings</h2><button type="button" class="close-settings" onclick={closeSettings} disabled={applying} aria-label="Close settings">×</button></div>
      <fieldset disabled={applying} class="preset-fieldset">
        <legend>Try an example</legend>
        <div class="preset-list">
          {#each presets as preset}
            <button type="button" class="preset" aria-pressed={JSON.stringify(draft) === JSON.stringify(preset.config)} onclick={() => { draft = { ...preset.config }; settingsError = '' }}>
              <strong>{preset.name}</strong>
              {#each systemPreview(preset.config) as equation}<span>{equation}</span>{/each}
            </button>
          {/each}
        </div>
      </fieldset>
      <fieldset disabled={applying} class="custom-equations">
        <legend>Change the values</legend>
        <label class="variable-choice">Isolated variable <select bind:value={draft.variable}><option value="y">y</option><option value="x">x</option></select></label>
        <p class="field-label">First equation</p>
        <div class="equation-fields first-fields">
          <span>{draft.variable} =</span>
          <input type="number" min="-20" max="20" step="1" required bind:value={draft.m} aria-label="First equation variable coefficient" />
          <span>{draft.variable === 'y' ? 'x' : 'y'} +</span>
          <input type="number" min="-20" max="20" step="1" required bind:value={draft.b} aria-label="First equation constant" />
        </div>
        <p class="field-label">Second equation</p>
        <div class="equation-fields second-fields">
          <input type="number" min="-20" max="20" step="1" required bind:value={draft.a} aria-label="Second equation other variable coefficient" />
          <span>{draft.variable === 'y' ? 'x' : 'y'} +</span>
          <input type="number" min="-20" max="20" step="1" required bind:value={draft.c} aria-label="Second equation substituted variable coefficient" />
          <span>{draft.variable} =</span>
          <input type="number" min="-20" max="20" step="1" required bind:value={draft.d} aria-label="Second equation right-hand value" />
        </div>
        <p class="settings-hint">Whole numbers from −20 to 20. Negative values are welcome.</p>
      </fieldset>
      {#if settingsError}<p class="settings-error" role="alert">{settingsError}</p>{/if}
      <div class="settings-actions"><button type="button" onclick={closeSettings} disabled={applying}>Cancel</button><button type="submit" class="apply-settings" disabled={applying}>{applying ? 'Preparing…' : 'Apply equations'}</button></div>
    </form>
  </dialog>

  <div class="stage">
    <svg class="scene" viewBox="0 0 1000 510" role="img" aria-labelledby="scene-title scene-description">
      <title id="scene-title">{steps[step].title}</title>
      <desc id="scene-description">{steps[step].text} {step === 3 ? solutionRows.map(line => line.description).join(' ') : ''} End of step: {steps[step].result}</desc>
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d29b58" /><stop offset="1" stop-color="#925528" /></linearGradient>
        <linearGradient id="lid-wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#edbd78" /><stop offset="1" stop-color="#ad6e35" /></linearGradient>
        <filter id="chest-shadow" x="-50%" y="-60%" width="200%" height="240%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-opacity=".2" /></filter>
      </defs>

      {#if step <= 3}
        <g class="substitution-equation" transform={`translate(${solution.x} ${solution.y}) scale(${solution.scale})`}>
        <g class="equation" text-anchor="middle">
          <g opacity={1 - phase(step === 0 ? progress : 1, .02, .2)}>
            <g class="accent source-y"><MathSvg tex={fragments.variable} x={270} y={145} /></g><MathSvg tex={fragments.equals} x={350} y={145} />
          </g>
          {#if fragments.prefix}<MathSvg tex={fragments.prefix} x={spacing.prefixEnd} y={355} size={prefixSize} anchor="end" />{/if}
          <g class="accent target-y" opacity={step === 0 ? 1 : step === 1 ? 1 - phase(progress, .65, .92) : 0}><MathSvg tex={fragments.variable} x={420} y={355} /></g>
          <MathSvg tex={fragments.equals} x={spacing.equalsX} y={355} />
          <MathSvg tex={fragments.rhs} maxWidth={140} x={spacing.equalsX + equalsWidth / 2 + 12} y={355} anchor="start" />
          {#if step === 1}
            <path d={chestTransferPath} class="travel-guide" opacity={Math.sin(progress * Math.PI)} />
          {/if}
        </g>

        <g class="chest" transform={`translate(${chest.x} ${chest.y}) rotate(${chest.rotation})`} opacity={chest.opacity} filter="url(#chest-shadow)">
          <rect x="-50" y="-38" width="100" height="12" rx="3" fill="#42291d" />
          <rect x="-50" y="-32" width="100" height="82" rx="3" fill="url(#wood)" stroke="#653c22" stroke-width="3" />
          <path d="M-48-6H48M-48 24H48" fill="none" stroke="#88542e" stroke-width="2" />
          <path d="M-42-32V49M42-32V49" stroke="#e9bd71" stroke-width="7" />
          <rect x="-33" y="-22" width="66" height="64" rx="3" fill="#f6df9d" stroke="#714a25" stroke-width="2" />
          <g class="chest-label"><MathSvg tex={fragments.variable} y={20} /></g>
          <g transform={`rotate(${-chest.lid} -50 -32)`}>
            <rect x="-50" y="-50" width="100" height="18" rx="3" fill="url(#lid-wood)" stroke="#653c22" stroke-width="3" />
            <path d="M-42-49V-33M42-49V-33" stroke="#e9bd71" stroke-width="7" />
          </g>
        </g>

        {#if step !== 1}
          <g class="equation accent" text-anchor="middle" transform={`translate(${expression.x} ${expression.y}) scale(${expression.scale})`} opacity={expression.opacity}>
            <rect x={-expressionWidth / 2 - 30} y="-40" width={expressionWidth + 60} height="74" rx="15" class="expression-background" opacity={expression.brackets * .95} />
            <g opacity={expression.brackets}>
              <MathSvg tex={fragments.leftBracket} x={-expressionWidth / 2 - 12} y={20} />
              <MathSvg tex={fragments.rightBracket} x={expressionWidth / 2 + 12} y={20} />
            </g>
            <MathSvg tex={fragments.expression} y={20} size={expressionSize} />
          </g>
        {/if}
        </g>
        {#if step === 3}
          <g class="solution-lines" text-anchor="middle">
            {#each solutionRows as line, index}
              {@const reveal = solutionLineOpacity(progress, index)}
              <g class="solution-line" class:accent={line.accent} transform={`translate(0 ${8 * (1 - reveal)})`} opacity={reveal}>
                <MathSvg tex={line.left} x={solutionEqualsX - equationGap} y={line.baseline} size={solutionSize} anchor="end" />
                <MathSvg tex={fragments.equals} x={solutionEqualsX} y={line.baseline} size={solutionSize} />
                <MathSvg tex={line.right} x={solutionEqualsX + equationGap} y={line.baseline} size={solutionSize} anchor="start" />
              </g>
            {/each}
          </g>
        {/if}
      {:else}
        <text class="label" x="80" y="55">ONE SOLUTION. BOTH EQUATIONS.</text>
        <g class="accent"><MathSvg tex={fragments.solution} x={500} y={145} maxWidth={750} maxHeight={85} /></g>
        <g opacity={phase(progress, .08, .5)}>
          <rect class="operation" x="95" y="215" width="390" height="165" rx="18" />
          <MathSvg tex={fragments.firstEquation} x={290} y={267} size={30} maxWidth={340} maxHeight={40} />
          <MathSvg tex={fragments.firstCheck} x={290} y={313} size={30} maxWidth={340} maxHeight={40} />
          <g class="accent"><MathSvg maxWidth={208} tex={fragments.firstTrue} x={275} y={355} size={30} maxHeight={40} /><text class="check" x="422" y="355">✓</text></g>
        </g>
        <g opacity={phase(progress, .48, .92)}>
          <rect class="operation" x="515" y="215" width="390" height="165" rx="18" />
          <MathSvg tex={fragments.secondEquation} x={710} y={267} size={30} maxWidth={340} maxHeight={40} />
          <MathSvg tex={fragments.secondCheck} x={710} y={313} size={30} maxWidth={340} maxHeight={40} />
          <g class="accent"><MathSvg maxWidth={208} tex={fragments.secondTrue} x={695} y={355} size={30} maxHeight={40} /><text class="check" x="842" y="355">✓</text></g>
        </g>
        <text class="note" x="500" y="455" text-anchor="middle">The solution makes both equations true.</text>
      {/if}
    </svg>
  </div>

  <section class="controls" aria-label="Animation controls">
    <nav class="steps" aria-label="Solution steps" style={`--step-count: ${steps.length}`}>
      {#each steps as item, index}
        <button class:active={index === step} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${item.title}`} onclick={() => selectStep(index)}><span>{index + 1}</span>{item.short}</button>
      {/each}
    </nav>
    <div class="sr-only" aria-live="polite" aria-atomic="true"><h2>{steps[step].title}</h2><p>{steps[step].text}</p></div>
    <div class="transport">
      <label class="speed"><span class="sr-only">Animation speed</span><select bind:value={speed} aria-label="Animation speed"><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
      <button class="secondary" onclick={() => selectStep(step - 1)} disabled={step === 0} aria-label="Previous step">← <span>Previous</span></button>
      <div class="scrubber"><label class="sr-only" for="substitution-progress">Step progress</label><input id="substitution-progress" type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} oninput={scrub} aria-valuetext={`${Math.round(progress * 100)} percent of step ${step + 1}`} /><output aria-live="off">{Math.round(progress * 100)}%</output></div>
      <button class="play" onclick={togglePlay} aria-label={playing ? 'Pause animation' : progress >= 1 ? 'Replay step' : 'Play animation'}>{playing ? 'Ⅱ Pause' : progress >= 1 ? '↺ Replay' : '▶ Play'}</button>
      <button class="next" onclick={() => step === steps.length - 1 ? reset() : selectStep(step + 1)}>{step === steps.length - 1 ? 'Start again ↺' : 'Next step →'}</button>
    </div>
    <p class="sr-only" role="status">{progress === 1 ? steps[step].result : ''}</p>
  </section>
</main>

<style>
  .substitution { --accent: #7050b0; --tint: #f0eaf9; width: min(100%, 1200px); margin: auto; padding: 0 clamp(.75rem, 3vw, 2rem) 1.5rem; }
  :global(.dark-mode) .substitution { --accent: #c8b0ff; --tint: #2c243d; }
  button, select { border: 1px solid var(--line); border-radius: 10px; background: var(--paper); color: var(--ink); padding: .65rem .9rem; font: inherit; }
  button:hover { background: var(--soft); }
  button:disabled { opacity: .35; }
  .settings-dialog { width: min(36rem, calc(100vw - 1.5rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 1.25rem; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); color: var(--ink); }
  .settings-dialog::backdrop { background: #0008; }
  .settings-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .settings-heading h2 { margin: 0; font-size: 1.4rem; }
  .close-settings { font-size: 1.5rem; padding: .15rem .65rem; }
  fieldset { min-width: 0; padding: .75rem; margin: 0 0 1rem; border: 1px solid var(--line); border-radius: 10px; }
  legend { font-weight: 700; padding: 0 .3rem; }
  .preset-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
  .preset { display: grid; gap: .15rem; text-align: left; padding: .65rem; font-size: .85rem; }
  .preset strong { margin-bottom: .2rem; }
  .preset span { color: var(--muted); }
  .preset[aria-pressed=true] { border-color: var(--accent); background: var(--tint); }
  .variable-choice { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }
  .field-label { margin: .8rem 0 .4rem; color: var(--muted); font-size: .8rem; }
  .equation-fields { display: grid; align-items: center; gap: .4rem; }
  .first-fields { grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr); }
  .second-fields { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); }
  .equation-fields input { width: 100%; min-width: 0; padding: .5rem .3rem; border: 1px solid var(--line); border-radius: 7px; background: var(--canvas); color: var(--ink); cursor: text; }
  .settings-hint { margin: .8rem 0 0; color: var(--muted); font-size: .75rem; }
  .settings-error { color: var(--ink); border-left: 3px solid var(--accent); padding-left: .7rem; }
  .settings-actions { display: flex; justify-content: flex-end; gap: .6rem; }
  .apply-settings { background: var(--tint); border-color: var(--accent); color: var(--accent); font-weight: 700; }
  .stage { border: 1px solid var(--line); border-radius: 20px; background: var(--paper); overflow: hidden; }
  .scene { display: block; width: 100%; max-height: 62dvh; min-height: 245px; }
  .equation { font-size: 54px; font-weight: 700; fill: var(--ink); }
  .chest-label { color: #4b2c18; }
  .accent { fill: var(--accent); color: var(--accent); }
  .label { font-size: 16px; letter-spacing: 2px; font-weight: 700; fill: var(--muted); }
  .note { font-size: 22px; font-weight: 400; fill: var(--muted); }
  .travel-guide { stroke: var(--accent); stroke-width: 3; fill: none; stroke-dasharray: 8 8; }
  .expression-background, .operation { fill: var(--tint); }
  .check { fill: var(--accent); font-weight: 700; font-size: 28px; }
  .controls { margin-top: 1rem; }
  .steps { display: grid; grid-template-columns: repeat(var(--step-count), 1fr); gap: .45rem; }
  .steps button { display: flex; justify-content: center; align-items: center; gap: .5rem; padding: .6rem .35rem; font-size: .85rem; color: var(--muted); }
  .steps button span { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--soft); font-weight: 700; }
  .steps button.active { color: var(--accent); border-color: var(--accent); background: var(--tint); }
  .steps button.active span { background: var(--accent); color: var(--paper); }
  .transport { display: flex; gap: .6rem; align-items: center; margin-top: .8rem; }
  .play { min-width: 6.3rem; font-weight: 700; background: var(--tint); color: var(--accent); border-color: var(--accent); }
  .scrubber { display: flex; flex: 1; align-items: center; min-width: 80px; gap: .65rem; }
  input { width: 100%; accent-color: var(--accent); min-width: 30px; cursor: pointer; }
  output { font-size: .75rem; width: 3em; flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
  .next { font-weight: 700; white-space: nowrap; }
  .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
  @media (max-width: 680px) {
    .scene { min-height: 0; max-height: none; }
    .steps { gap: .25rem; }
    .steps button { flex-direction: column; gap: .3rem; font-size: .66rem; padding: .4rem .1rem; }
    .steps button span { width: 1.35rem; height: 1.35rem; }
    .transport { flex-wrap: wrap; }
    .scrubber { flex-basis: calc(100% - 8rem); order: -1; }
    .speed { order: -1; }
    .transport > button { flex: 1; padding: .6rem .4rem; font-size: .85rem; }
  }
</style>
