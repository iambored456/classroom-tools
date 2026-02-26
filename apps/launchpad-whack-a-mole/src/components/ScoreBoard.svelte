<script lang="ts">
  import { gameState } from '../lib/game.svelte.ts'
</script>

<div class="scoreboard">
  <h1>Whack-a-Mole</h1>
  <div class="score-display">Score: {gameState.score}</div>
</div>

<style>
  .scoreboard {
    margin-bottom: 20px;
  }

  h1 {
    font-size: 48px;
    margin-bottom: 10px;
    color: #ffffff;
  }

  .score-display {
    font-size: 36px;
    font-weight: bold;
    background-color: #222222;
    padding: 10px 20px;
    border-radius: 10px;
    display: inline-block;
  }

  @media (max-width: 600px) {
    h1 {
      font-size: 36px;
    }
    .score-display {
      font-size: 24px;
    }
  }
</style>
