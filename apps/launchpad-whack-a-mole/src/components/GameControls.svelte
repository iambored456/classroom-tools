<script lang="ts">
  import {
    DIFFICULTIES,
    type Difficulty,
    gameState,
    resetGame,
    setDifficulty,
    setTimerDuration,
    startGame,
  } from '../lib/game.svelte.ts'

  const settingsLocked = $derived(
    gameState.gamePhase === 'playing' || gameState.gamePhase === 'countdown',
  )
  const canStart = $derived(!settingsLocked)

  function handleTimerChange(event: Event): void {
    setTimerDuration(Number.parseInt((event.target as HTMLSelectElement).value, 10))
  }

  function handleDifficultyChange(event: Event): void {
    setDifficulty((event.target as HTMLSelectElement).value as Difficulty)
  }
</script>

<div class="controls">
  <div class="settings-row">
    <label>
      <span>Round</span>
      <select
        value={gameState.timerDuration}
        onchange={handleTimerChange}
        disabled={settingsLocked}
        aria-label="Round duration"
      >
        <option value="15">15 seconds</option>
        <option value="30">30 seconds</option>
        <option value="60">1 minute</option>
        <option value="120">2 minutes</option>
      </select>
    </label>

    <label>
      <span>Pace</span>
      <select
        value={gameState.difficulty}
        onchange={handleDifficultyChange}
        disabled={settingsLocked}
        aria-label="Game pace"
      >
        {#each Object.entries(DIFFICULTIES) as [value, settings]}
          <option {value}>{settings.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="action-row">
    <button class="primary-button" onclick={() => void startGame()} disabled={!canStart}>
      {gameState.gamePhase === 'ended' ? 'Play again' : 'Start round'}
      <span aria-hidden="true">→</span>
    </button>
    <button
      class="secondary-button"
      onclick={resetGame}
      disabled={gameState.gamePhase === 'idle'}
    >
      {settingsLocked ? 'End round' : 'Reset'}
    </button>
  </div>
</div>
