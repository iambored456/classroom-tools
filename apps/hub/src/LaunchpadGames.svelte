<script lang="ts">
  import { onMount } from 'svelte'
  import { withBase } from './lib/apps'

  const games = [
    { id: 'whack-a-mole', name: 'Whack-a-Mole', preview: 'WhackaMole', color: '#f1cbbd', players: '1 player', description: 'Hit each lit pad as fast as you can before time runs out.' },
    { id: 'snake', name: 'Snake', preview: 'Snake', color: '#e3efb9', players: '1 player', description: 'Collect food without hitting the walls or your own tail.' },
    { id: 'reversi', name: 'Reversi', preview: 'Reversi', color: '#c2e8d8', players: '1–2 players', description: 'Trap and flip your opponent’s pieces to control the board.' },
    { id: 'paint-war', name: 'Paint War', preview: 'PaintWar', color: '#f3c5d9', players: '1–2 players', description: 'Tap pads to claim more squares than your opponent.' },
    { id: 'finger-twister', name: 'Finger Twister', preview: 'FingerTwister', color: '#e5e8b8', players: '1–2 players', description: 'Hold each new lit pad without letting go of the others.' },
  ]

  const themeKey = 'launchpad-games.dark-mode'
  let darkMode = $state(true)

  onMount(() => {
    try { darkMode = localStorage.getItem(themeKey) !== 'false' } catch { /* Use the default theme. */ }
  })

  function toggleTheme() {
    darkMode = !darkMode
    try { localStorage.setItem(themeKey, String(darkMode)) } catch { /* Keep the theme for this visit. */ }
  }
</script>

<div class="landing" class:dark-mode={darkMode}>
  <header>
    <a class="icon-button" href={withBase('')} aria-label="Return to Classroom Tools" title="Classroom Tools">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5M9.5 20v-6h5v6" /></svg>
    </a>
    <button class="icon-button" onclick={toggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
    </button>
  </header>

  <main>
    <h1>Launchpad Games</h1>
    <div class="games">
      {#each games as game (game.id)}
        <a class="game" href={withBase(`launchpad-${game.id}/`)} aria-label={`Open ${game.name}`}>
          <span class="preview" style:background={game.color}>
            <img src={withBase(`images/Launchpad${game.preview}-screenshot.png`)} alt="" />
          </span>
          <span class="copy">
            <span class="players">{game.players}</span>
            <span class="name">{game.name} <span aria-hidden="true">↗</span></span>
            <span class="description">{game.description}</span>
          </span>
        </a>
      {/each}
    </div>
  </main>
</div>

<style>
  :global(body) { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }

  .landing {
    --ink: #111;
    --muted: #5b5b5b;
    --paper: #fff;
    --line: #cecece;
    --canvas: #f5f5f5;
    min-height: 100dvh;
    color: var(--ink);
    background: var(--canvas);
    color-scheme: light;
    font-family: 'Atkinson Hyperlegible', system-ui, sans-serif;
  }

  .dark-mode {
    --ink: #fff;
    --muted: #b8b8b8;
    --paper: #151515;
    --line: #454545;
    --canvas: #090909;
    color-scheme: dark;
  }

  header {
    display: flex;
    justify-content: space-between;
    padding: .75rem clamp(.75rem, 3vw, 2rem);
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    color: var(--muted);
    background: var(--paper);
    cursor: pointer;
  }

  .icon-button:hover { color: var(--ink); }
  .icon-button svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  a:focus-visible, button:focus-visible {
    outline: 3px solid #a993ec;
    outline-offset: 4px;
  }

  main {
    width: min(100%, 76rem);
    margin-inline: auto;
    padding: 0 clamp(.75rem, 3vw, 2rem) 2rem;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 5vw, 3.7rem);
    letter-spacing: -.055em;
    line-height: 1.04;
  }

  .games {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .game {
    display: grid;
    grid-template-rows: auto 1fr;
    flex: 0 0 calc((100% - 2rem) / 3);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px 18px 18px 6px;
    background: var(--paper);
    color: inherit;
    text-decoration: none;
  }

  .game:hover .name { text-decoration: underline; }

  .preview {
    display: grid;
    place-items: center;
    padding: .85rem;
  }

  .preview img {
    display: block;
    width: 100%;
    height: clamp(8rem, 20vh, 13rem);
    object-fit: contain;
    filter: drop-shadow(4px 6px 5px #0003);
    transform: rotate(-2deg);
  }

  .copy { display: grid; align-content: start; gap: .3rem; padding: .75rem 1rem 1rem; }
  .players, .description { color: var(--muted); font-size: .875rem; }
  .players { font-weight: 700; }
  .name { display: flex; justify-content: space-between; gap: .25rem; font-size: 1.4rem; font-weight: 700; line-height: 1.1; }
  .name > span { color: var(--muted); }

  @media (max-width: 52rem) {
    .game { flex-basis: calc((100% - 1rem) / 2); }
  }

  @media (max-width: 30rem) {
    .game { flex-basis: 100%; }
  }
</style>
