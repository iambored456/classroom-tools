<script lang="ts">
  import { onMount } from 'svelte'
  import GameControls from './components/GameControls.svelte'
  import MidiPanel from './components/MidiPanel.svelte'
  import PadGrid from './components/PadGrid.svelte'
  import ScoreBoard from './components/ScoreBoard.svelte'
  import {
    disposeGame,
    gameState,
    handlePadPress,
    initializeGame,
  } from './lib/game.svelte.ts'
  import {
    disposeMidi,
    midiState,
    noteMapping,
    setConnectionFeedbackAllowed,
    setIdlePadFeedbackAllowed,
    setNoteCallback,
  } from './lib/midi.svelte.ts'

  $effect(() => {
    const idleLightingAllowed = gameState.gamePhase === 'idle' || gameState.gamePhase === 'ended'
    setConnectionFeedbackAllowed(idleLightingAllowed)
    setIdlePadFeedbackAllowed(idleLightingAllowed)
  })

  onMount(() => {
    initializeGame()
    setNoteCallback(handlePadPress)

    return () => {
      disposeGame()
      disposeMidi()
    }
  })
</script>

<svelte:head>
  <meta
    name="description"
    content="A fast, colorful whack-a-mole game for Novation Launchpad or on-screen play."
  />
</svelte:head>

<main class="game-shell">
  <header class="hero">
    <a class="home-link" href="../" aria-label="Back to Classroom Tools">
      <span aria-hidden="true">←</span>
      Classroom Tools
    </a>
    <p class="eyebrow">Classroom arcade</p>
    <div class="title-row">
      <div>
        <h1>Launchpad<br /><span>Whack-a-Mole</span></h1>
        <p class="lede">Hit the glow. Build a streak. Beat the clock.</p>
      </div>
      <div class="best-score" aria-label="Best score {gameState.bestScore}">
        <span>Personal best</span>
        <strong>{gameState.bestScore.toLocaleString()}</strong>
      </div>
    </div>
  </header>

  <div class="workspace">
    <section class="play-card" aria-label="Game board">
      <div class="play-card-topline">
        <div class="phase-indicator" data-phase={gameState.gamePhase}>
          <span class="phase-dot"></span>
          {gameState.gamePhase === 'idle'
            ? 'Ready'
            : gameState.gamePhase === 'countdown'
              ? 'Starting'
              : gameState.gamePhase === 'playing'
                ? 'Round live'
                : 'Round complete'}
        </div>
        <div class="play-mode">
          {midiState.selectedOutput ? 'Launchpad + screen' : 'On-screen mode'}
        </div>
      </div>

      <div class="board-wrap" class:is-playing={gameState.gamePhase === 'playing'}>
        <PadGrid
          {noteMapping}
          activeNote={gameState.activeNote}
          activePadColor={gameState.activePadColor?.hex ?? null}
          explosionPads={gameState.explosionPads}
          countdownNotes={gameState.countdownNotes}
          targetProgress={gameState.targetProgress}
          interactive={gameState.gamePhase === 'playing'}
          onPadPress={handlePadPress}
        />

        {#if gameState.gamePhase === 'countdown'}
          <div class="countdown-badge" aria-live="assertive">{gameState.countdownText}</div>
        {/if}
      </div>

      <div class="feedback" class:hit={gameState.feedbackTone === 'hit'} class:miss={gameState.feedbackTone === 'miss'} aria-live="polite">
        {gameState.feedbackText}
      </div>
      <GameControls />
    </section>

    <aside class="side-panel">
      <ScoreBoard />
      <MidiPanel />

      <section class="how-to-card">
        <p class="section-kicker">How to play</p>
        <ol>
          <li><span>1</span><p>Connect your Launchpad X or Pro, or use the board on screen.</p></li>
          <li><span>2</span><p>Hit each glowing pad before it fades.</p></li>
          <li><span>3</span><p>Quick hits and long streaks earn bonus points.</p></li>
        </ol>
      </section>
    </aside>
  </div>
</main>
