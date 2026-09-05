<script lang="ts">
  import { onMount } from 'svelte'
  import {
    connect,
    disposeMidi,
    getOutputLabel,
    hardwareReady,
    isMidiSupported,
    midiState,
    noteMapping,
    paintFrame,
    selectOutput,
    setPadPressCallback,
    type LaunchpadRgb,
  } from './lib/midi.svelte.ts'
  import {
    GRID_SIZE,
    createGame,
    directionForEdge,
    pointKey,
    requestDirection,
    stepGame,
    tickDuration,
    type Difficulty,
    type Direction,
    type Point,
    type SnakeGame,
  } from './lib/snake.ts'

  const cells: Point[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
    row: Math.floor(index / GRID_SIZE),
    column: index % GRID_SIZE,
  }))
  const bestScoreKey = 'launchpad-snake-best-score'
  const difficultyKey = 'launchpad-snake-difficulty'
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
  const off: LaunchpadRgb = [0, 0, 0]
  const bodyColor: LaunchpadRgb = [45, 92, 5]
  const headColor: LaunchpadRgb = [105, 127, 14]
  const foodColor: LaunchpadRgb = [127, 13, 4]

  let game: SnakeGame = $state(createGame())
  let bestScore = $state(0)
  let soundOn = $state(true)
  let difficulty: Difficulty = $state('medium')
  let gameTimeout: ReturnType<typeof setTimeout> | null = null

  const snakeCells = $derived(new Set(game.snake.map(pointKey)))
  const headKey = $derived(pointKey(game.snake[0]))
  const foodKey = $derived(game.food ? pointKey(game.food) : '')
  const speedLevel = $derived(Math.min(9, 1 + Math.floor(game.score / 4)))
  const ready = $derived(hardwareReady())
  const statusLabel = $derived(
    game.phase === 'idle'
      ? 'READY'
      : game.phase === 'playing'
        ? 'RUN LIVE'
        : game.phase === 'paused'
          ? 'PAUSED'
          : game.phase === 'won'
            ? 'GRID MASTERED'
            : 'RUN OVER',
  )

  $effect(() => {
    paintFrame(frameForGame(game))
  })

  onMount(() => {
    try {
      bestScore = Number.parseInt(localStorage.getItem(bestScoreKey) ?? '0', 10) || 0
      soundOn = localStorage.getItem('launchpad-snake-sound') !== 'off'
      const savedDifficulty = localStorage.getItem(difficultyKey)
      if (savedDifficulty === 'easy' || savedDifficulty === 'medium' || savedDifficulty === 'hard') {
        difficulty = savedDifficulty
      }
    } catch {
      // Storage is optional.
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = directionForKey(event.key)
      if (direction) {
        event.preventDefault()
        steer(direction)
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        if (game.phase === 'playing' || game.phase === 'paused') togglePause()
        else startRun()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    setPadPressCallback(handleMidiPad)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      stopTimer()
      disposeMidi()
    }
  })

  function frameForGame(state: SnakeGame): LaunchpadRgb[] {
    const snakeSet = new Set(state.snake.map(pointKey))
    const head = pointKey(state.snake[0])
    const food = state.food ? pointKey(state.food) : ''
    return cells.map((cell) => {
      const key = pointKey(cell)
      if (key === head) return headColor
      if (snakeSet.has(key)) return bodyColor
      if (key === food) return foodColor
      return off
    })
  }

  function startRun(initialDirection: Direction = 'right'): void {
    stopTimer()
    game = createGame('playing', initialDirection)
    playTone(340, 0.06)
    scheduleTick()
  }

  function scheduleTick(): void {
    stopTimer()
    if (game.phase !== 'playing') return
    gameTimeout = setTimeout(runTick, tickDuration(game.score, difficulty))
  }

  function runTick(): void {
    const previousScore = game.score
    game = stepGame(game)

    if (game.score > previousScore) playTone(620, 0.055)
    if (game.phase === 'over' || game.phase === 'won') {
      updateBestScore()
      playTone(game.phase === 'won' ? 880 : 145, 0.14)
      stopTimer()
      return
    }
    scheduleTick()
  }

  function steer(direction: Direction): void {
    if (game.phase === 'idle' || game.phase === 'over' || game.phase === 'won') {
      startRun(direction)
      return
    }
    if (game.phase === 'paused') {
      game = requestDirection({ ...game, phase: 'playing' }, direction)
      scheduleTick()
      return
    }
    game = requestDirection(game, direction)
  }

  function pressCell(cell: Point): void {
    const direction = directionForEdge(cell.row, cell.column)
    if (direction) steer(direction)
  }

  function handleMidiPad(note: number): void {
    const index = noteMapping.indexOf(note)
    if (index < 0) return
    pressCell({ row: Math.floor(index / GRID_SIZE), column: index % GRID_SIZE })
  }

  function togglePause(): void {
    if (game.phase === 'playing') {
      stopTimer()
      game = { ...game, phase: 'paused' }
    } else if (game.phase === 'paused') {
      game = { ...game, phase: 'playing' }
      scheduleTick()
    }
  }

  function stopTimer(): void {
    if (gameTimeout) clearTimeout(gameTimeout)
    gameTimeout = null
  }

  function updateBestScore(): void {
    if (game.score <= bestScore) return
    bestScore = game.score
    try {
      localStorage.setItem(bestScoreKey, String(bestScore))
    } catch {
      // Persistence is optional.
    }
  }

  function toggleSound(): void {
    soundOn = !soundOn
    try {
      localStorage.setItem('launchpad-snake-sound', soundOn ? 'on' : 'off')
    } catch {
      // Persistence is optional.
    }
    if (soundOn) playTone(500, 0.04)
  }

  function setDifficulty(nextDifficulty: Difficulty): void {
    difficulty = nextDifficulty
    try {
      localStorage.setItem(difficultyKey, difficulty)
    } catch {
      // Persistence is optional.
    }
    if (game.phase === 'playing') scheduleTick()
  }

  function playTone(frequency: number, duration: number): void {
    if (!soundOn || typeof AudioContext === 'undefined') return
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.035, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
    oscillator.addEventListener('ended', () => void context.close(), { once: true })
  }

  function directionForKey(key: string): Direction | null {
    const normalized = key.toLowerCase()
    if (normalized === 'arrowup' || normalized === 'w') return 'up'
    if (normalized === 'arrowdown' || normalized === 's') return 'down'
    if (normalized === 'arrowleft' || normalized === 'a') return 'left'
    if (normalized === 'arrowright' || normalized === 'd') return 'right'
    return null
  }

  function handleOutputChange(event: Event): void {
    selectOutput((event.target as HTMLSelectElement).value)
  }
</script>

<svelte:head>
  <meta name="description" content="Play Snake on an 8 by 8 Novation Launchpad with the game mirrored in your browser." />
</svelte:head>

<main class="app-shell">
  <header class="topbar">
    <a class="home-link" href="../" aria-label="Back to Classroom Tools">← <span>Classroom Tools</span></a>
    <div class="brand"><span class="brand-mark"></span> LAUNCHPAD ARCADE</div>
    <button class="sound-button" aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} onclick={toggleSound}>{soundOn ? '♪' : '×'}</button>
  </header>

  <section class="game-layout">
    <div class="intro-column">
      <p class="eyebrow">EDGE ZONE 01</p>
      <h1>LAUNCHPAD<br /><em>SNAKE</em></h1>
      <p class="lede">Eat the fruit. Own the grid.<br />Steer from the invisible bezel.</p>

      <div class="score-strip" aria-label="Game statistics">
        <div><span>SCORE</span><strong>{String(game.score).padStart(2, '0')}</strong></div>
        <div><span>BEST</span><strong>{String(Math.max(bestScore, game.score)).padStart(2, '0')}</strong></div>
        <div><span>SPEED</span><strong>{String(speedLevel).padStart(2, '0')}</strong></div>
      </div>

      <fieldset class="difficulty-picker">
        <legend>RUN MODE</legend>
        <div>
          {#each difficulties as option}
            <button
              type="button"
              class:active={difficulty === option}
              aria-pressed={difficulty === option}
              aria-label={`Set ${option} speed`}
              onclick={() => setDifficulty(option)}
            >{option}</button>
          {/each}
        </div>
      </fieldset>

      <div class="game-actions">
        <button class="primary-button" onclick={() => startRun()}>{game.phase === 'idle' ? 'START RUN' : 'NEW RUN'} <span>→</span></button>
        {#if game.phase === 'playing' || game.phase === 'paused'}
          <button class="pause-button" onclick={togglePause}>{game.phase === 'paused' ? 'RESUME' : 'PAUSE'}</button>
        {/if}
      </div>

      <p class="control-copy"><strong>Press any pad on an outer edge to steer.</strong> Top goes up, bottom goes down, and the side columns turn left or right. Opposite turns are safely ignored.</p>

      <section class="device-panel" class:connected={ready}>
        <div class="device-heading">
          <div><span>HARDWARE</span><strong>{ready ? 'LAUNCHPAD READY' : 'OPTIONAL'}</strong></div>
          <i aria-hidden="true"></i>
        </div>

        {#if midiState.outputs.length > 0}
          <label class="output-select">
            <span>Lighting output</span>
            <select value={midiState.selectedOutput?.id ?? ''} onchange={handleOutputChange}>
              {#each midiState.outputs as output (output.id)}
                <option value={output.id}>{getOutputLabel(output)}</option>
              {/each}
            </select>
          </label>
        {/if}

        <p class:error={midiState.status === 'error'}>{midiState.statusMessage}</p>
        <button class="connect-button" onclick={() => void connect()} disabled={!isMidiSupported() || midiState.status === 'connecting' || midiState.status === 'connected'}>
          {midiState.status === 'connecting' ? 'CONNECTING…' : midiState.status === 'connected' ? 'MIDI ACCESS ON' : isMidiSupported() ? 'CONNECT LAUNCHPAD' : 'USE CHROME FOR MIDI'}
        </button>
      </section>
    </div>

    <section class="board-card" aria-label="Launchpad Snake board">
      <div class="board-header">
        <div><span class="live-dot" class:active={game.phase === 'playing'}></span> {statusLabel}</div>
        <span>DIR / {game.direction.toUpperCase()}</span>
      </div>

      <div class="launchpad-frame" class:game-over={game.phase === 'over'}>
        <div class="direction-label top">↑ ANY TOP PAD</div>
        <div class="direction-label left">←</div>
        <div class="direction-label right">→</div>
        <div class="grid" role="grid" aria-label="Playable 8 by 8 Launchpad grid">
          {#each cells as cell (pointKey(cell))}
            {@const key = pointKey(cell)}
            {@const edge = cell.row === 0 || cell.row === GRID_SIZE - 1 || cell.column === 0 || cell.column === GRID_SIZE - 1}
            <button
              class="pad"
              class:snake={snakeCells.has(key)}
              class:head={key === headKey}
              class:food={key === foodKey}
              class:edge
              class:interior={!edge}
              aria-label={`Row ${cell.row + 1}, column ${cell.column + 1}${edge ? ', steering zone' : ''}`}
              onclick={() => pressCell(cell)}
            ><span></span></button>
          {/each}
        </div>
        <div class="direction-label bottom">↓ ANY BOTTOM PAD</div>

        {#if game.phase === 'paused' || game.phase === 'over' || game.phase === 'won'}
          <div class="board-message" aria-live="polite">
            <span>{game.phase === 'paused' ? 'HOLD' : game.phase === 'won' ? '64 / 64' : 'FINAL SCORE'}</span>
            <strong>{game.phase === 'paused' ? 'PAUSED' : game.phase === 'won' ? 'GRID MASTERED' : game.score}</strong>
            <small>{game.phase === 'paused' ? 'Press an edge to resume' : 'Press an edge for a new run'}</small>
          </div>
        {/if}
      </div>

      <div class="board-footer"><span>8 × 8 LIVE MIRROR</span><span>ARROWS / WASD</span></div>
    </section>
  </section>
</main>
