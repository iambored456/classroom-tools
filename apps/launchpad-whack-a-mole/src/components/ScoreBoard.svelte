<script lang="ts">
  import { formatTime, gameState, getAccuracy } from '../lib/game.svelte.ts'

  const accuracy = $derived(getAccuracy())
</script>

<section class="scoreboard">
  <div class="score-header">
    <div>
      <p class="section-kicker">Current round</p>
      <h2>Score</h2>
    </div>
    <div class="round-timer" class:ending={gameState.gamePhase === 'playing' && gameState.timeLeft <= 5}>
      <span>Time</span>
      <strong>{formatTime(gameState.timeLeft)}</strong>
    </div>
  </div>

  <div class="score-value">
    {gameState.score.toLocaleString()}
    {#if gameState.lastScoreGain > 0 && gameState.gamePhase === 'playing'}
      <span>+{gameState.lastScoreGain}</span>
    {/if}
  </div>

  <div class="stat-grid">
    <div><strong>{gameState.hits}</strong><span>Hits</span></div>
    <div><strong>{accuracy}%</strong><span>Accuracy</span></div>
    <div><strong>{gameState.streak}</strong><span>Streak</span></div>
    <div><strong>{gameState.misses}</strong><span>Misses</span></div>
  </div>

  {#if gameState.gamePhase === 'ended'}
    <div class="result-banner" class:new-best={gameState.isNewBest}>
      <span>{gameState.isNewBest ? 'New personal best' : 'Best streak'}</span>
      <strong>{gameState.isNewBest ? gameState.score.toLocaleString() : gameState.bestStreak}</strong>
    </div>
  {/if}
</section>
