<script lang="ts">
  import { onMount } from 'svelte'
  import { hexToLaunchpadRgb } from '@classroom-tools/launchpad-midi'
  import {
    applyComputerPaint,
    computerPaceMs,
    countPaint,
    createBalancedRevealOwners,
    createEmptyBoard,
    pressHumanPad,
    pressLocalPad,
    winningPlayer,
    type Difficulty,
    type GameMode,
    type PaintBoard,
    type Player,
  } from './lib/game.ts'
  import {
    connect,
    disposeMidi,
    getOutputLabel,
    hardwareReady,
    isMidiSupported,
    midiState,
    paintFrame,
    selectOutput,
    setPadEventCallback,
    type LaunchpadRgb,
  } from './lib/midi.svelte.ts'

  type Phase = 'idle' | 'countdown' | 'playing' | 'finished'
  type PlaySurface = 'browser' | 'launchpad'

  const cells = Array.from({ length: 64 }, (_, index) => index)
  const durations = [15, 30, 60] as const
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
  const off: LaunchpadRgb = [0, 0, 0]
  const modeKey = 'launchpad-paint-war-mode'
  const playSurfaceKey = 'launchpad-paint-war-play-surface'
  const durationKey = 'launchpad-paint-war-duration'
  const difficultyKey = 'launchpad-paint-war-difficulty'
  const playerOneColourKey = 'launchpad-paint-war-player-one-colour'
  const playerTwoColourKey = 'launchpad-paint-war-player-two-colour'

  let board = $state<PaintBoard>(createEmptyBoard())
  let revealOwners = createBalancedRevealOwners()
  let mode = $state<GameMode>('local')
  let playSurface = $state<PlaySurface>('browser')
  let difficulty = $state<Difficulty>('medium')
  let duration = $state<(typeof durations)[number]>(30)
  let phase = $state<Phase>('idle')
  let countdown = $state(3)
  let remainingMs = $state(30_000)
  let playerOneColour = $state('#ff4f91')
  let playerTwoColour = $state('#42e8e0')
  let colourWarning = $state('')
  let connectionPending = $state(false)
  let lastPainted: number | null = $state(null)
  let countdownTimeout: ReturnType<typeof setTimeout> | null = null
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let aiTimeout: ReturnType<typeof setTimeout> | null = null
  let previewTimeout: ReturnType<typeof setTimeout> | null = null
  let timerDeadline = 0
  let roundRequest = 0

  const counts = $derived(countPaint(board))
  const winner = $derived(phase === 'finished' ? winningPlayer(board) : null)
  const connected = $derived(hardwareReady())
  const timeText = $derived((remainingMs / 1000).toFixed(1))
  const paintedPercent = $derived(((64 - counts.empty) / 64) * 100)
  const timePercent = $derived(Math.max(0, Math.min(100, (remainingMs / (duration * 1_000)) * 100)))
  const phaseLabel = $derived(
    phase === 'idle' ? 'READY'
      : phase === 'countdown' ? `STARTING IN ${countdown}`
        : phase === 'playing' ? 'PAINT NOW'
          : winner === null ? 'DRAW GAME' : `${playerLabel(winner).toUpperCase()} WINS`,
  )

  $effect(() => {
    const playerOneRgb = hexToLaunchpadRgb(playerOneColour)
    const playerTwoRgb = hexToLaunchpadRgb(playerTwoColour)
    paintFrame(board.map((cell) => cell === 1 ? playerOneRgb : cell === 2 ? playerTwoRgb : off))
  })

  onMount(() => {
    restorePreferences()
    setPadEventCallback((event) => {
      if (event.pressed && playSurface === 'launchpad') paintPad(event.index, 'launchpad')
    })

    return () => {
      cancelRoundTimers()
      cancelPreview()
      setPadEventCallback(null)
      disposeMidi()
    }
  })

  function restorePreferences(): void {
    try {
      const savedMode = localStorage.getItem(modeKey)
      const savedPlaySurface = localStorage.getItem(playSurfaceKey)
      const savedDuration = Number(localStorage.getItem(durationKey))
      const savedDifficulty = localStorage.getItem(difficultyKey)
      const savedPlayerOne = localStorage.getItem(playerOneColourKey)
      const savedPlayerTwo = localStorage.getItem(playerTwoColourKey)
      if (savedMode === 'local' || savedMode === 'computer') mode = savedMode
      if (savedPlaySurface === 'browser' || savedPlaySurface === 'launchpad') playSurface = savedPlaySurface
      if (durations.includes(savedDuration as (typeof durations)[number])) {
        duration = savedDuration as (typeof durations)[number]
        remainingMs = duration * 1_000
      }
      if (savedDifficulty === 'easy' || savedDifficulty === 'medium' || savedDifficulty === 'hard') difficulty = savedDifficulty
      if (savedPlayerOne && usableColour(savedPlayerOne)) playerOneColour = savedPlayerOne
      if (savedPlayerTwo && usableColour(savedPlayerTwo) && !sameColour(savedPlayerOne ?? playerOneColour, savedPlayerTwo)) playerTwoColour = savedPlayerTwo
    } catch {
      // Preferences are optional.
    }
  }

  function startRound(): void {
    cancelRoundTimers()
    cancelPreview()
    board = createEmptyBoard()
    revealOwners = createBalancedRevealOwners()
    lastPainted = null
    remainingMs = duration * 1_000
    phase = 'countdown'
    countdown = 3
    const request = ++roundRequest

    const step = () => {
      if (request !== roundRequest || phase !== 'countdown') return
      if (countdown > 1) {
        countdown -= 1
        countdownTimeout = setTimeout(step, 650)
      } else {
        beginRound()
      }
    }
    countdownTimeout = setTimeout(step, 650)
  }

  async function requestStart(): Promise<void> {
    if (phase === 'playing' || phase === 'countdown') {
      stopRound()
      return
    }
    if (playSurface === 'launchpad' && !connected) {
      if (!isMidiSupported()) return
      connectionPending = true
      try {
        await connect()
        if (hardwareReady() && playSurface === 'launchpad') startRound()
      } finally {
        connectionPending = false
      }
      return
    }
    startRound()
  }

  function stopRound(): void {
    resetGame()
  }

  function beginRound(): void {
    phase = 'playing'
    timerDeadline = performance.now() + duration * 1_000
    timerInterval = setInterval(updateTimer, 50)
    if (mode === 'computer') scheduleComputerMove()
  }

  function updateTimer(): void {
    remainingMs = Math.max(0, timerDeadline - performance.now())
    if (remainingMs <= 0) finishRound()
  }

  function finishRound(): void {
    if (phase !== 'playing') return
    remainingMs = 0
    phase = 'finished'
    if (timerInterval) clearInterval(timerInterval)
    if (aiTimeout) clearTimeout(aiTimeout)
    timerInterval = null
    aiTimeout = null
  }

  function paintPad(index: number, source: PlaySurface): void {
    if (phase !== 'playing') return
    if (source !== playSurface) return
    board = mode === 'local' ? pressLocalPad(board, revealOwners, index) : pressHumanPad(board, index)
    lastPainted = index
  }

  function scheduleComputerMove(): void {
    if (phase !== 'playing' || mode !== 'computer') return
    aiTimeout = setTimeout(() => {
      if (phase !== 'playing' || mode !== 'computer') return
      const result = applyComputerPaint(board)
      board = result.board
      lastPainted = result.index
      scheduleComputerMove()
    }, computerPaceMs[difficulty])
  }

  function cancelRoundTimers(): void {
    roundRequest += 1
    if (countdownTimeout) clearTimeout(countdownTimeout)
    if (timerInterval) clearInterval(timerInterval)
    if (aiTimeout) clearTimeout(aiTimeout)
    countdownTimeout = null
    timerInterval = null
    aiTimeout = null
  }

  function resetGame(): void {
    cancelRoundTimers()
    phase = 'idle'
    board = createEmptyBoard()
    remainingMs = duration * 1_000
    lastPainted = null
  }

  function setMode(next: GameMode): void {
    if (phase === 'playing' || phase === 'countdown') return
    mode = next
    savePreference(modeKey, next)
    resetGame()
  }

  function setPlaySurface(next: PlaySurface): void {
    if (phase === 'playing' || phase === 'countdown') return
    playSurface = next
    savePreference(playSurfaceKey, next)
    resetGame()
  }

  function startButtonLabel(): string {
    if (phase === 'playing' || phase === 'countdown') return 'STOP ROUND'
    if (playSurface === 'launchpad' && !connected) {
      if (connectionPending || midiState.status === 'connecting') return 'CONNECTING LAUNCHPAD…'
      return 'CONNECT & START LAUNCHPAD'
    }
    if (phase === 'finished') return 'PLAY AGAIN'
    return playSurface === 'launchpad' ? `START ${duration} SEC ON LAUNCHPAD` : `START ${duration} SEC ON SCREEN`
  }

  function setDuration(next: (typeof durations)[number]): void {
    if (phase === 'playing' || phase === 'countdown') return
    duration = next
    remainingMs = next * 1_000
    savePreference(durationKey, String(next))
  }

  function setDifficulty(next: Difficulty): void {
    if (phase === 'playing' || phase === 'countdown') return
    difficulty = next
    savePreference(difficultyKey, next)
  }

  function updateColour(player: Player, event: Event): void {
    const input = event.target as HTMLInputElement
    const next = input.value.toLowerCase()
    const other = player === 1 ? playerTwoColour : playerOneColour
    if (!usableColour(next)) {
      colourWarning = 'Choose a brighter colour so it remains visible on the Launchpad.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }
    if (sameColour(next, other)) {
      colourWarning = 'Players need two different Launchpad colours.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }
    colourWarning = ''
    if (player === 1) {
      playerOneColour = next
      savePreference(playerOneColourKey, next)
    } else {
      playerTwoColour = next
      savePreference(playerTwoColourKey, next)
    }
  }

  function previewColours(): void {
    if (!connected || phase === 'playing' || phase === 'countdown') return
    cancelPreview()
    const one = hexToLaunchpadRgb(playerOneColour)
    const two = hexToLaunchpadRgb(playerTwoColour)
    paintFrame(cells.map((index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? one : two))
    previewTimeout = setTimeout(() => {
      paintFrame(board.map((cell) => cell === 1 ? one : cell === 2 ? two : off))
      previewTimeout = null
    }, 900)
  }

  function cancelPreview(): void {
    if (previewTimeout) clearTimeout(previewTimeout)
    previewTimeout = null
  }

  function handleOutputChange(event: Event): void {
    selectOutput((event.target as HTMLSelectElement).value)
  }

  function playerLabel(player: Player): string {
    if (mode === 'computer') return player === 1 ? 'You' : 'Computer'
    return `Player ${player}`
  }

  function usableColour(colour: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(colour) && hexToLaunchpadRgb(colour).reduce((sum, channel) => sum + channel, 0) >= 24
  }

  function sameColour(first: string, second: string): boolean {
    const a = hexToLaunchpadRgb(first)
    const b = hexToLaunchpadRgb(second)
    return a.every((channel, index) => channel === b[index])
  }

  function savePreference(key: string, value: string): void {
    try { localStorage.setItem(key, value) } catch { /* Preferences are optional. */ }
  }
</script>

<svelte:head><meta name="description" content="Race another player or a computer to cover an 8 by 8 Launchpad with your colour." /></svelte:head>

<main class="shell" style={`--player-one:${playerOneColour};--player-two:${playerTwoColour};--time:${timePercent}%;`}>
  <header><a href="../" aria-label="Back to Classroom Tools">← <span>Classroom Tools</span></a><span>LAUNCHPAD ARCADE</span><b class:urgent={phase === 'playing' && remainingMs < 10_000}>{timeText}</b></header>
  <section class="layout">
    <aside>
      <p class="eyebrow">TWO COLOURS. ONE GRID.</p><h1>PAINT<br /><em>WAR</em></h1>
      <p class="lede">Flip pads. Flood the board. Own the most colour when the clock reaches zero.</p>
      <div class="option-block surface-block"><span>PLAY SURFACE</span><div class="segmented" aria-label="Play surface"><button class:active={playSurface === 'browser'} aria-pressed={playSurface === 'browser'} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setPlaySurface('browser')}>ON SCREEN</button><button class:active={playSurface === 'launchpad'} aria-pressed={playSurface === 'launchpad'} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setPlaySurface('launchpad')}>LAUNCHPAD</button></div></div>
      <div class="segmented" aria-label="Game mode"><button class:active={mode === 'local'} aria-pressed={mode === 'local'} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setMode('local')}>2 PLAYERS</button><button class:active={mode === 'computer'} aria-pressed={mode === 'computer'} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setMode('computer')}>VS COMPUTER</button></div>
      {#if mode === 'computer'}<div class="option-block"><span>COMPUTER PACE</span><div class="three-way">{#each difficulties as level}<button class:active={difficulty === level} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setDifficulty(level)}>{level}</button>{/each}</div></div>{/if}
      <div class="option-block"><span>ROUND LENGTH</span><div class="three-way">{#each durations as seconds}<button class:active={duration === seconds} disabled={phase === 'playing' || phase === 'countdown'} onclick={() => setDuration(seconds)}>{seconds} SEC</button>{/each}</div></div>
      <div class="score">
        <section class:leading={counts.playerOne > counts.playerTwo}><label aria-label="Choose Player 1 colour"><input type="color" value={playerOneColour} oninput={(event) => updateColour(1, event)} /><i class="one"></i></label><div><small>{playerLabel(1).toUpperCase()}</small><strong>{mode === 'computer' ? 'TAP TO CLAIM · TAP YOURS = LOSE IT' : 'HUNT THE OTHER COLOUR'}</strong></div><b>{String(counts.playerOne).padStart(2, '0')}</b></section>
        <section class:leading={counts.playerTwo > counts.playerOne}><label aria-label="Choose Player 2 colour"><input type="color" value={playerTwoColour} oninput={(event) => updateColour(2, event)} /><i class="two"></i></label><div><small>{playerLabel(2).toUpperCase()}</small><strong>{mode === 'computer' ? `${difficulty.toUpperCase()} · ${(computerPaceMs[difficulty] / 1000).toFixed(2)}S` : 'HUNT THE OTHER COLOUR'}</strong></div><b>{String(counts.playerTwo).padStart(2, '0')}</b></section>
      </div>
      {#if colourWarning}<p class="warning" aria-live="polite">{colourWarning}</p>{/if}
      <button class="start" class:launchpad-start={playSurface === 'launchpad'} class:stop={phase === 'playing' || phase === 'countdown'} onclick={() => void requestStart()} disabled={phase !== 'playing' && phase !== 'countdown' && playSurface === 'launchpad' && (!isMidiSupported() || connectionPending || midiState.status === 'connecting')}>{startButtonLabel()} <span>{phase === 'playing' || phase === 'countdown' ? '■' : '→'}</span></button>
      <p class="instructions">{playSurface === 'launchpad' ? 'Select Launchpad, then use the button above to connect and begin. The browser board becomes a live mirror.' : 'Use the mirrored browser grid directly. Select Launchpad above when you want physical-pad input.'} {mode === 'local' ? 'An empty pad reveals one balanced random colour; every later press flips it.' : 'Empty pads become your colour while the computer claims empties and steals yours.'}</p>
      <section class="device-panel" class:connected><div><span>{playSurface === 'launchpad' ? 'LAUNCHPAD SELECTED' : 'LAUNCHPAD HARDWARE'}</span><i></i></div>{#if midiState.outputs.length > 0}<select aria-label="Launchpad lighting output" value={midiState.selectedOutput?.id ?? ''} onchange={handleOutputChange}>{#each midiState.outputs as output (output.id)}<option value={output.id}>{getOutputLabel(output)}</option>{/each}</select>{/if}<p class:error={midiState.status === 'error'}>{midiState.statusMessage}</p><div class="device-actions"><button onclick={() => void connect()} disabled={!isMidiSupported() || midiState.status === 'connecting' || midiState.status === 'connected'}>{midiState.status === 'connecting' ? 'CONNECTING…' : midiState.status === 'connected' ? 'MIDI ACCESS ON' : isMidiSupported() ? 'CONNECT LAUNCHPAD' : 'USE CHROME FOR MIDI'}</button>{#if connected}<button onclick={previewColours} disabled={phase === 'playing' || phase === 'countdown'}>TEST COLOURS</button>{/if}</div></section>
    </aside>

    <section class="board-card" aria-label="Paint War board">
      <div class="board-head"><span>{phaseLabel}</span><span>{64 - counts.empty} / 64 PAINTED</span></div><div class="time-track"><i></i></div>
      <div class="launchpad-frame"><div class="grid" role="grid" aria-label={`8 by 8 Paint War ${playSurface === 'launchpad' ? 'Launchpad mirror' : 'browser board'}`}>{#each cells as cell}<button class="pad" class:one={board[cell] === 1} class:two={board[cell] === 2} class:last={lastPainted === cell} disabled={phase !== 'playing' || playSurface === 'launchpad'} aria-label={`Pad ${cell + 1}, ${board[cell] === 1 ? playerLabel(1) : board[cell] === 2 ? playerLabel(2) : 'unpainted'}`} onclick={() => paintPad(cell, 'browser')}></button>{/each}</div>{#if phase === 'countdown'}<div class="countdown" aria-live="assertive"><span>GET READY</span><b>{countdown}</b></div>{/if}</div>
      <div class="coverage" aria-label={`${paintedPercent.toFixed(0)} percent of the board painted`}><i class="one" style={`width:${counts.playerOne / 64 * 100}%`}></i><i class="two" style={`width:${counts.playerTwo / 64 * 100}%`}></i></div>
      {#if phase === 'finished'}<div class="result" aria-live="assertive"><span>TIME</span><strong>{winner === null ? 'DRAW' : `${playerLabel(winner)} wins`}</strong><b>{counts.playerOne} — {counts.playerTwo}</b></div>{/if}
      <div class="board-foot"><span>ANY PRESS FLIPS A PAINTED PAD</span><span>{playSurface === 'launchpad' ? 'LAUNCHPAD INPUT · SCREEN MIRROR' : phase === 'playing' ? 'SCREEN INPUT · KEEP MOVING' : 'BROWSER BOARD'}</span></div>
    </section>
  </section>
</main>
