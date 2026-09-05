<script lang="ts">
  import { onMount } from 'svelte'
  import { chooseAiMove, type AiDifficulty } from './lib/ai.ts'
  import {
    colourDistance,
    defaultPlayerColours,
    hexToLaunchpadRgb,
  } from './lib/colours.ts'
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
    applyMove,
    coordinateName,
    countDiscs,
    createInitialBoard,
    getLegalMoves,
    resolveTurn,
    winner,
    type Board,
    type Player,
  } from './lib/reversi.ts'
  import {
    aiMoveFlashSteps,
    createScoreDisplayBoard,
    endgameSteps,
    shouldShowLegalMoves,
    type EndgamePhase,
    type GameMode,
  } from './lib/presentation.ts'

  const cells = Array.from({ length: 64 }, (_, index) => index)
  const blankBoard: Board = Array<0 | 1 | 2>(64).fill(0)
  const off: LaunchpadRgb = [0, 0, 0]
  const legalMoveColour: LaunchpadRgb = [18, 18, 18]
  const modeKey = 'launchpad-reversi-mode'
  const difficultyKey = 'launchpad-reversi-ai-difficulty'
  const playerOneColourKey = 'launchpad-reversi-player-one-colour'
  const playerTwoColourKey = 'launchpad-reversi-player-two-colour'

  let board: Board = $state(createInitialBoard())
  let currentPlayer: Player = $state(1)
  let gameMode: GameMode = $state('local')
  let aiDifficulty: AiDifficulty = $state('medium')
  let playerOneColour: string = $state(defaultPlayerColours[0])
  let playerTwoColour: string = $state(defaultPlayerColours[1])
  let gameOver = $state(false)
  let lastMove: number | null = $state(null)
  let notice = $state('Player 1 opens the game.')
  let colourWarning = $state('')
  let aiThinking = $state(false)
  let aiMoveFlashIndex: number | null = $state(null)
  let aiMoveFlashHidden = $state(false)
  let endgamePhase = $state<EndgamePhase>('playing')
  let aiTimeout: ReturnType<typeof setTimeout> | null = null
  let aiMoveFlashTimeout: ReturnType<typeof setTimeout> | null = null
  let colourPreviewTimeout: ReturnType<typeof setTimeout> | null = null
  let endgameTimeout: ReturnType<typeof setTimeout> | null = null
  let aiRequest = 0
  let aiMoveFlashRequest = 0
  let endgameRequest = 0
  let prefersReducedMotion = false

  const legalMoves = $derived(getLegalMoves(board, currentPlayer))
  const legalMoveSet = $derived(new Set(legalMoves))
  const scores = $derived(countDiscs(board))
  const showLegalMoves = $derived(shouldShowLegalMoves(gameOver, gameMode, currentPlayer))
  const presentedBoard = $derived(
    endgamePhase === 'flash-off'
      ? blankBoard
      : endgamePhase === 'score'
        ? createScoreDisplayBoard(scores)
        : board,
  )
  const connected = $derived(hardwareReady())
  const winningPlayer = $derived(gameOver ? winner(board) : null)
  const turnLabel = $derived(
    gameOver
      ? winningPlayer === null
        ? 'DRAW GAME'
        : `${playerLabel(winningPlayer).toUpperCase()} WINS`
      : aiThinking
        ? 'COMPUTER THINKING'
        : `${playerLabel(currentPlayer).toUpperCase()} TO MOVE`,
  )
  const hintInstruction = $derived(
    aiMoveFlashIndex !== null
      ? 'The computer’s newly placed disc is flashing twice.'
      : gameOver
      ? endgamePhase === 'score'
        ? `${playerLabel(1)} is stacked from the top; ${playerLabel(2)} is stacked from the bottom.`
        : 'The final position is flashing before the score display.'
      : showLegalMoves
        ? 'Lit empty pads are legal moves—press one to place a disc and flip every trapped line.'
        : 'The computer’s possible moves stay hidden while it chooses.',
  )

  $effect(() => {
    paintFrame(frameForBoard())
  })

  onMount(() => {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    restorePreferences()
    setPadPressCallback(handleMidiPad)

    return () => {
      cancelAi()
      cancelAiMoveFlash()
      cancelEndgameSequence()
      cancelColourPreview()
      disposeMidi()
    }
  })

  function restorePreferences(): void {
    try {
      const savedMode = localStorage.getItem(modeKey)
      const savedDifficulty = localStorage.getItem(difficultyKey)
      const savedPlayerOne = localStorage.getItem(playerOneColourKey)
      const savedPlayerTwo = localStorage.getItem(playerTwoColourKey)
      if (savedMode === 'local' || savedMode === 'computer') gameMode = savedMode
      if (savedDifficulty === 'easy' || savedDifficulty === 'medium' || savedDifficulty === 'hard') {
        aiDifficulty = savedDifficulty
      }
      const restoredPlayerOne = savedPlayerOne && isUsableColour(savedPlayerOne)
        ? savedPlayerOne.toLowerCase()
        : defaultPlayerColours[0]
      const restoredPlayerTwo = savedPlayerTwo && isUsableColour(savedPlayerTwo)
        ? savedPlayerTwo.toLowerCase()
        : defaultPlayerColours[1]
      if (sameLaunchpadColour(restoredPlayerOne, restoredPlayerTwo)) {
        playerOneColour = defaultPlayerColours[0]
        playerTwoColour = defaultPlayerColours[1]
      } else {
        playerOneColour = restoredPlayerOne
        playerTwoColour = restoredPlayerTwo
      }
      notice = gameMode === 'computer' ? 'You open the game.' : 'Player 1 opens the game.'
    } catch {
      // Preferences are optional when browser storage is unavailable.
    }
  }

  function frameForBoard(): LaunchpadRgb[] {
    const playerOneRgb = hexToLaunchpadRgb(playerOneColour)
    const playerTwoRgb = hexToLaunchpadRgb(playerTwoColour)
    return presentedBoard.map((disc, index) => {
      if (endgamePhase === 'playing' && aiMoveFlashHidden && aiMoveFlashIndex === index) return off
      if (disc === 1) return playerOneRgb
      if (disc === 2) return playerTwoRgb
      if (showLegalMoves && legalMoveSet.has(index)) return legalMoveColour
      return off
    })
  }

  function playMove(index: number, computerMove = false): void {
    if (gameOver || !legalMoveSet.has(index)) return
    if (gameMode === 'computer' && currentPlayer === 2 && !computerMove) return
    if (!computerMove) cancelAiMoveFlash()

    const playerWhoMoved = currentPlayer
    board = applyMove(board, playerWhoMoved, index)
    lastMove = index
    const turn = resolveTurn(board, playerWhoMoved)

    if (turn.gameOver) {
      gameOver = true
      aiThinking = false
      notice = gameResultText()
      if (computerMove && gameMode === 'computer') {
        startAiMoveFlash(index, startEndgameSequence)
      } else {
        startEndgameSequence()
      }
      return
    }

    currentPlayer = turn.nextPlayer
    notice = turn.passedPlayer
      ? `${playerLabel(turn.passedPlayer)} has no legal move. ${playerLabel(turn.nextPlayer)} plays again.`
      : `${playerLabel(playerWhoMoved)} played ${coordinateName(index)}.`

    const continueTurn = () => {
      if (gameMode === 'computer' && currentPlayer === 2) scheduleAiMove()
    }

    if (computerMove && gameMode === 'computer') {
      startAiMoveFlash(index, continueTurn)
    } else {
      continueTurn()
    }
  }

  function scheduleAiMove(): void {
    cancelAi()
    if (gameOver || gameMode !== 'computer' || currentPlayer !== 2) return
    aiThinking = true
    const request = ++aiRequest
    const boardSnapshot = [...board]
    const difficultySnapshot = aiDifficulty

    aiTimeout = setTimeout(() => {
      const move = chooseAiMove(boardSnapshot, 2, difficultySnapshot)
      if (request !== aiRequest || gameOver || gameMode !== 'computer' || currentPlayer !== 2) return
      aiThinking = false
      if (move !== null) playMove(move, true)
    }, 360)
  }

  function cancelAi(): void {
    aiRequest += 1
    if (aiTimeout) clearTimeout(aiTimeout)
    aiTimeout = null
    aiThinking = false
  }

  function newGame(): void {
    cancelAi()
    cancelAiMoveFlash()
    cancelEndgameSequence()
    cancelColourPreview()
    board = createInitialBoard()
    currentPlayer = 1
    gameOver = false
    lastMove = null
    notice = gameMode === 'computer' ? 'You open the game.' : 'Player 1 opens the game.'
  }

  function startAiMoveFlash(index: number, onComplete: () => void): void {
    cancelAiMoveFlash()
    cancelColourPreview()

    if (prefersReducedMotion) {
      onComplete()
      return
    }

    aiMoveFlashIndex = index
    aiMoveFlashHidden = false
    const request = ++aiMoveFlashRequest
    let stepIndex = 0

    const finish = () => {
      if (request !== aiMoveFlashRequest) return
      aiMoveFlashTimeout = null
      aiMoveFlashIndex = null
      aiMoveFlashHidden = false
      onComplete()
    }

    const advance = () => {
      if (request !== aiMoveFlashRequest) return
      const step = aiMoveFlashSteps[stepIndex]
      aiMoveFlashHidden = step.hidden
      stepIndex += 1
      aiMoveFlashTimeout = setTimeout(
        stepIndex < aiMoveFlashSteps.length ? advance : finish,
        step.duration,
      )
    }

    aiMoveFlashTimeout = setTimeout(advance, 160)
  }

  function cancelAiMoveFlash(): void {
    aiMoveFlashRequest += 1
    if (aiMoveFlashTimeout) clearTimeout(aiMoveFlashTimeout)
    aiMoveFlashTimeout = null
    aiMoveFlashIndex = null
    aiMoveFlashHidden = false
  }

  function startEndgameSequence(): void {
    cancelAiMoveFlash()
    cancelEndgameSequence()
    cancelColourPreview()
    endgamePhase = 'flash-board'

    if (prefersReducedMotion) {
      endgamePhase = 'score'
      return
    }

    const request = ++endgameRequest
    let stepIndex = 0
    const advance = () => {
      if (request !== endgameRequest || !gameOver) return
      const step = endgameSteps[stepIndex]
      endgamePhase = step.phase
      stepIndex += 1
      if (stepIndex < endgameSteps.length) {
        endgameTimeout = setTimeout(advance, step.duration)
      } else {
        endgameTimeout = null
      }
    }

    endgameTimeout = setTimeout(advance, 240)
  }

  function cancelEndgameSequence(): void {
    endgameRequest += 1
    if (endgameTimeout) clearTimeout(endgameTimeout)
    endgameTimeout = null
    endgamePhase = 'playing'
  }

  function cancelColourPreview(): void {
    if (colourPreviewTimeout) clearTimeout(colourPreviewTimeout)
    colourPreviewTimeout = null
  }

  function setGameMode(mode: GameMode): void {
    if (gameMode === mode) return
    gameMode = mode
    savePreference(modeKey, mode)
    newGame()
  }

  function setDifficulty(difficulty: AiDifficulty): void {
    aiDifficulty = difficulty
    savePreference(difficultyKey, difficulty)
    if (gameMode === 'computer' && currentPlayer === 2 && aiMoveFlashIndex === null) scheduleAiMove()
  }

  function updatePlayerColour(player: Player, event: Event): void {
    const input = event.target as HTMLInputElement
    const colour = input.value.toLowerCase()
    const otherColour = player === 1 ? playerTwoColour : playerOneColour
    const rgb = hexToLaunchpadRgb(colour)

    if (rgb[0] + rgb[1] + rgb[2] < 24) {
      colourWarning = 'That colour is too dark for an unlit Launchpad board.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }
    if (sameLaunchpadColour(colour, otherColour)) {
      colourWarning = 'Players need two different controller colours.'
      input.value = player === 1 ? playerOneColour : playerTwoColour
      return
    }

    if (player === 1) {
      playerOneColour = colour
      savePreference(playerOneColourKey, colour)
    } else {
      playerTwoColour = colour
      savePreference(playerTwoColourKey, colour)
    }
    colourWarning = colourDistance(colour, otherColour) < 90
      ? 'These colours may be difficult to distinguish on the Launchpad.'
      : ''
  }

  function previewColours(): void {
    if (!connected || aiMoveFlashIndex !== null || (gameOver && endgamePhase !== 'score')) return
    cancelColourPreview()
    const playerOneRgb = hexToLaunchpadRgb(playerOneColour)
    const playerTwoRgb = hexToLaunchpadRgb(playerTwoColour)
    paintFrame(cells.map((index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? playerOneRgb : playerTwoRgb))
    colourPreviewTimeout = setTimeout(() => {
      paintFrame(frameForBoard())
      colourPreviewTimeout = null
    }, 900)
  }

  function handleMidiPad(note: number): void {
    const index = noteMapping.indexOf(note)
    if (index >= 0) playMove(index)
  }

  function handleOutputChange(event: Event): void {
    selectOutput((event.target as HTMLSelectElement).value)
  }

  function playerLabel(player: Player): string {
    if (gameMode === 'computer') return player === 1 ? 'You' : 'Computer'
    return `Player ${player}`
  }

  function gameResultText(): string {
    const gameWinner = winner(board)
    const finalScores = countDiscs(board)
    if (gameWinner === null) return `Draw: ${finalScores.playerOne}–${finalScores.playerTwo}.`
    return `${playerLabel(gameWinner)} wins ${Math.max(finalScores.playerOne, finalScores.playerTwo)}–${Math.min(finalScores.playerOne, finalScores.playerTwo)}.`
  }

  function isUsableColour(colour: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(colour)
      && hexToLaunchpadRgb(colour).reduce((sum, channel) => sum + channel, 0) >= 24
  }

  function sameLaunchpadColour(first: string, second: string): boolean {
    const firstRgb = hexToLaunchpadRgb(first)
    const secondRgb = hexToLaunchpadRgb(second)
    return firstRgb.every((channel, index) => channel === secondRgb[index])
  }

  function savePreference(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Preferences are optional when browser storage is unavailable.
    }
  }
</script>

<svelte:head>
  <meta name="description" content="Play two-player Reversi or challenge the computer on an 8 by 8 Novation Launchpad." />
</svelte:head>

<main
  class="app-shell"
  style={`--player-one: ${playerOneColour}; --player-two: ${playerTwoColour};`}
>
  <header class="topbar">
    <a href="../" aria-label="Back to Classroom Tools">← <span>Classroom Tools</span></a>
    <div class="brand"><i></i> LAUNCHPAD TABLETOP</div>
    <span class="status"><i class:thinking={aiThinking}></i> {gameOver ? 'GAME OVER' : aiThinking ? 'THINKING' : 'READY'}</span>
  </header>

  <section class="game-layout">
    <aside class="control-column">
      <p class="eyebrow">CLASSIC 8 × 8</p>
      <h1>REVE<span>R</span>SI</h1>
      <p class="lede">Outflank. Flip. Control the board.</p>

      <div class="mode-switch" aria-label="Game mode">
        <button class:active={gameMode === 'local'} aria-pressed={gameMode === 'local'} onclick={() => setGameMode('local')}>2 PLAYERS</button>
        <button class:active={gameMode === 'computer'} aria-pressed={gameMode === 'computer'} onclick={() => setGameMode('computer')}>VS COMPUTER</button>
      </div>

      {#if gameMode === 'computer'}
        <fieldset class="difficulty-picker">
          <legend>COMPUTER LEVEL</legend>
          <div>
            {#each ['easy', 'medium', 'hard'] as difficulty}
              <button
                type="button"
                class:active={aiDifficulty === difficulty}
                aria-pressed={aiDifficulty === difficulty}
                onclick={() => setDifficulty(difficulty as AiDifficulty)}
              >{difficulty}</button>
            {/each}
          </div>
        </fieldset>
      {/if}

      <div class="players">
        <section class="player-card" class:active={!gameOver && currentPlayer === 1}>
          <label class="colour-picker" aria-label="Choose Player 1 colour" title="Choose Player 1 colour">
            <input type="color" value={playerOneColour} oninput={(event) => updatePlayerColour(1, event)} />
            <span class="disc player-one"></span>
          </label>
          <div><small>{gameMode === 'computer' ? 'YOU' : 'PLAYER 1'}</small><strong>{!gameOver && currentPlayer === 1 ? 'YOUR TURN' : 'WAITING'}</strong></div>
          <b>{String(scores.playerOne).padStart(2, '0')}</b>
        </section>
        <section class="player-card" class:active={!gameOver && currentPlayer === 2}>
          <label class="colour-picker" aria-label="Choose Player 2 colour" title="Choose Player 2 colour">
            <input type="color" value={playerTwoColour} oninput={(event) => updatePlayerColour(2, event)} />
            <span class="disc player-two"></span>
          </label>
          <div><small>{gameMode === 'computer' ? `COMPUTER · ${aiDifficulty.toUpperCase()}` : 'PLAYER 2'}</small><strong>{!gameOver && currentPlayer === 2 ? aiThinking ? 'THINKING' : 'YOUR TURN' : 'WAITING'}</strong></div>
          <b>{String(scores.playerTwo).padStart(2, '0')}</b>
        </section>
      </div>
      <p class="colour-copy">Select either glowing disc for a custom RGB colour. Launchpad X and Pro mirror it exactly; other MIDI devices use their closest palette colour.</p>
      {#if colourWarning}<p class="colour-warning" aria-live="polite">{colourWarning}</p>{/if}

      <button class="new-game" onclick={newGame}>NEW GAME <span>↻</span></button>
      <p class="hint-copy">{notice} {hintInstruction}</p>

      <section class="device-panel" class:connected>
        <div class="device-heading"><span>HARDWARE</span><i></i></div>
        {#if midiState.outputs.length > 0}
          <label class="output-select">
            <span>Lighting output</span>
            <select value={midiState.selectedOutput?.id ?? ''} onchange={handleOutputChange}>
              {#each midiState.outputs as output (output.id)}<option value={output.id}>{getOutputLabel(output)}</option>{/each}
            </select>
          </label>
        {/if}
        <p class:error={midiState.status === 'error'}>{midiState.statusMessage}</p>
        <div class="device-actions">
          <button onclick={() => void connect()} disabled={!isMidiSupported() || midiState.status === 'connecting' || midiState.status === 'connected'}>
            {midiState.status === 'connecting' ? 'CONNECTING…' : midiState.status === 'connected' ? 'MIDI ACCESS ON' : isMidiSupported() ? 'CONNECT LAUNCHPAD' : 'USE CHROME FOR MIDI'}
          </button>
          {#if connected}<button onclick={previewColours} disabled={aiMoveFlashIndex !== null || (gameOver && endgamePhase !== 'score')}>TEST COLOURS</button>{/if}
        </div>
      </section>
    </aside>

    <section class="board-card" aria-label="Reversi board">
      <div class="board-heading"><span>TURN / {turnLabel}</span><span>{64 - scores.empty} DISCS</span></div>
      <div class="launchpad-frame">
        <div
          class="grid"
          class:score-display={endgamePhase === 'score'}
          data-endgame-phase={endgamePhase}
          role="grid"
          aria-label={endgamePhase === 'score' ? '8 by 8 final score display' : '8 by 8 Reversi board'}
        >
          {#each cells as cell}
            {@const disc = presentedBoard[cell]}
            {@const isLegal = showLegalMoves && legalMoveSet.has(cell)}
            <button
              class="pad"
              class:legal={isLegal}
              class:ai-move-flash={aiMoveFlashIndex === cell}
              class:ai-move-flash-off={aiMoveFlashHidden && aiMoveFlashIndex === cell}
              class:last-move={endgamePhase === 'playing' && lastMove === cell && aiMoveFlashIndex !== cell}
              disabled={!isLegal || aiThinking || (gameMode === 'computer' && currentPlayer === 2)}
              aria-label={endgamePhase === 'score'
                ? `${coordinateName(cell)}, score display, ${disc ? playerLabel(disc) : 'unoccupied'}`
                : `${coordinateName(cell)}${disc ? `, ${playerLabel(disc)}` : isLegal ? ', legal move' : ', empty'}`}
              onclick={() => playMove(cell)}
            >
              {#if disc === 1}<span class="disc player-one"></span>{/if}
              {#if disc === 2}<span class="disc player-two"></span>{/if}
              {#if isLegal}<span class="legal-dot"></span>{/if}
            </button>
          {/each}
        </div>

      </div>
      {#if gameOver && endgamePhase === 'score'}
        <div
          class="game-result"
          aria-live="assertive"
          aria-label={`Final score: ${playerLabel(1)}, ${scores.playerOne}; ${playerLabel(2)}, ${scores.playerTwo}.`}
        >
          <span>FINAL SCORE</span>
          <strong>{winningPlayer === null ? 'DRAW' : `${playerLabel(winningPlayer)} wins`}</strong>
          <b>{scores.playerOne} — {scores.playerTwo}</b>
          <button onclick={newGame}>PLAY AGAIN</button>
        </div>
      {/if}
      <div class="board-footer">
        {#if aiMoveFlashIndex !== null}
          <span>COMPUTER MOVE / {coordinateName(aiMoveFlashIndex)}</span>
          <span>FLASHING TWICE</span>
        {:else if endgamePhase === 'score'}
          <span>TOP / {playerLabel(1)} / {scores.playerOne}</span>
          <span>{scores.playerTwo} / {playerLabel(2)} / BOTTOM</span>
        {:else if gameOver}
          <span>FINAL POSITION</span><span>COUNTING SCORE</span>
        {:else}
          <span>8 × 8 LIVE MIRROR</span><span>{aiThinking ? 'COMPUTER IS CHOOSING' : 'PRESS A LIT PAD'}</span>
        {/if}
      </div>
    </section>
  </section>
</main>
