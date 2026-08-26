<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import DirectionSymbol from './DirectionSymbol.svelte'
  import MapView from './MapView.svelte'
  import { DEPARTURE_CHIME_FREQUENCIES, OBJECTIVE_CHIME_FREQUENCIES } from '../lib/audio'
  import {
    advanceGoals,
    blankGoalSnapshot,
    CARDINAL_COMMANDS,
    clone,
    commandName,
    commandText,
    glyphOffsetFor,
    impossibleMessage,
    locationName,
    nodeById,
    RELATIVE_COMMANDS,
    resolveCommand,
    traceOffsetFor,
    uid,
  } from '../lib/domain'
  import type {
    Command,
    DirectionMode,
    ExecutionStep,
    GoalSnapshot,
    Heading,
    Level,
    Point,
    RepresentationMode,
    ResolvedMove,
  } from '../lib/types'

  export let level: Level
  export let globalMode: DirectionMode
  export let representation: RepresentationMode
  export let preview = false

  const dispatch = createEventDispatcher<{ exit: void; edit: void }>()
  const mode: DirectionMode = level.activityType === 'where-end' ? level.requiredMode ?? 'cardinal' : globalMode
  const headingAngles: Record<Heading, number> = { north: 0, east: 90, south: 180, west: 270 }
  let recipe: Command[] = level.activityType === 'where-end' ? clone(level.storedRecipe ?? []) : []
  let selectedRecipeIndex: number | null = null
  let history: ExecutionStep[] = []
  let pointer = 0
  let currentNodeId = level.startNodeId
  let carHeading: Heading = level.initialHeading
  let carAngle = headingAngles[level.initialHeading]
  let carX = nodeById(level.map, currentNodeId)?.x ?? 0
  let carY = nodeById(level.map, currentNodeId)?.y ?? 0
  let goalState: GoalSnapshot = blankGoalSnapshot()
  let phase: 'input' | 'autoplay' | 'stepping' | 'rewinding' | 'review' | 'impossible' = 'input'
  let activeCommandIndex: number | null = null
  let feedback = ''
  let speed: 'slow' | 'normal' | 'fast' = 'normal'
  let muted = false
  let settingsOpen = false
  let pauseRequested = false
  let animationFrame = 0
  let animationRun = 0
  let turning = false
  let transientTrace: { from: Point; to: Point; offset: number; progress: number; command: Command; glyphOffset: Point } | null = null
  let celebrationGoalId: string | null = null
  let celebrationTimer: ReturnType<typeof setTimeout> | null = null
  let confetti = false
  let recipeStrip: HTMLDivElement
  let draggedCommand: Command | null = null
  let dragTarget: number | 'append' | null = null
  let audioContext: AudioContext | null = null

  const durations = { slow: 1450, normal: 900, fast: 520 }
  const turnDurations = { slow: 500, normal: 320, fast: 170 }
  const replayRewindDuration = (stepCount: number) => Math.max(40, Math.min(90, 240 / stepCount))
  const commands = mode === 'relative' ? RELATIVE_COMMANDS : CARDINAL_COMMANDS
  const isBusy = () => phase === 'autoplay' || phase === 'stepping' || phase === 'rewinding'
  const orderedGoals = () => [...level.goals].sort((a, b) => a.order - b.order)

  $: car = { x: carX, y: carY, heading: carHeading }
  $: visibleCar = mode === 'relative' || history.length || transientTrace || turning ? car : null
  $: busy = phase === 'autoplay' || phase === 'stepping' || phase === 'rewinding'
  $: progressText = level.goals.length
    ? `${goalState.completedIds.length} of ${level.goals.length} stops reached`
    : `${history.length} directions completed`
  $: prompt = makePrompt()
  $: finalLocation = locationName(level.map, currentNodeId, level.goals)

  function makePrompt(): string {
    if (level.activityType === 'where-end') return 'Study the recipe. Where do you think the car will end?'
    const items = orderedGoals().map((goal) => goal.type === 'number' ? `${goal.order + 1}` : goal.label)
    if (!items.length) return 'Plan a route through the city.'
    if (items.length === 1) return `Go to ${items[0]}.`
    return `Go to ${items.slice(0, -1).join(', ')}, then ${items.at(-1)}.`
  }

  function addCommand(command: Command): void {
    if (level.activityType !== 'plan-route' || isBusy()) return
    if (selectedRecipeIndex === null) recipe = [...recipe, command]
    else {
      recipe = recipe.map((item, index) => index === selectedRecipeIndex ? command : item)
      selectedRecipeIndex = null
    }
    resetSimulation()
  }

  function insertCommand(command: Command): void {
    if (level.activityType !== 'plan-route' || isBusy()) return
    const index = selectedRecipeIndex ?? recipe.length
    recipe = [...recipe.slice(0, index), command, ...recipe.slice(index)]
    selectedRecipeIndex = index + 1
    resetSimulation()
  }

  function deleteCommand(index: number): void {
    if (isBusy() || !recipe.length) return
    recipe = recipe.filter((_, itemIndex) => itemIndex !== index)
    if (selectedRecipeIndex === index) selectedRecipeIndex = null
    else if (selectedRecipeIndex !== null && selectedRecipeIndex > index) selectedRecipeIndex -= 1
    resetSimulation()
  }

  function clearRecipe(): void {
    if (isBusy()) return
    recipe = []
    selectedRecipeIndex = null
    resetSimulation()
  }

  function beginCommandDrag(event: DragEvent, command: Command): void {
    if (level.activityType !== 'plan-route' || isBusy()) {
      event.preventDefault()
      return
    }
    draggedCommand = command
    dragTarget = null
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      event.dataTransfer.setData('application/x-city-navigator-command', command)
      event.dataTransfer.setData('text/plain', command)
    }
  }

  function allowCommandDrop(event: DragEvent, target: number | 'append'): void {
    if (level.activityType !== 'plan-route' || isBusy()) return
    event.preventDefault()
    dragTarget = target
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  function finishCommandDrag(): void {
    draggedCommand = null
    dragTarget = null
  }

  function dropCommand(event: DragEvent, target: number | 'append'): void {
    if (level.activityType !== 'plan-route' || isBusy()) return
    event.preventDefault()
    const transferred = event.dataTransfer?.getData('application/x-city-navigator-command')
      || event.dataTransfer?.getData('text/plain')
    const command = draggedCommand ?? ((commands as readonly Command[]).includes(transferred as Command) ? transferred as Command : null)
    if (!command) {
      finishCommandDrag()
      return
    }
    recipe = target === 'append'
      ? [...recipe, command]
      : recipe.map((item, index) => index === target ? command : item)
    selectedRecipeIndex = null
    resetSimulation()
    finishCommandDrag()
  }

  function resetSimulation(clearFeedback = true): void {
    animationRun += 1
    cancelAnimationFrame(animationFrame)
    if (celebrationTimer) clearTimeout(celebrationTimer)
    celebrationTimer = null
    pauseRequested = false
    history = []
    pointer = 0
    currentNodeId = level.startNodeId
    carHeading = level.initialHeading
    carAngle = headingAngles[level.initialHeading]
    const start = nodeById(level.map, currentNodeId)
    carX = start?.x ?? 0
    carY = start?.y ?? 0
    goalState = blankGoalSnapshot()
    phase = 'input'
    activeCommandIndex = null
    transientTrace = null
    turning = false
    celebrationGoalId = null
    confetti = false
    if (clearFeedback) feedback = ''
  }

  function ensureAudioContext(): AudioContext | null {
    if (muted) return null
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return null
      audioContext ??= new AudioContextClass()
      if (audioContext.state === 'suspended') void audioContext.resume()
      return audioContext
    } catch {
      return null
    }
  }

  function playChime(frequencies: readonly number[]): void {
    const context = ensureAudioContext()
    if (!context) return
    try {
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        gain.gain.setValueAtTime(0.001, context.currentTime + index * 0.09)
        gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + index * 0.09 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.09 + 0.28)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(context.currentTime + index * 0.09)
        oscillator.stop(context.currentTime + index * 0.09 + 0.3)
      })
    } catch {
      // Sound is optional and some managed classroom browsers block AudioContext.
    }
  }

  const playDepartureChime = () => playChime(DEPARTURE_CHIME_FREQUENCIES)
  const playObjectiveChime = () => playChime(OBJECTIVE_CHIME_FREQUENCIES)

  function celebrate(previous: GoalSnapshot, next: GoalSnapshot): void {
    if (next.completedIds.length === previous.completedIds.length) return
    const reachedId = next.completedIds.at(-1) ?? null
    celebrationGoalId = reachedId
    playObjectiveChime()
    if (next.finalReached) confetti = true
    if (celebrationTimer) clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => {
      celebrationGoalId = null
      confetti = false
      celebrationTimer = null
    }, next.finalReached ? 1100 : 650)
  }

  function animateMove(
    move: ResolvedMove,
    offset: number,
    backwards = false,
    departure?: { command: Command; glyphOffset: Point },
    duration = durations[speed],
  ): Promise<'origin' | 'destination'> {
    const run = ++animationRun
    const origin = backwards ? move.to : move.from
    const destination = backwards ? move.from : move.to
    const started = performance.now()
    let settling = false
    let settleStarted = 0
    let settleFrom = 0
    let settleTarget: 0 | 1 = 1
    return new Promise((resolve) => {
      const frame = (now: number) => {
        if (run !== animationRun) return resolve('origin')
        let progress: number
        if (!settling) {
          progress = Math.min(1, (now - started) / duration)
          if (pauseRequested && !backwards) {
            settling = true
            settleStarted = now
            settleFrom = progress
            settleTarget = progress < 0.5 ? 0 : 1
          }
        } else {
          const settleDuration = Math.max(120, Math.abs(settleTarget - settleFrom) * duration)
          const amount = Math.min(1, (now - settleStarted) / settleDuration)
          progress = settleFrom + (settleTarget - settleFrom) * (1 - Math.pow(1 - amount, 3))
          if (amount >= 1) {
            carX = settleTarget ? destination.x : origin.x
            carY = settleTarget ? destination.y : origin.y
            transientTrace = null
            resolve(settleTarget ? 'destination' : 'origin')
            return
          }
        }
        carX = origin.x + (destination.x - origin.x) * progress
        carY = origin.y + (destination.y - origin.y) * progress
        transientTrace = backwards || !departure
          ? null
          : { from: move.from, to: move.to, offset, progress, ...departure }
        if (progress >= 1) {
          transientTrace = null
          resolve('destination')
          return
        }
        animationFrame = requestAnimationFrame(frame)
      }
      animationFrame = requestAnimationFrame(frame)
    })
  }

  function animateTurn(targetHeading: Heading): Promise<boolean> {
    const targetAngle = headingAngles[targetHeading]
    const normalizedStart = ((carAngle % 360) + 360) % 360
    let delta = ((targetAngle - normalizedStart + 540) % 360) - 180
    if (delta === -180) delta = 180
    if (Math.abs(delta) < .01) {
      carHeading = targetHeading
      carAngle = targetAngle
      return Promise.resolve(true)
    }

    const run = ++animationRun
    const started = performance.now()
    const startAngle = carAngle
    const duration = turnDurations[speed] * (Math.abs(delta) === 180 ? 1.45 : 1)
    turning = true

    return new Promise((resolve) => {
      const frame = (now: number) => {
        if (run !== animationRun) {
          turning = false
          resolve(false)
          return
        }
        const progress = Math.min(1, (now - started) / duration)
        const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
        carAngle = startAngle + delta * eased
        if (progress >= 1) {
          carAngle = startAngle + delta
          carHeading = targetHeading
          turning = false
          resolve(true)
          return
        }
        animationFrame = requestAnimationFrame(frame)
      }
      animationFrame = requestAnimationFrame(frame)
    })
  }

  async function executeOne(source: 'step' | 'autoplay'): Promise<'done' | 'stopped' | 'impossible'> {
    if (pointer >= recipe.length) return 'stopped'
    const command = recipe[pointer]
    activeCommandIndex = pointer
    requestAnimationFrame(() => recipeStrip?.querySelectorAll<HTMLElement>('.recipe-tile')[pointer]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }))
    const move = resolveCommand(level.map, currentNodeId, carHeading, mode, command)
    if (!move) {
      phase = 'impossible'
      feedback = impossibleMessage(mode, command)
      return 'impossible'
    }
    phase = source === 'autoplay' ? 'autoplay' : 'stepping'
    ensureAudioContext()
    const before = clone(goalState)
    const offset = traceOffsetFor(history, move.from.id, move.to.id)
    const glyphOffset = glyphOffsetFor(history, move.from.id)
    await new Promise((resolve) => setTimeout(resolve, speed === 'fast' ? 90 : 170))
    const turned = await animateTurn(move.heading)
    if (!turned) return 'stopped'
    playDepartureChime()
    const result = await animateMove(move, offset, false, { command, glyphOffset })
    if (result === 'origin') {
      currentNodeId = move.from.id
      carHeading = history.at(-1)?.headingAfter ?? level.initialHeading
      carAngle = headingAngles[carHeading]
      phase = 'input'
      activeCommandIndex = null
      pauseRequested = false
      feedback = 'Paused before the direction was completed.'
      return 'stopped'
    }
    currentNodeId = move.to.id
    carHeading = move.heading
    const after = advanceGoals(level.goals, currentNodeId, before)
    const step: ExecutionStep = {
      id: uid('step'), commandIndex: pointer, command,
      fromNodeId: move.from.id, toNodeId: move.to.id,
      headingBefore: history.at(-1)?.headingAfter ?? (pointer === 0 ? level.initialHeading : carHeading),
      headingAfter: move.heading, edgeId: move.edge.id, traceOffset: offset,
      glyphOffset, goalsBefore: before, goalsAfter: after,
    }
    history = [...history, step]
    goalState = after
    pointer += 1
    celebrate(before, after)
    if (pauseRequested) {
      phase = 'input'
      activeCommandIndex = null
      pauseRequested = false
      feedback = 'Paused at the closest intersection.'
      return 'stopped'
    }
    return 'done'
  }

  function finishReview(): void {
    phase = 'review'
    activeCommandIndex = null
    if (level.activityType === 'where-end') {
      feedback = `The car ended at ${finalLocation}.`
    } else if (goalState.finalReached && currentNodeId === orderedGoals().at(-1)?.nodeId) {
      feedback = level.goals.length > 1 ? 'All required destinations were visited.' : 'Destination reached.'
    } else if (goalState.finalReached) {
      feedback = 'The final destination was reached, but the car continued.'
    } else if (level.goals.length) {
      feedback = `Route complete — ${progressText}.`
    } else {
      feedback = `Route complete at ${finalLocation}.`
    }
  }

  async function rewindCompletedRoute(): Promise<boolean> {
    const completedSteps = [...history]
    if (!completedSteps.length) {
      resetSimulation(false)
      return true
    }

    phase = 'rewinding'
    feedback = ''
    pauseRequested = false
    transientTrace = null
    celebrationGoalId = null
    confetti = false
    if (celebrationTimer) clearTimeout(celebrationTimer)
    celebrationTimer = null
    const duration = replayRewindDuration(completedSteps.length)

    for (const step of completedSteps.reverse()) {
      const from = nodeById(level.map, step.fromNodeId)!
      const to = nodeById(level.map, step.toNodeId)!
      const edge = level.map.edges.find((item) => item.id === step.edgeId)!
      activeCommandIndex = step.commandIndex
      const result = await animateMove({ edge, from, to, heading: step.headingAfter }, step.traceOffset, true, undefined, duration)
      if (result !== 'destination') return false
      history = history.slice(0, -1)
      pointer = step.commandIndex
      currentNodeId = step.fromNodeId
      carX = from.x
      carY = from.y
      carHeading = step.headingBefore
      carAngle = headingAngles[step.headingBefore]
      goalState = clone(step.goalsBefore)
    }

    phase = 'input'
    activeCommandIndex = null
    return true
  }

  async function go(): Promise<void> {
    if (isBusy()) {
      pauseRequested = true
      return
    }
    if (!recipe.length) {
      feedback = 'Add at least one direction.'
      return
    }
    if (pointer >= recipe.length) {
      const rewound = await rewindCompletedRoute()
      if (!rewound) return
    }
    feedback = ''
    pauseRequested = false
    while (pointer < recipe.length) {
      const result = await executeOne('autoplay')
      if (result !== 'done') return
      if (celebrationGoalId) await new Promise((resolve) => setTimeout(resolve, goalState.finalReached ? 420 : 220))
    }
    finishReview()
  }

  async function stepForward(): Promise<void> {
    if (isBusy()) return
    if (!recipe.length) {
      feedback = 'Add at least one direction.'
      return
    }
    if (pointer >= recipe.length) {
      finishReview()
      return
    }
    feedback = ''
    const result = await executeOne('step')
    if (result === 'done') {
      phase = pointer >= recipe.length ? 'review' : 'input'
      activeCommandIndex = null
      if (pointer >= recipe.length) finishReview()
    }
  }

  async function stepBack(): Promise<void> {
    if (isBusy() || !history.length) return
    const step = history.at(-1)!
    const from = nodeById(level.map, step.fromNodeId)!
    const to = nodeById(level.map, step.toNodeId)!
    const edge = level.map.edges.find((item) => item.id === step.edgeId)!
    phase = 'rewinding'
    feedback = ''
    activeCommandIndex = step.commandIndex
    await animateMove({ edge, from, to, heading: step.headingAfter }, step.traceOffset, true)
    history = history.slice(0, -1)
    pointer = step.commandIndex
    currentNodeId = step.fromNodeId
    carX = from.x
    carY = from.y
    carHeading = step.headingBefore
    carAngle = headingAngles[step.headingBefore]
    goalState = clone(step.goalsBefore)
    phase = 'input'
    activeCommandIndex = null
  }

  onDestroy(() => {
    animationRun += 1
    cancelAnimationFrame(animationFrame)
    if (celebrationTimer) clearTimeout(celebrationTimer)
    if (audioContext) void audioContext.close()
  })
</script>

<main class:cardinal-game={mode === 'cardinal' && level.activityType === 'plan-route'} class="game-screen">
  {#if settingsOpen}
    <section class="settings-popover" aria-label="Level settings">
      <div>
        <strong>Animation speed</strong>
        <div class="segmented compact">
          {#each ['slow', 'normal', 'fast'] as choice}
            <button class:active={speed === choice} type="button" on:click={() => speed = choice as typeof speed}>{choice}</button>
          {/each}
        </div>
      </div>
      <button class="sound-toggle" type="button" on:click={() => muted = !muted}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
    </section>
  {/if}

  <section class="map-stage">
    <MapView
      map={level.map}
      goals={level.goals}
      startNodeId={level.startNodeId}
      car={visibleCar}
      {carAngle}
      startOnly={!visibleCar}
      {history}
      {goalState}
      {representation}
      {celebrationGoalId}
      {transientTrace}
    />
    <aside class="level-objective" aria-live="polite">
      <span class="prompt-pin" aria-hidden="true">◆</span>
      <strong>{prompt}</strong>
    </aside>
    {#if confetti}
      <div class="confetti" aria-label="Destination celebration">
        {#each Array(18) as _, index}<i style={`--i:${index}`}></i>{/each}
      </div>
    {/if}
    {#if feedback}
      <aside class:impossible={phase === 'impossible'} class="feedback-card" aria-live="polite">
        <span>{phase === 'impossible' ? '!' : goalState.finalReached ? '★' : 'i'}</span>
        <div><strong>{feedback}</strong>{#if phase === 'impossible'}<small>The car followed the recipe literally and stopped here.</small>{/if}</div>
        <button type="button" aria-label="Dismiss feedback" on:click={() => feedback = ''}>×</button>
      </aside>
    {/if}
  </section>

  <section class="recipe-workspace" aria-label="Gameplay toolbar">
    <div class="recipe-strip" aria-label="Direction recipe" bind:this={recipeStrip}>
      <button class="go-button" type="button" disabled={phase === 'rewinding' || phase === 'stepping'} on:click={go}>
        {phase === 'autoplay' ? 'Pause' : 'GO'}
      </button>
      {#if !recipe.length}
        <div
          class:drag-target={dragTarget === 'append'}
          class="empty-recipe"
          role="region"
          aria-label="Empty recipe; drop a direction here to add it"
          on:dragover={(event) => allowCommandDrop(event, 'append')}
          on:drop={(event) => dropCommand(event, 'append')}
        ></div>
      {:else}
        {#each recipe as command, index}
          <div class="recipe-tile">
            <button
              class="recipe-command"
              type="button"
              class:first-command={index === 0}
              class:completed={index < pointer}
              class:current={index === activeCommandIndex}
              class:selected={index === selectedRecipeIndex}
              class:drag-target={dragTarget === index}
              disabled={level.activityType === 'where-end' || busy}
              aria-label={`${index + 1}: ${commandName(command)}`}
              on:click={() => selectedRecipeIndex = selectedRecipeIndex === index ? null : index}
              on:dragover={(event) => allowCommandDrop(event, index)}
              on:drop={(event) => dropCommand(event, index)}
            >
              <small>{index + 1}</small>
              <b>
                {#if representation === 'letters-arrows'}
                  <DirectionSymbol {command} />
                {:else}
                  {commandText(command, representation)}
                {/if}
              </b>
            </button>
            {#if level.activityType === 'plan-route'}
              <button
                class="recipe-remove"
                type="button"
                disabled={busy}
                aria-label={`Remove direction ${index + 1}: ${commandName(command)}`}
                on:click={() => deleteCommand(index)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
        {#if level.activityType === 'plan-route'}
          <div
            class:drag-target={dragTarget === 'append'}
            class="recipe-drop-append"
            role="region"
            aria-label="Drop a direction here to add it to the end"
            on:dragover={(event) => allowCommandDrop(event, 'append')}
            on:drop={(event) => dropCommand(event, 'append')}
          ></div>
        {/if}
      {/if}
    </div>

    <div class="dock-controls-row">
      <div class="dock-controls-main">
        {#if level.activityType === 'plan-route'}
          <div class:compass-palette={mode === 'cardinal'} class="direction-palette" aria-label="Direction input">
            {#each commands as command}
              <button
                type="button"
                draggable={!busy}
                disabled={busy}
                aria-label={commandName(command)}
                title={`${commandName(command)}: click to add or drag onto a recipe direction to replace it`}
                on:click={() => addCommand(command)}
                on:dragstart={(event) => beginCommandDrag(event, command)}
                on:dragend={finishCommandDrag}
              >
                <b>
                  {#if representation === 'letters-arrows'}
                    <DirectionSymbol {command} />
                  {:else}
                    {commandText(command, representation)}
                  {/if}
                </b>
                <span>{commandName(command)}</span>
              </button>
            {/each}
            {#if selectedRecipeIndex !== null}
              <button class="insert-button" type="button" on:click={() => insertCommand(recipe[selectedRecipeIndex!] ?? commands[0])}>＋ Insert copy</button>
            {/if}
          </div>
        {/if}

        <div class="route-controls">
          {#if level.activityType === 'plan-route'}
            <button class="dock-control-button" type="button" disabled={busy || !recipe.length} on:click={clearRecipe}>Clear</button>
          {/if}

          <div class="transport-controls">
            <button type="button" disabled={busy || !history.length} on:click={stepBack}><span>↶</span> Step back</button>
            <button type="button" disabled={busy || pointer >= recipe.length} on:click={stepForward}>Step forward <span>→</span></button>
            {#if level.activityType === 'where-end'}
              <button type="button" disabled={busy} on:click={() => resetSimulation()}><span>↺</span> Reset</button>
            {/if}
          </div>
        </div>
      </div>

      <div class="dock-right-actions">
        <button class:active={settingsOpen} class="dock-icon-button" type="button" aria-label="Level settings" title="Settings" on:click={() => settingsOpen = !settingsOpen}>
          <img
            class="settings-tool-icon"
            src="assets/Settings_optimized.svg"
            alt=""
            width="48"
            height="48"
            data-icon-source="music-learning-tools/packages/diatonic-compass-ui/public/assets/Settings_optimized.svg"
          />
        </button>
        <button class="dock-home-button" type="button" aria-label={preview ? 'Return to builder' : 'Home'} title={preview ? 'Return to builder' : 'Home'} on:click={() => dispatch('exit')}>
          <img
            class="home-tool-icon"
            src="assets/home-icon.svg"
            alt=""
            width="48"
            height="48"
            data-icon-source="music-learning-tools/packages/diatonic-compass-ui/public/assets/home-icon.svg"
          />
        </button>
      </div>
    </div>
  </section>
</main>
