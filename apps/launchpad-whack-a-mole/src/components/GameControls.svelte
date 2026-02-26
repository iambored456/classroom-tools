<script lang="ts">
  import { startGame, resetGame, setTimerDuration, gameState, formatTime } from '../lib/game.svelte.ts'
  import { midiState } from '../lib/midi.svelte.ts'

  const isConnected = $derived(midiState.status === 'connected')
  const isPlaying = $derived(gameState.gamePhase === 'playing')
  const isCountdown = $derived(gameState.gamePhase === 'countdown')
  const canStart = $derived(isConnected && gameState.gamePhase === 'idle')

  function handleTimerChange(event: Event) {
    setTimerDuration(parseInt((event.target as HTMLSelectElement).value, 10))
  }
</script>

<div class="controls">
  <select onchange={handleTimerChange} disabled={isPlaying || isCountdown} aria-label="Game duration">
    <option value="15">15 Seconds</option>
    <option value="30" selected>30 Seconds</option>
    <option value="60">1 Minute</option>
    <option value="120">2 Minutes</option>
  </select>
  <div class="buttons">
    <button onclick={startGame} disabled={!canStart}>Start Game</button>
    <button onclick={resetGame} disabled={gameState.gamePhase === 'idle'}>Reset Round</button>
  </div>
  <div class="timer-display">
    {#if isCountdown}
      {gameState.countdownText}
    {:else}
      Time: {formatTime(gameState.timeLeft)}
    {/if}
  </div>
</div>

<style>
  .controls {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .buttons {
    display: flex;
    gap: 10px;
  }

  .timer-display {
    font-size: 24px;
    font-weight: bold;
    color: #ffcc00;
  }

  @media (max-width: 600px) {
    .timer-display {
      font-size: 20px;
    }
  }
</style>
