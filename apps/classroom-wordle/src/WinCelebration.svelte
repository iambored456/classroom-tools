<script lang="ts">
  import Fireworks from './Fireworks.svelte'

  export let guessesUsed: number
</script>

<Fireworks />
  <section class="success-panel" aria-labelledby="success-title" aria-live="polite">
    <h2 id="success-title">success!</h2>
    <p id="success-description">You found the word in {guessesUsed} {guessesUsed === 1 ? 'guess' : 'guesses'}!</p>
  </section>
