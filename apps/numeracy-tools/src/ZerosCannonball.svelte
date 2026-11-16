<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { watchMotionPreference } from '../../../packages/motion-preference/index'
  import { defaultExample, examples, factorQuadratic, flightPoint, graphGeometry, numberText, type FactoredQuadratic, type Quadratic } from './zeros-cannonball'
  import OspreyScene from './OspreyScene.svelte'
  import RollerCoasterScene from './RollerCoasterScene.svelte'
  import { equationForAnimation, ospreyPose, type AnimationMode } from './osprey'

  let { settingsOpen = $bindable(false), lesson = $bindable() }: { settingsOpen?: boolean; lesson: FactoredQuadratic } = $props()
  let draft: Quadratic = $state({ ...defaultExample })
  let animation = $state<AnimationMode>('rollercoaster')
  const isOsprey = $derived(animation === 'osprey')
  const isCoaster = $derived(animation === 'rollercoaster')
  let dialog: HTMLDialogElement
  let error = $state('')
  let step = $state(0)
  let progress = $state(0)
  let playing = $state(false)
  let flight = $state(0)
  let firing = $state(false)
  const isAnimating = $derived(step === 3 ? firing : playing)
  const playbackComplete = $derived((step === 3 ? flight : progress) === 1)
  const playbackLabel = $derived(isAnimating ? 'Pause' : playbackComplete ? 'Replay' : 'Play')
  let hasFired = $state(false)
  let reducedMotion = $state(false)
  let graphWidth = $state(960)
  let stage = $state<HTMLElement>()
  let zeroEquation = $state<HTMLParagraphElement>()
  let factorStart = $state<HTMLParagraphElement>()
  let factorFinish = $state<HTMLDivElement>()
  let solveStart = $state<HTMLParagraphElement>()
  let equationHandoff = $state<{ x: number; y: number; scale: number }>()
  type GraphToken = { id: string; text: string; box: DOMRect; fontSize: number }
  type TokenPosition = { x: number; y: number; fontSize: number }
  let graphMoves = $state<{ id: string; text: string; from: TokenPosition; to: TokenPosition }[]>([])
  const graphHandoffActive = $derived(!reducedMotion && progress < 1 && graphMoves.length > 0)
  const graphTravel = $derived(progress ** 2 * (3 - 2 * progress))
  const movingTo = (id: string) => graphHandoffActive && graphMoves.some(move => move.id === id)
  const travelBetween = (from: number, to: number) => from + (to - from) * graphTravel
  const handoffEnd = .14
  const handoffProgress = $derived(reducedMotion || !equationHandoff ? 1 : Math.min(1, progress / handoffEnd))
  const handoffRemaining = $derived(1 - handoffProgress ** 2 * (3 - 2 * handoffProgress))
  const handoffTransform = $derived(equationHandoff && handoffRemaining
    ? `translate(${equationHandoff.x * handoffRemaining}px, ${equationHandoff.y * handoffRemaining}px) scale(${1 + (equationHandoff.scale - 1) * handoffRemaining})`
    : undefined)
  const revealProgress = $derived(equationHandoff && !reducedMotion ? Math.max(0, (progress - handoffEnd) / (1 - handoffEnd)) : progress)
  const steps = ['Standard form', 'Factor', 'Find the zeros', 'Visualization']
  const lessonHeadings = [
    'Step 1: Set y = 0',
    'Step 2: Factor the trinomial.',
    'Step 3: i) Separate each factor and set them equal to zero, ii) solve both for x.',
    'Visualization',
  ]
  const graph = $derived(graphGeometry(lesson, graphWidth))
  const osprey = $derived(ospreyPose(graph, flight))
  const pathProgress = $derived(isOsprey ? osprey.curveProgress : flight)
  const ball = $derived(graph.point(flight))
  const position = $derived(flightPoint(lesson, pathProgress))
  const flipped = $derived(lesson.a > 0)
  const labelOffset = $derived(flipped ? -90 : 90)
  const reveal = (index: number, count: number, time = progress) => reducedMotion && step !== 0 ? 1 : Math.max(0, Math.min(1, time * (count + .5) - index))
  const ospreyStatus = $derived(!hasFired ? 'Ready. Click the osprey or press Play.' : flight === 1 ? 'The osprey caught the fish, surfaced at the right zero, and flew away.'
    : `${firing ? '' : 'Paused. '}${osprey.phase === 'approach' ? 'Approaching the water.' : osprey.phase === 'dive' ? 'Diving below the water surface.' : osprey.phase === 'catch' ? 'Catching the fish at the vertex.' : osprey.phase === 'swim' ? 'Swimming back up with the fish.' : 'Flying away with the fish.'}`)
  const coasterStatus = $derived(!hasFired ? '' : flight === 1
    ? `Ride complete at (${lesson.factors[1].rootLabel}, 0). Both stations have y = 0.`
    : firing ? 'Riding the parabolic track.' : `Ride paused at x = ${position.x.toFixed(2)}, y = ${position.y.toFixed(2)}. Resume or scrub to explore.`)
  const status = $derived(step !== 3 ? '' : isOsprey ? ospreyStatus : isCoaster ? coasterStatus : firing ? 'Cannonball in flight.' : hasFired && flight === 1
    ? `Landed at (${lesson.factors[1].rootLabel}, 0). Both zeros have y = 0.`
    : hasFired && flight > 0 ? `Paused at x = ${position.x.toFixed(2)}, y = ${position.y.toFixed(2)}. Resume or scrub to explore.`
    : '')

  function sizeGraph(node: SVGSVGElement) {
    const fitWidth = (width: number) => Math.max(520, Math.min(960, Math.round(width)))
    graphWidth = fitWidth(node.clientWidth)
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = fitWidth(entry.contentRect.width)
      if (nextWidth !== graphWidth) graphMoves = []
      graphWidth = nextWidth
    })
    observer.observe(node)
    return { destroy: () => observer.disconnect() }
  }

  export function openSettings() {
    playing = false
    firing = false
    if (step === 3) progress = 1
    draft = { a: lesson.a, b: lesson.b, c: lesson.c }
    error = ''
    settingsOpen = true
    dialog.showModal()
  }
  function chooseAnimation(mode: AnimationMode) {
    changeEquation(equationForAnimation(lesson, mode), mode)
  }

  function changeEquation(equation: Quadratic, mode = animation) {
    draft = equation
    try {
      const next = factorQuadratic(equation)
      if (mode === 'osprey' && next.a < 0) throw new Error('The osprey needs an upward-opening parabola to dive below the water. Use a positive a or choose a preset.')
      error = ''
      if (mode === animation && next.a === lesson.a && next.b === lesson.b && next.c === lesson.c) return
      lesson = next
      animation = mode
      selectStep(step)
      playing = false
      if (step === 3) progress = 1
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Please check the coefficients.' }
  }
  function selectStep(next: number) {
    const source = !reducedMotion && next === step + 1
      ? (step === 0 ? zeroEquation : step === 1 ? factorFinish : undefined)?.getBoundingClientRect()
      : undefined
    const graphSources = step === 2 && next === 3 && !reducedMotion ? captureGraphTokens() : []
    equationHandoff = undefined
    graphMoves = []
    step = Math.max(0, Math.min(3, next))
    progress = reducedMotion && step !== 0 ? 1 : 0
    playing = step > 0 && !reducedMotion
    firing = false
    flight = 0
    hasFired = false
    if (source) void handOffEquation(source, next)
    if (graphSources.length) void handOffGraph(graphSources)
  }
  async function handOffEquation(source: DOMRect, next: number) {
    // Measure the first equation after the next step has rendered.
    await tick()
    if (step !== next || progress !== 0 || reducedMotion) return
    const target = (next === 1 ? factorStart : solveStart)?.getBoundingClientRect()
    if (!target?.width) return
    equationHandoff = { x: source.left - target.left, y: source.top - target.top, scale: source.width / target.width }
  }
  function captureGraphTokens(): GraphToken[] {
    if (!stage) return []
    return Array.from(stage.querySelectorAll<HTMLElement>('[data-graph-source]')).flatMap(node => {
      // Keep wrapped expressions in place so they do not overflow while moving.
      if (node.getClientRects().length !== 1) return []
      const box = node.getBoundingClientRect()
      const fontSize = parseFloat(getComputedStyle(node).fontSize)
      const id = node.dataset.graphSource
      return id && box.width ? [{ id, text: node.textContent ?? '', box, fontSize }] : []
    })
  }
  async function handOffGraph(sources: GraphToken[]) {
    await tick()
    if (step !== 3 || progress !== 0 || reducedMotion || !stage) return
    // Store stage-relative positions so scrolling does not interrupt the move.
    const canvas = stage
    const stageBox = canvas.getBoundingClientRect()
    const originX = stageBox.left + canvas.clientLeft
    const originY = stageBox.top + canvas.clientTop
    const positionInStage = (box: DOMRect, fontSize: number): TokenPosition => ({
      x: box.left + box.width / 2 - originX,
      y: box.top + box.height / 2 - originY,
      fontSize,
    })
    graphMoves = sources.flatMap(source => {
      const node = canvas.querySelector(`[data-graph-target="${source.id}"]`)
      if (!node || node.getClientRects().length !== 1) return []
      const target = node.getBoundingClientRect()
      if (!target.width) return []
      return [{
        id: source.id,
        text: source.text,
        from: positionInStage(source.box, source.fontSize),
        to: positionInStage(target, source.fontSize * target.width / source.box.width),
      }]
    })
  }
  function fire() {
    if (firing) return
    playing = false
    progress = 1
    hasFired = true
    flight = reducedMotion ? 1 : 0
    firing = !reducedMotion
  }
  function togglePlay() {
    if (step === 3) {
      if (firing) firing = false
      else if (hasFired && flight > 0 && flight < 1 && !reducedMotion) firing = true
      else fire()
    } else {
      if (reducedMotion) { progress = 1; return }
      if (progress === 1) progress = 0
      playing = !playing
    }
  }
  function scrub(event: Event) {
    const value = Number((event.target as HTMLInputElement).value) / 1000
    playing = false
    firing = false
    if (step === 3) { progress = 1; hasFired = true; flight = value }
    else progress = value
  }
  function keyboard(event: KeyboardEvent) {
    if (settingsOpen || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.closest('button, input, select, a, [role="button"], [contenteditable]'))) return
    if (event.code === 'Space') { event.preventDefault(); togglePlay() }
    if (event.key === 'ArrowRight') { event.preventDefault(); selectStep(step + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); selectStep(step - 1) }
  }
  onMount(() => {
    const stopWatching = watchMotionPreference(state => {
      reducedMotion = state.reducedMotion
      if (reducedMotion) {
        if (step !== 0 || playing) progress = 1
        playing = false
        if (firing) flight = 1
        firing = false
      }
    })
    let frame: number
    let previous = 0
    function tick(now: number) {
      const elapsed = previous ? Math.min(now - previous, 80) : 0
      previous = now
      if (playing) {
        const duration = step === 3 ? graphMoves.length ? 1000 : 700 : step === 1 ? 5500 : 3500
        progress = Math.min(1, progress + elapsed / duration)
        if (progress === 1) playing = false
      }
      if (firing) {
        flight = Math.min(1, flight + elapsed / (isOsprey ? 8500 : isCoaster ? 1500 : 3200))
        if (flight === 1) firing = false
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); stopWatching() }
  })
</script>

<svelte:window onkeydown={keyboard} />

<main class="zeros-cannonball" aria-label="Zeros Cannonball">
  <dialog bind:this={dialog} onclose={() => settingsOpen = false} aria-labelledby="zeros-settings-title">
    <form onsubmit={(event) => event.preventDefault()} oninput={(event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'number') changeEquation(draft)
    }}>
      <div class="dialog-heading"><h2 id="zeros-settings-title">Animation settings</h2><button type="button" onclick={() => dialog.close()} aria-label="Close settings">×</button></div>
      <fieldset><legend>Choose an animation</legend>
        <div class="animation-options">
          <label><input type="radio" name="animation" value="cannonball" checked={animation === 'cannonball'} onchange={() => chooseAnimation('cannonball')} /><span><strong>Cannonball</strong><small>Launch from one zero to the other.</small></span></label>
          <label><input type="radio" name="animation" value="osprey" checked={animation === 'osprey'} onchange={() => chooseAnimation('osprey')} /><span><strong>Osprey dive</strong><small>Dive, catch a fish, swim up, and fly away.</small></span></label>
          <label><input type="radio" name="animation" value="rollercoaster" checked={animation === 'rollercoaster'} onchange={() => chooseAnimation('rollercoaster')} /><span><strong>Roller coaster</strong><small>Ride over a hill or through a valley between the zeros.</small></span></label>
        </div>
        {#if isOsprey}<p class="hint">The water surface is y = 0. Choosing the osprey reflects downward-opening equations upward, keeping the same zeros. The updated coefficients are shown below.</p>{/if}
      </fieldset>
      <fieldset><legend>Try an example</legend><div class="presets">
        {#each examples.filter(example => !isOsprey || example.name !== 'Over the axis') as example}
          {@const preset = equationForAnimation(example, animation)}
          <button type="button" class:chosen={draft.a === preset.a && draft.b === preset.b && draft.c === preset.c} onclick={() => changeEquation(preset)}>
            <strong>{isOsprey && example.name === 'Under the axis' ? 'Osprey dive' : example.name}</strong><span>y = {factorQuadratic(preset).standard}</span>
          </button>
        {/each}
      </div></fieldset>
      <fieldset><legend>Standard form: y = ax² + bx + c</legend>
        <div class="coefficients">
          <label>a<input type="number" min="-9" max="9" step="1" required bind:value={draft.a} /></label>
          <label>b<input type="number" min="-40" max="40" step="1" required bind:value={draft.b} /></label>
          <label>c<input type="number" min="-40" max="40" step="1" required bind:value={draft.c} /></label>
        </div>
        <p class="hint">Choose whole-number coefficients with two distinct rational zeros. {isOsprey ? 'Use positive a for an underwater dive.' : isCoaster ? 'Negative a makes a hill; positive a makes a valley. Both work with the coaster.' : 'Negative a launches above the axis; positive a launches below it.'}</p>
      </fieldset>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
    </form>
  </dialog>

  <div class="stage-heading">
    <h1>{lessonHeadings[step]}</h1>
    {#if step === 3 && isOsprey}<p>Click the osprey. It enters the water at the left zero, catches a fish, and surfaces at the right zero.</p>{/if}
  </div>

  <section class="stage" class:graph-stage={step === 3} bind:this={stage} aria-label={steps[step]}>
    {#if step === 0}
      <div class="standard-scene">
        <span class="form-label">STANDARD FORM</span>
        <p class="hero-equation">y = {lesson.standard}</p>
        <span class="down-arrow" aria-hidden="true">↓</span>
        <div class="zero-equation" style:opacity={reveal(0, 1)}><p class="hero-equation" bind:this={zeroEquation}>0 = {lesson.standard}</p></div>
      </div>
    {:else if step === 1}
      <div class="factor-scene">
        <p
          class="starting-equation"
          bind:this={factorStart}
          style:transform={handoffTransform}
        >0 = {lesson.standard}</p>
        {#each lesson.rows as row, index}
          {@const finalRow = index === lesson.rows.length - 1}
          {@const rowReveal = reveal(index, lesson.rows.length, revealProgress)}
          <div class="factor-row" class:final-row={finalRow} style:opacity={rowReveal} style:transform={`translateY(${(1 - rowReveal) * 12}px)`}>
            <p>{row.label}</p>
            {#if finalRow}
              <div class="math-line" bind:this={factorFinish}>0 = {row.expression}</div>
            {:else}
              <div class="math-line">0 = {row.expression}</div>
            {/if}
          </div>
        {/each}
      </div>
    {:else if step === 2}
      <div class="solve-scene">
        <p class="hero-equation solve-start" bind:this={solveStart} style:transform={handoffTransform}>0 = <span data-graph-source="equation">{lesson.factored}</span></p>
        <div class="solutions">
          {#each lesson.factors as factor, index}
            <div class="solution" style:opacity={reveal(index, 3, revealProgress)}>
              {#if factor.p !== 1 || factor.q !== 0}<p class="math-line">0 = {factor.expression}</p>{/if}
              {#if factor.p !== 1 && factor.q !== 0}<p class="math-line intermediate">{factor.p}x = {numberText(-factor.q)}</p>{/if}
              <p class="root-answer" style:opacity={reveal(2, 3, revealProgress)}>x = <span data-graph-source={`root-${index}`}>{factor.rootLabel}</span></p>
            </div>
          {/each}
        </div>
        <p class="scene-note" style:opacity={reveal(2, 3, revealProgress)}>These two solutions are the x-intercepts on our graph.</p>
      </div>
    {:else}
      <div class="graph-equation">
        y = <span data-graph-target="equation" style:opacity={movingTo('equation') ? 0 : undefined}>{lesson.factored}</span>
        {#if isOsprey}<span class="graph-subtitle">Osprey dive · water surface at y = 0</span>{/if}
      </div>
      <svg class="graph" use:sizeGraph viewBox={`0 0 ${graph.width} 480`} aria-labelledby="zeros-graph-title zeros-graph-description" style:opacity={reveal(0, 1)}>
        <title id="zeros-graph-title">{isOsprey ? 'Osprey dive' : isCoaster ? 'Roller coaster' : 'Cannonball'} parabola</title>
        <desc id="zeros-graph-description">y = {lesson.standard}. Zeros at ({lesson.factors[0].rootLabel}, 0) and ({lesson.factors[1].rootLabel}, 0). {isOsprey ? 'The osprey enters the water at the left zero, follows the parabola to catch a fish, surfaces at the right zero, then flies away.' : isCoaster ? `The roller coaster follows a ${flipped ? 'valley' : 'hill'} from the left zero to the right zero.` : `The cannon fires from left to right, ${flipped ? 'below' : 'above'} the x-axis.`}</desc>
        <defs><clipPath id="zeros-graph-clip"><rect x="30" y="16" width={graph.width - 60} height="448" rx="12" /></clipPath></defs>
        <g clip-path="url(#zeros-graph-clip)">
          {#if isOsprey}
            <rect class="water" x="30" y={graph.yPixel(0)} width={graph.width - 60} height={464 - graph.yPixel(0)} />
            <path class="water-surface" d={`M30 ${graph.yPixel(0)}H${graph.width - 30}`} />
          {/if}
          {#each graph.xTicks as x}<line class="grid-line" x1={graph.xPixel(x)} x2={graph.xPixel(x)} y1="16" y2="464" />{/each}
          {#each graph.yTicks as y}<line class="grid-line" y1={graph.yPixel(y)} y2={graph.yPixel(y)} x1="30" x2={graph.width - 30} />{/each}
          <line class="axis" x1="30" x2={graph.width - 30} y1={graph.yPixel(0)} y2={graph.yPixel(0)} />
          <line class="axis" x1={graph.xPixel(0)} x2={graph.xPixel(0)} y1="16" y2="464" />
          <path class="whole-curve" d={graph.fullPath} />
          {#if !isCoaster}
            <path class="flight-path" d={graph.path} />
            {#if hasFired}<path class="trail" d={graph.path} pathLength="1" stroke-dasharray={`${pathProgress} 1`} />{/if}
          {/if}
        </g>
        {#each graph.xTicks as x}
          {#if lesson.factors.every(factor => Math.abs(graph.xPixel(x) - graph.xPixel(factor.root)) > 34)}<text class="tick" x={graph.xPixel(x)} y={graph.yPixel(0) + (flipped ? 22 : -12)} text-anchor="middle">{numberText(x)}</text>{/if}
        {/each}
        {#each graph.yTicks.filter(y => y !== 0) as y}<text class="tick" x={graph.xPixel(0) - 10} y={graph.yPixel(y) + 5} text-anchor="end">{numberText(y)}</text>{/each}
        <text class="axis-name" x={graph.width - 24} y={graph.yPixel(0) - 10}>x</text><text class="axis-name" x={graph.xPixel(0) + 12} y="22">y</text>
        {#each lesson.factors as factor, index}
          <circle class="zero" cx={graph.xPixel(factor.root)} cy={graph.yPixel(0)} r="6" />
          <line class="label-guide" x1={graph.xPixel(factor.root)} y1={graph.yPixel(0) + (flipped ? -10 : 10)} x2={graph.labelX(index)} y2={graph.yPixel(0) + labelOffset + (flipped ? 19 : -19)} />
          <g transform={`translate(${graph.labelX(index)}, ${graph.yPixel(0) + labelOffset})`}>
            <rect class="zero-label" x="-66" y="-19" width="132" height="38" rx="19" />
            <text class="zero-text" text-anchor="middle" y="7">(<tspan data-graph-target={`root-${index}`} opacity={movingTo(`root-${index}`) ? 0 : 1}>{factor.rootLabel}</tspan>, 0)</text>
            {#if !isCoaster}
              <text class="zero-caption" text-anchor="middle" y={flipped ? -29 : 35}>{isOsprey ? index === 0 ? 'WATER ENTRY' : 'WATER EXIT' : index === 0 ? 'LAUNCH' : 'LANDING'}</text>
            {/if}
          </g>
        {/each}
        {#if isOsprey}
          <OspreyScene {graph} progress={flight} started={hasFired} playing={firing} onstart={fire} />
        {:else if isCoaster}
          <RollerCoasterScene {graph} progress={flight} playing={firing} onstart={fire} />
        {:else}
        <g class="cannon" role="button" tabindex="0" aria-label="Fire cannon" aria-disabled={firing} onclick={fire} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fire() } }} transform={`translate(${graph.xPixel(lesson.left)} ${graph.yPixel(0)}) scale(1 ${flipped ? -1 : 1})`}>
          <title>Click to fire the cannon</title>
          <rect class="cannon-target" x="-85" y="-24" width="106" height="100" rx="20" />
          <path d="M-65 54L-39 20-12 54Z" fill="#c88d50" stroke="#754929" stroke-width="3" />
          <g transform={`rotate(${-Math.abs(graph.angle)})`}>
            <path d="M-69-15Q-81 0-69 15L-8 11V-11Z" fill="#586579" stroke="#273346" stroke-width="3" />
            <path d="M-62-10H-15" stroke="#a9b7c8" stroke-width="4" stroke-linecap="round" />
            <rect x="-13" y="-15" width="13" height="30" rx="4" fill="#8998ab" stroke="#273346" stroke-width="3" />
            <ellipse cx="0" cy="0" rx="3" ry="10" fill="#182133" />
          </g>
          <circle cx="-39" cy="52" r="18" fill="#e4b57b" stroke="#754929" stroke-width="4" />
          <path d="M-39 37V67M-54 52H-24M-50 41L-28 63M-50 63L-28 41" stroke="#956135" stroke-width="3" />
          <circle cx="-39" cy="52" r="5" fill="#754929" />
        </g>
        {#if hasFired}
          <g class="cannonball" transform={`translate(${ball.x} ${ball.y})`}>
            <circle r="10" fill="#273346" stroke="#fff" stroke-width="2" /><circle cx="-3" cy="-3" r="3" fill="#94a7be" />
          </g>
          {#if flight === 1}<circle class="landing-ring" cx={ball.x} cy={ball.y} r="18" />{/if}
        {/if}
        {/if}
      </svg>
      {#if graphHandoffActive}
        {#each graphMoves as move (move.id)}
          <span
            class="graph-transfer"
            aria-hidden="true"
            style:left={`${travelBetween(move.from.x, move.to.x)}px`}
            style:top={`${travelBetween(move.from.y, move.to.y)}px`}
            style:font-size={`${travelBetween(move.from.fontSize, move.to.fontSize)}px`}
          >{move.text}</span>
        {/each}
      {/if}
      {#if isOsprey || hasFired || reducedMotion}
        <div class="flight-readout">
          {#if isOsprey && (!hasFired || osprey.phase === 'approach' || osprey.phase === 'fly-away')}
            <span>Water entry → fish at the vertex → water exit</span>
          {:else if hasFired}
            <span>x = {position.x.toFixed(2)}, y = {position.y.toFixed(2)}</span>
          {/if}
          {#if reducedMotion}
            <span>Reduced motion: start to show the result; scrub to explore.</span>
          {:else if isOsprey}
            <span>Click the osprey to dive again.</span>
          {/if}
        </div>
      {/if}
    {/if}
  </section>

  <nav class="steps" aria-label="Lesson steps">{#each steps as title, index}<button class:active={step === index} aria-current={step === index ? 'step' : undefined} onclick={() => selectStep(index)}><span>{index + 1}</span>{title}</button>{/each}</nav>
  <div class="transport">
    <button onclick={() => selectStep(step - 1)} disabled={step === 0}>← Previous</button>
    <label class="scrubber"><span class="sr-only">{step === 3 ? isCoaster ? 'Ride progress' : 'Flight progress' : 'Step progress'}</span><input type="range" min="0" max="1000" step="1" value={Math.round((step === 3 ? flight : progress) * 1000)} oninput={scrub} /><output aria-live="off">{Math.round((step === 3 ? flight : progress) * 100)}%</output></label>
    <button class="primary" onclick={togglePlay}>{playbackLabel}</button>
    <button onclick={() => selectStep(step === 3 ? 0 : step + 1)}>{step === 3 ? 'Start again ↺' : step === 2 ? 'Show the graph →' : 'Next step →'}</button>
  </div>
  <p class="status" role="status" aria-live="polite">{status}</p>
</main>

<style>
  .zeros-cannonball { --accent: #7050b0; --tint: #f0eaf9; --gold: #bd7320; width: min(100%, 1200px); margin: auto; padding: 0 clamp(.75rem, 3vw, 2rem) 1rem; }
  :global(.dark-mode) .zeros-cannonball { --accent: #c8b0ff; --tint: #2c243d; --gold: #ffd184; }
  button { border: 1px solid var(--line); border-radius: 10px; background: var(--paper); color: var(--ink); padding: .6rem .8rem; font: inherit; }
  button:hover { background: var(--soft); }
  button:disabled { opacity: .4; }
  .primary, .chosen { color: var(--accent); border-color: var(--accent); background: var(--tint); font-weight: 700; }
  .stage-heading { margin: .4rem 0 .8rem; }
  .stage-heading h1 { margin: 0 0 .3rem; font-size: 1.1rem; }
  .stage-heading p { margin: 0; color: var(--muted); font-size: .85rem; }
  .stage { position: relative; min-height: 440px; border: 1px solid var(--line); border-radius: 20px; background: var(--paper); overflow: hidden; }
  .standard-scene, .solve-scene { min-height: 440px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.6rem; text-align: center; }
  .form-label { font-size: .7rem; letter-spacing: .13em; color: var(--muted); font-weight: 700; }
  .hero-equation { font-size: clamp(1.5rem, 4vw, 2.8rem); margin: .7rem 0 1rem; font-weight: 700; }
  .down-arrow { color: var(--accent); font-size: 2rem; margin-bottom: .8rem; }
  .zero-equation { color: var(--accent); border-radius: 16px; background: var(--tint); padding: 1rem 2rem .2rem; }
  .scene-note { color: var(--muted); font-size: .85rem; margin: 1rem 0 0; }
  .factor-scene { min-height: 440px; display: flex; flex-direction: column; justify-content: center; padding: 1.2rem clamp(1rem, 5vw, 4rem); gap: .65rem; }
  .starting-equation { align-self: flex-start; margin: 0 0 .1rem; font-size: 1.3rem; font-weight: 700; transform-origin: top left; }
  .factor-row { padding: .5rem 1rem; border-left: 3px solid var(--line); }
  .factor-row p { margin: 0 0 .3rem; font-size: .78rem; color: var(--muted); }
  .math-line { font-size: clamp(1rem, 2.7vw, 1.7rem); font-weight: 700; overflow-wrap: anywhere; }
  .final-row { color: var(--accent); background: var(--tint); border-color: var(--accent); border-radius: 0 10px 10px 0; }
  .final-row .math-line { width: fit-content; }
  .solve-start { text-align: left; transform-origin: top left; }
  .solutions { display: grid; grid-template-columns: 1fr 1fr; width: min(100%, 680px); gap: 1.2rem; margin-top: 1.5rem; }
  .solution { border: 1px solid var(--line); border-radius: 16px; padding: 1.2rem .6rem .7rem; background: var(--canvas); }
  .solution p { margin: .6rem 0; }
  .intermediate { color: var(--muted); }
  .root-answer { color: var(--accent); font-size: clamp(1.5rem, 4vw, 2.3rem); font-weight: 700; }
  .graph-equation { padding: .8rem 1rem 0; text-align: center; font-size: clamp(1.1rem, 3vw, 1.65rem); color: var(--accent); font-weight: 700; }
  .graph-subtitle { display: block; margin-top: .25rem; font-size: .75rem; font-weight: 400; color: var(--muted); }
  .graph-transfer { position: absolute; transform: translate(-50%, -50%); pointer-events: none; color: var(--accent); font-weight: 700; line-height: 1; white-space: nowrap; }
  .graph { display: block; width: 100%; max-height: 53dvh; min-height: 280px; }
  .grid-line { stroke: var(--line); stroke-width: .7; opacity: .5; }
  .water { fill: #238fae; opacity: .17; }
  .water-surface { fill: none; stroke: #53b9d6; stroke-width: 4; opacity: .65; }
  .axis { stroke: var(--muted); stroke-width: 1.5; }
  .whole-curve { fill: none; stroke: var(--accent); opacity: .35; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .flight-path { fill: none; stroke: var(--accent); stroke-width: 3.5; }
  .trail { fill: none; stroke: var(--gold); stroke-width: 5; }
  .tick, .axis-name { fill: var(--muted); font-size: 14px; paint-order: stroke; stroke: var(--paper); stroke-width: 4px; }
  .axis-name { font-size: 18px; font-style: italic; }
  .zero { fill: var(--accent); stroke: var(--paper); stroke-width: 2; }
  .label-guide { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 4; opacity: .5; }
  .zero-label { fill: var(--tint); stroke: var(--accent); }
  .zero-text { fill: var(--accent); font-size: 22px; font-weight: 700; }
  .zero-caption { fill: var(--muted); font-size: 12px; letter-spacing: 2px; }
  .cannon { cursor: pointer; outline: none; }
  .cannon-target { fill: transparent; stroke: transparent; stroke-width: 2; }
  .cannon:hover .cannon-target, .cannon:focus-visible .cannon-target { fill: var(--tint); fill-opacity: .5; stroke: var(--accent); stroke-dasharray: 4 4; }
  .cannonball { pointer-events: none; }
  .landing-ring { fill: none; stroke: var(--gold); stroke-width: 3; }
  .flight-readout { display: flex; justify-content: space-between; gap: .5rem; padding: .2rem 1rem .8rem; font-size: .72rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; margin-top: 1rem; }
  .steps button { display: flex; align-items: center; justify-content: center; gap: .5rem; font-size: .8rem; color: var(--muted); }
  .steps button span { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; background: var(--soft); border-radius: 50%; flex: none; }
  .steps .active { color: var(--accent); background: var(--tint); border-color: var(--accent); }
  .steps .active span { color: var(--paper); background: var(--accent); }
  .transport { display: flex; align-items: center; gap: .6rem; margin-top: .75rem; font-size: .8rem; }
  .transport button { white-space: nowrap; }
  .scrubber { display: flex; align-items: center; flex: 1; gap: .5rem; min-width: 80px; }
  .scrubber input { width: 100%; min-width: 30px; accent-color: var(--accent); }
  output { font-size: .7rem; min-width: 2.7em; color: var(--muted); }
  .status { color: var(--muted); font-size: .75rem; margin: .7rem 0 0; min-height: 1.2em; }
  .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
  dialog { width: min(36rem, calc(100vw - 1.5rem)); max-height: calc(100dvh - 2rem); padding: 1.25rem; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); color: var(--ink); }
  dialog::backdrop { background: #0008; }
  .dialog-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .dialog-heading h2 { margin: 0; font-size: 1.3rem; }
  fieldset { min-width: 0; border: 1px solid var(--line); border-radius: 10px; padding: .8rem; margin: 0 0 1rem; }
  legend { font-weight: 700; font-size: .85rem; }
  .presets { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .presets button { text-align: left; display: grid; gap: .3rem; font-size: .8rem; }
  .presets span, .hint { font-size: .75rem; color: var(--muted); }
  .coefficients { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .coefficients label { display: grid; gap: .3rem; }
  .coefficients input { min-width: 0; width: 100%; padding: .5rem; border: 1px solid var(--line); border-radius: 7px; background: var(--canvas); color: var(--ink); }
  .hint { line-height: 1.4; margin-bottom: 0; }
  .error { border-left: 3px solid var(--accent); padding-left: .7rem; font-size: .85rem; }
  .animation-options { display: grid; gap: .6rem; }
  .animation-options label { display: flex; gap: .65rem; align-items: center; padding: .6rem; border: 1px solid var(--line); border-radius: 10px; cursor: pointer; }
  .animation-options label:has(input:checked) { border-color: var(--accent); background: var(--tint); }
  .animation-options input { accent-color: var(--accent); }
  .animation-options span { display: grid; gap: .2rem; }
  .animation-options small { color: var(--muted); }
  @media (max-width: 680px) {
    .stage, .standard-scene, .solve-scene, .factor-scene { min-height: 360px; }
    .standard-scene, .solve-scene { padding: 1.2rem .75rem; }
    .zero-equation { padding: 1rem .75rem .2rem; }
    .factor-scene { padding: 1rem .5rem; }
    .factor-row { padding: .45rem .5rem; }
    .factor-row p { font-size: .68rem; }
    .solutions { gap: .5rem; }
    .solution { padding: 1rem .3rem .5rem; }
    .graph-stage { min-height: 0; }
    .graph { min-height: 0; max-height: none; }
    .flight-readout { flex-direction: column; }
    .steps { gap: .25rem; }
    .steps button { flex-direction: column; padding: .4rem .15rem; font-size: .68rem; gap: .3rem; }
    .transport { flex-wrap: wrap; gap: .4rem; }
    .scrubber { order: -1; flex-basis: 100%; }
    .transport button { flex: 1; padding: .6rem .35rem; font-size: .75rem; }
  }
</style>
