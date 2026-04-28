<svelte:head>
  <title>Coordinates</title>
  <meta
    name="description"
    content="Practice reading and plotting ordered pairs on a Cartesian plane from negative ten to positive ten."
  />
</svelte:head>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  type Axis = 'x' | 'y'
  type Burst = {
    point: Point
    key: number
  }
  type Mode = 'read-point' | 'plot-point'
  type Tone = 'neutral' | 'success' | 'error' | 'warning'
  type Theme = 'light' | 'dark'
  type Point = {
    x: number
    y: number
    id: string
  }

  const MIN_COORD = -10
  const MAX_COORD = 10
  const AXIS_VALUES = Array.from({ length: MAX_COORD - MIN_COORD + 1 }, (_, index) => MIN_COORD + index)
  const LABEL_VALUES = AXIS_VALUES.filter((value) => value === 0 || value % 2 === 0 || Math.abs(value) === 10)
  const SVG_SIZE = 720
  const PADDING = 64
  const PLANE_SIZE = SVG_SIZE - PADDING * 2
  const GRID_HIT_RADIUS = 16
  const GRID_DOT_RADIUS = 4.25
  const SCREENSHOT_MODE = new URLSearchParams(window.location.search).get('screenshot') === '1'
  const SCREENSHOT_POINT = createPoint(-4, 7)
  const THEME_STORAGE_KEY = 'coordinates:theme'
  const NUMBER_PAD_ROWS = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0'],
  ]
  const BURST_RAYS = [
    { x: 0, y: -30 },
    { x: 20, y: -22 },
    { x: 30, y: 0 },
    { x: 20, y: 22 },
    { x: 0, y: 30 },
    { x: -20, y: 22 },
    { x: -30, y: 0 },
    { x: -20, y: -22 },
  ]
  const homeHref = new URL('..', new URL(import.meta.env.BASE_URL, window.location.origin)).toString()

  const gridPoints = AXIS_VALUES.flatMap((y) =>
    AXIS_VALUES.map((x) => createPoint(x, y)),
  )

  let mode: Mode = 'read-point'
  let currentPoint = SCREENSHOT_MODE ? SCREENSHOT_POINT : randomPoint()
  let selectedPoint: Point | null = null
  let revealedWrongPoint: Point | null = null
  let guessX = ''
  let guessY = ''
  let correctCount = 0
  let incorrectCount = 0
  let isLocked = false
  let showSolution = false
  let theme: Theme = 'dark'
  let statusTone: Tone = 'neutral'
  let statusHeading = 'Read a Point'
  let statusMessage = 'Type the x- and y-values for the highlighted point.'
  let advanceTimer: number | null = null
  let burstTimer: number | null = null
  let activeInput: Axis | null = null
  let answerGridElement: HTMLDivElement | null = null
  let correctBurst: Burst | null = null
  let burstKey = 0

  function createPoint(x: number, y: number): Point {
    return {
      x,
      y,
      id: `${x},${y}`,
    }
  }

  function randomPoint(previous: Point | null = null): Point {
    if (SCREENSHOT_MODE) return SCREENSHOT_POINT

    let nextPoint = previous
    while (!nextPoint || nextPoint.id === previous?.id) {
      const x = randomCoordinate()
      const y = randomCoordinate()
      nextPoint = createPoint(x, y)
    }
    return nextPoint
  }

  function randomCoordinate(): number {
    return Math.floor(Math.random() * (MAX_COORD - MIN_COORD + 1)) + MIN_COORD
  }

  function getPromptHeading(): string {
    return mode === 'read-point' ? 'Read a Point' : 'Plot a Point'
  }

  function loadStoredTheme(): Theme | null {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  }

  function applyTheme(nextTheme: Theme): void {
    theme = nextTheme
    document.documentElement.dataset.theme = nextTheme
  }

  function setTheme(nextTheme: Theme): void {
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  function toggleTheme(): void {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  function getTaskCopy(): string {
    return mode === 'read-point'
      ? 'Type the x- and y-values for the highlighted point.'
      : `Select the point for (${currentPoint.x}, ${currentPoint.y}).`
  }

  function setPromptState(): void {
    statusTone = 'neutral'
    statusHeading = getPromptHeading()
    statusMessage = getTaskCopy()
  }

  function clearAdvanceTimer(): void {
    if (advanceTimer !== null) {
      window.clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  function clearBurstTimer(): void {
    if (burstTimer !== null) {
      window.clearTimeout(burstTimer)
      burstTimer = null
    }
  }

  function queueNextRound(delayMs: number): void {
    clearAdvanceTimer()
    advanceTimer = window.setTimeout(() => {
      advanceRound()
    }, delayMs)
  }

  function clearActiveFocus(): void {
    activeInput = null
    const activeElement = document.activeElement as { blur?: () => void } | null
    activeElement?.blur?.()
  }

  function clearCorrectBurst(): void {
    clearBurstTimer()
    correctBurst = null
  }

  function triggerCorrectBurst(point: Point): void {
    clearBurstTimer()
    burstKey += 1
    correctBurst = {
      point,
      key: burstKey,
    }
    burstTimer = window.setTimeout(() => {
      correctBurst = null
      burstTimer = null
    }, 950)
  }

  function advanceRound(): void {
    clearAdvanceTimer()
    clearCorrectBurst()
    clearActiveFocus()
    currentPoint = randomPoint(currentPoint)
    selectedPoint = null
    revealedWrongPoint = null
    guessX = ''
    guessY = ''
    isLocked = false
    showSolution = false
    setPromptState()
  }

  function resetScore(): void {
    correctCount = 0
    incorrectCount = 0
    clearCorrectBurst()
    clearActiveFocus()
    selectedPoint = null
    revealedWrongPoint = null
    guessX = ''
    guessY = ''
    isLocked = false
    showSolution = false
    clearAdvanceTimer()
    setPromptState()
  }

  function switchMode(nextMode: Mode): void {
    if (mode === nextMode) return

    mode = nextMode
    clearAdvanceTimer()
    clearCorrectBurst()
    clearActiveFocus()
    currentPoint = randomPoint(currentPoint)
    selectedPoint = null
    revealedWrongPoint = null
    guessX = ''
    guessY = ''
    isLocked = false
    showSolution = false
    setPromptState()
  }

  function selectPoint(point: Point): void {
    if (isLocked || isReadMode) return
    selectedPoint = point
    submitAnswer()
  }

  function parseCoordinate(raw: string | number | null | undefined): number | null {
    if (raw === null || raw === undefined) return null

    const normalized = String(raw).trim()
    if (normalized === '') return null

    const parsed = Number(normalized)
    if (!Number.isInteger(parsed)) return null
    if (parsed < MIN_COORD || parsed > MAX_COORD) return null
    return parsed
  }

  function toggleSignedValue(raw: string | number | null | undefined): string {
    const normalized = raw === null || raw === undefined ? '' : String(raw).trim()
    if (normalized === '') return '-'
    if (normalized === '-') return ''
    if (normalized.startsWith('-')) return normalized.slice(1)
    return `-${normalized}`
  }

  function toggleCoordinateSign(axis: 'x' | 'y'): void {
    if (isLocked) return

    if (axis === 'x') {
      guessX = toggleSignedValue(guessX)
      return
    }

    guessY = toggleSignedValue(guessY)
  }

  function getCoordinateValue(axis: Axis): string {
    return axis === 'x' ? guessX : guessY
  }

  function setCoordinateValue(axis: Axis, value: string): void {
    if (axis === 'x') {
      guessX = value
      return
    }

    guessY = value
  }

  function isCoordinateDraft(value: string): boolean {
    if (value === '' || value === '-') return true

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed >= MIN_COORD && parsed <= MAX_COORD
  }

  function openNumberPad(axis: Axis): void {
    if (isLocked || !isReadMode) return
    activeInput = axis
  }

  function closeNumberPad(): void {
    activeInput = null
  }

  function appendCoordinateDigit(axis: Axis, digit: string): void {
    const currentValue = getCoordinateValue(axis)
    const isNegative = currentValue.startsWith('-')
    const digits = isNegative ? currentValue.slice(1) : currentValue

    if (digits.length >= 2) return

    const nextDigits = digits === '' ? digit : digits === '0' ? digit : `${digits}${digit}`
    const nextValue = `${isNegative ? '-' : ''}${nextDigits}`
    if (!isCoordinateDraft(nextValue)) return

    setCoordinateValue(axis, nextValue)
  }

  function deleteCoordinateDigit(axis: Axis): void {
    setCoordinateValue(axis, getCoordinateValue(axis).slice(0, -1))
  }

  function handleCoordinateSignToggle(axis: Axis): void {
    openNumberPad(axis)
    toggleCoordinateSign(axis)
  }

  function handleCoordinateKeydown(event: KeyboardEvent, axis: Axis): void {
    if (isLocked) return

    if (event.key === 'Tab') return

    if (event.key === 'Escape') {
      event.preventDefault()
      closeNumberPad()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      submitAnswer()
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      openNumberPad(axis)
      deleteCoordinateDigit(axis)
      return
    }

    if (event.key === '-' || event.key === '+') {
      event.preventDefault()
      handleCoordinateSignToggle(axis)
      return
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      openNumberPad(axis)
      appendCoordinateDigit(axis, event.key)
    }
  }

  function handleOutsidePointer(event: PointerEvent): void {
    if (!answerGridElement || !isReadMode) return
    if (!(event.target instanceof Node)) return
    if (answerGridElement.contains(event.target)) return
    closeNumberPad()
  }

  function submitAnswer(): void {
    if (isLocked) return

    const guess = isReadMode ? buildTypedGuess() : selectedPoint
    if (!guess) return

    clearActiveFocus()
    const isCorrect = guess.x === currentPoint.x && guess.y === currentPoint.y

    showSolution = true
    isLocked = true
    revealedWrongPoint = !isCorrect && !isReadMode ? guess : null

    if (isCorrect) {
      correctCount += 1
      triggerCorrectBurst(currentPoint)
      statusTone = 'success'
      statusHeading = 'Correct'
      statusMessage = `The ordered pair is (${currentPoint.x}, ${currentPoint.y}).`
      queueNextRound(1750)
      return
    }

    incorrectCount += 1
    statusTone = 'error'
    statusHeading = 'Not This One'
    statusMessage = `The correct ordered pair is (${currentPoint.x}, ${currentPoint.y}).`
    queueNextRound(2100)
  }

  function buildTypedGuess(): Point | null {
    const parsedX = parseCoordinate(guessX)
    const parsedY = parseCoordinate(guessY)

    if (parsedX === null || parsedY === null) {
      statusTone = 'warning'
      statusHeading = 'Check the Inputs'
      statusMessage = 'Enter whole-number coordinates from -10 to 10 in both boxes.'
      return null
    }

    return createPoint(parsedX, parsedY)
  }

  function coordinateToPixel(value: number): number {
    return PADDING + ((value - MIN_COORD) / (MAX_COORD - MIN_COORD)) * PLANE_SIZE
  }

  function xPixel(value: number): number {
    return coordinateToPixel(value)
  }

  function yPixel(value: number): number {
    return SVG_SIZE - coordinateToPixel(value)
  }

  function shouldRenderLabel(value: number): boolean {
    return LABEL_VALUES.includes(value)
  }

  function handlePointKeydown(event: KeyboardEvent, point: Point): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    selectPoint(point)
  }

  function highlightLabel(point: Point): string {
    return `Point at ${point.x}, ${point.y}`
  }

  $: isReadMode = mode === 'read-point'
  $: promptLabel = getPromptHeading()
  $: taskCopy = getTaskCopy()
  $: visibleCorrectPoint = isReadMode || showSolution ? currentPoint : null
  $: selectedReadout = selectedPoint ? `(${selectedPoint.x}, ${selectedPoint.y})` : 'Tap any lattice point.'
  $: targetReadout = `(${currentPoint.x}, ${currentPoint.y})`

  onMount(() => {
    window.addEventListener('pointerdown', handleOutsidePointer)

    const storedTheme = loadStoredTheme()
    if (storedTheme) {
      applyTheme(storedTheme)
      return
    }

    applyTheme('dark')
  })

  onDestroy(() => {
    window.removeEventListener('pointerdown', handleOutsidePointer)
    clearAdvanceTimer()
    clearBurstTimer()
  })
</script>

<main class="app-shell">
  <header class="topbar">
    <a class="home-button" href={homeHref} aria-label="Back to app hub" title="Back to app hub">
      <svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5L12 3.75l8.5 6.75" />
        <path d="M6.5 9.75V20.25h11V9.75" />
        <path d="M10 20.25v-5.5h4v5.5" />
      </svg>
    </a>
    <div class="topbar-title">
      <h1>Coordinates</h1>
    </div>
    <button
      type="button"
      class="theme-toggle"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      on:click={toggleTheme}
    >
      {#if theme === 'light'}
        <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.5v2.25M12 19.25v2.25M21.5 12h-2.25M4.75 12H2.5M18.72 5.28l-1.6 1.6M6.88 17.12l-1.6 1.6M18.72 18.72l-1.6-1.6M6.88 6.88l-1.6-1.6" />
        </svg>
      {:else}
        <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.2 14.4a8.6 8.6 0 1 1-10.6-10.6A7.25 7.25 0 0 0 20.2 14.4Z" />
        </svg>
      {/if}
    </button>
  </header>

  <section class="workspace">
    <article class="plane-card">
      <div class="plane-frame">
        <svg
          class="plane"
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          aria-label="Cartesian plane"
        >
          <rect
            x={PADDING}
            y={PADDING}
            width={PLANE_SIZE}
            height={PLANE_SIZE}
            class="plane-backdrop"
          />

          {#each AXIS_VALUES as value (value)}
            <line
              x1={xPixel(value)}
              y1={PADDING}
              x2={xPixel(value)}
              y2={SVG_SIZE - PADDING}
              class:axis-line={value === 0}
              class:grid-line={value !== 0}
            />
            <line
              x1={PADDING}
              y1={yPixel(value)}
              x2={SVG_SIZE - PADDING}
              y2={yPixel(value)}
              class:axis-line={value === 0}
              class:grid-line={value !== 0}
            />
          {/each}

          {#if visibleCorrectPoint}
            <line
              x1={xPixel(visibleCorrectPoint.x)}
              y1={yPixel(visibleCorrectPoint.y)}
              x2={xPixel(visibleCorrectPoint.x)}
              y2={yPixel(0)}
              class="guide-line"
            />
            <line
              x1={xPixel(visibleCorrectPoint.x)}
              y1={yPixel(visibleCorrectPoint.y)}
              x2={xPixel(0)}
              y2={yPixel(visibleCorrectPoint.y)}
              class="guide-line"
            />
          {/if}

          {#each AXIS_VALUES as value (value)}
            {#if shouldRenderLabel(value) && value !== 0}
              <text class="axis-label x-label" x={xPixel(value)} y={yPixel(0) + 18}>
                {value}
              </text>
              <text class="axis-label y-label" x={xPixel(0) - 8} y={yPixel(value) + 5}>
                {value}
              </text>
            {/if}
          {/each}

          <text class="axis-badge" x={SVG_SIZE - PADDING + 12} y={yPixel(0) + 6}>x</text>
          <text class="axis-badge" x={PADDING - 12} y={yPixel(0) + 6} text-anchor="end">-x</text>
          <text class="axis-badge" x={xPixel(0) - 6} y={PADDING - 16}>y</text>
          <text class="axis-badge" x={xPixel(0) - 10} y={SVG_SIZE - PADDING + 28} text-anchor="end">
            -y
          </text>

          {#each gridPoints as point (point.id)}
            <circle
              class="grid-hit"
              class:is-interactive={!isReadMode && !isLocked}
              cx={xPixel(point.x)}
              cy={yPixel(point.y)}
              r={GRID_HIT_RADIUS}
              role="button"
              tabindex={!isReadMode && !isLocked ? 0 : -1}
              aria-label={highlightLabel(point)}
              on:click={() => selectPoint(point)}
              on:keydown={(event) => handlePointKeydown(event, point)}
            />
            <circle class="grid-dot" cx={xPixel(point.x)} cy={yPixel(point.y)} r={GRID_DOT_RADIUS} />
          {/each}

          {#if selectedPoint && !showSolution && !isReadMode}
            <circle class="selection-ring" cx={xPixel(selectedPoint.x)} cy={yPixel(selectedPoint.y)} r="18" />
            <circle class="selection-dot" cx={xPixel(selectedPoint.x)} cy={yPixel(selectedPoint.y)} r="7.5" />
          {/if}

          {#if revealedWrongPoint}
            <circle class="wrong-ring" cx={xPixel(revealedWrongPoint.x)} cy={yPixel(revealedWrongPoint.y)} r="18" />
            <circle class="wrong-dot" cx={xPixel(revealedWrongPoint.x)} cy={yPixel(revealedWrongPoint.y)} r="7.5" />
          {/if}

          {#if visibleCorrectPoint}
            <circle class="target-ring" cx={xPixel(visibleCorrectPoint.x)} cy={yPixel(visibleCorrectPoint.y)} r="18" />
            <circle class="target-dot" cx={xPixel(visibleCorrectPoint.x)} cy={yPixel(visibleCorrectPoint.y)} r="7.5" />
          {/if}

          {#if correctBurst}
            {#key correctBurst.key}
              <g transform={`translate(${xPixel(correctBurst.point.x)} ${yPixel(correctBurst.point.y)})`}>
                <g class="correct-burst">
                  <circle class="burst-core" r="7.5" />
                  <circle class="burst-wave" r="10" />
                  {#each BURST_RAYS as ray}
                    <line class="burst-ray" x1="0" y1="0" x2={ray.x} y2={ray.y} />
                    <circle class="burst-spark" cx={ray.x} cy={ray.y} r="3.2" />
                  {/each}
                </g>
              </g>
            {/key}
          {/if}
        </svg>
      </div>
    </article>

    <form class="control-card" on:submit|preventDefault={submitAnswer}>
      <div class="score-controls">
        <article class="score-pill">
          <span>Correct</span>
          <strong>{correctCount}</strong>
        </article>
        <article class="score-pill">
          <span>Incorrect</span>
          <strong>{incorrectCount}</strong>
        </article>
        <button type="button" class="ghost-button" on:click={resetScore}>Reset Score</button>
      </div>

      <div class="question-card">
        <div class="mode-switch" role="tablist" aria-label="Question mode">
          <button
            type="button"
            class:active={mode === 'read-point'}
            on:click={() => switchMode('read-point')}
          >
            Read a Point
          </button>
          <button
            type="button"
            class:active={mode === 'plot-point'}
            on:click={() => switchMode('plot-point')}
          >
            Plot a Point
          </button>
        </div>
      </div>

      {#if isReadMode}
        <div class="answer-grid" bind:this={answerGridElement}>
          <div class="coordinate-field" class:is-active={activeInput === 'x'}>
            <label for="guess-x">
              <span>x-coordinate</span>
            </label>
            <div class="answer-input-shell">
              <button
                type="button"
                class="sign-toggle"
                aria-label="Toggle x-coordinate sign"
                disabled={isLocked}
                on:click={() => handleCoordinateSignToggle('x')}
              >
                +/-
              </button>
              <input
                id="guess-x"
                class="coordinate-input"
                class:is-active={activeInput === 'x'}
                bind:value={guessX}
                type="text"
                inputmode="none"
                readonly
                aria-haspopup="dialog"
                autocomplete="off"
                spellcheck="false"
                disabled={isLocked}
                on:focus={() => openNumberPad('x')}
                on:click={() => openNumberPad('x')}
                on:keydown={(event) => handleCoordinateKeydown(event, 'x')}
              />
            </div>

            {#if activeInput === 'x' && !isLocked}
              <div class="number-pad" role="dialog" aria-label="Number pad for x-coordinate">
                <div class="number-pad-grid">
                  {#each NUMBER_PAD_ROWS as row, rowIndex}
                    {#each row as digit}
                      <button
                        type="button"
                        class="number-pad-key"
                        class:number-pad-zero={rowIndex === NUMBER_PAD_ROWS.length - 1}
                        on:click={() => appendCoordinateDigit('x', digit)}
                      >
                        {digit}
                      </button>
                    {/each}
                  {/each}
                  <button
                    type="button"
                    class="number-pad-key number-pad-utility"
                    on:click={() => deleteCoordinateDigit('x')}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    class="number-pad-key number-pad-utility"
                    on:click={closeNumberPad}
                  >
                    Done
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <div class="coordinate-field" class:is-active={activeInput === 'y'}>
            <label for="guess-y">
              <span>y-coordinate</span>
            </label>
            <div class="answer-input-shell">
              <button
                type="button"
                class="sign-toggle"
                aria-label="Toggle y-coordinate sign"
                disabled={isLocked}
                on:click={() => handleCoordinateSignToggle('y')}
              >
                +/-
              </button>
              <input
                id="guess-y"
                class="coordinate-input"
                class:is-active={activeInput === 'y'}
                bind:value={guessY}
                type="text"
                inputmode="none"
                readonly
                aria-haspopup="dialog"
                autocomplete="off"
                spellcheck="false"
                disabled={isLocked}
                on:focus={() => openNumberPad('y')}
                on:click={() => openNumberPad('y')}
                on:keydown={(event) => handleCoordinateKeydown(event, 'y')}
              />
            </div>

            {#if activeInput === 'y' && !isLocked}
              <div class="number-pad" role="dialog" aria-label="Number pad for y-coordinate">
                <div class="number-pad-grid">
                  {#each NUMBER_PAD_ROWS as row, rowIndex}
                    {#each row as digit}
                      <button
                        type="button"
                        class="number-pad-key"
                        class:number-pad-zero={rowIndex === NUMBER_PAD_ROWS.length - 1}
                        on:click={() => appendCoordinateDigit('y', digit)}
                      >
                        {digit}
                      </button>
                    {/each}
                  {/each}
                  <button
                    type="button"
                    class="number-pad-key number-pad-utility"
                    on:click={() => deleteCoordinateDigit('y')}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    class="number-pad-key number-pad-utility"
                    on:click={closeNumberPad}
                  >
                    Done
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div class={`feedback feedback-${statusTone}`} aria-live="polite">
          <p class="feedback-heading">{statusHeading}</p>
          <p>{statusMessage}</p>
        </div>

        <div class="action-row">
          <button type="submit" class="primary-button" disabled={isLocked}>
            {isLocked ? 'Loading Next Point...' : 'Check Answer'}
          </button>
        </div>
      {:else}
        <div class={`feedback feedback-${statusTone}`} aria-live="polite">
          <p class="feedback-heading">{statusHeading}</p>
          <p>{statusMessage}</p>
        </div>

        <div class="selection-card">
          <span>Ordered pair</span>
          <strong>{targetReadout}</strong>
          {#if selectedPoint}
            <p class="selection-meta">Selected point: {selectedReadout}</p>
          {/if}
        </div>
      {/if}
    </form>
  </section>
</main>
