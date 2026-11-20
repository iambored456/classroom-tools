<script lang="ts">
  import NumberLine from './NumberLine.svelte'
  import { decimalPlaces, display, formatTick, locate, targets, type LabelStyle } from './scale'

  let line = $state<ReturnType<typeof NumberLine>>()
  let marker = $state<number | null>(null)
  let showNumbers = $state(true)
  let showTicks = $state(true)
  let labelStyle = $state<LabelStyle>('decimal')
  let choosing = $state(false)
  let playing = $state(false)
  let round = $state(0)
  let solved = $state(false)
  let finished = $state(false)
  let guess = $state<number | null>(null)
  let feedback = $state('')
  let countMoves = $state(false)
  let moves = $state(0)
  let totalMoves = $state(0)
  let viewKey = $state(0)
  const target = $derived(targets[round])
  const colour = { name: 'Jade', hex: '#39a58b' }

  function switchMode(challenge: boolean) {
    if (playing === challenge) return
    playing = challenge
    round = 0
    totalMoves = 0
    finished = false
    startRound()
  }

  function startRound() {
    choosing = false
    solved = false
    guess = null
    feedback = ''
    moves = 0
    viewKey++
  }

  function nextRound() {
    if (round + 1 === targets.length) {
      finished = true
      return
    }
    round++
    startRound()
  }

  function replay() {
    round = 0
    totalMoves = 0
    finished = false
    startRound()
  }

  function choose() {
    choosing = !choosing
    feedback = ''
    if (choosing) line?.focusLine()
  }

  function pick(value: number, unitsPerPixel: number) {
    choosing = false
    if (!playing) {
      marker = value
      return
    }
    const answer = locate(value, target.unit, unitsPerPixel)
    if (answer === null) {
      feedback = 'Zoom in further so you can distinguish values ' + display(target.unit) + ' apart.'
      return
    }
    guess = answer
    if (answer === target.value) {
      solved = true
      totalMoves += moves
      feedback = 'Correct. You found ' + target.label + '.'
    } else {
      const picked = formatTick(answer, decimalPlaces(target.unit), 'decimal')
      feedback = 'You chose ' + picked + '. Look farther ' + (answer < target.value ? 'right.' : 'left.')
    }
  }
</script>

<main class="studio">
  <div class="standalone-line">
    <div class="page-head">
      <h1>Number Line</h1>
      <nav aria-label="Number Line mode">
        <button class="quiet" aria-pressed={!playing} onclick={() => switchMode(false)}>Explore</button>
        <button class="quiet" aria-pressed={playing} onclick={() => switchMode(true)}>Find the Number</button>
      </nav>
    </div>

    {#if playing}
      <section class="panel challenge-card" aria-label="Find the Number challenge">
        {#if finished}
          <h2>You found all {targets.length} numbers</h2>
          {#if countMoves}<p>{totalMoves} {totalMoves === 1 ? 'move' : 'moves'} across all rounds.</p>{/if}
          <button class="primary" onclick={replay}>Play again</button>
        {:else}
          <div class="target-row">
            <div>
              <span class="kicker">Target {round + 1} of {targets.length}</span>
              <h2>Find <span class="target">{target.label}</span></h2>
            </div>
            <label><input type="checkbox" bind:checked={countMoves}/> Show moves</label>
          </div>
          {#if countMoves}<p class="moves">Moves <strong>{moves}</strong></p>{/if}
          <p>Pan and zoom to the target, then select its position.</p>
          <div class="challenge-actions">
            {#if solved}
              <button class="primary" onclick={nextRound}>{round + 1 === targets.length ? 'See results' : 'Next target'}</button>
            {:else}
              <button class="primary" aria-pressed={choosing} onclick={choose}>{choosing ? 'Cancel selection' : 'Select a position'}</button>
            {/if}
          </div>
          <p class="result" role="status">{feedback || (choosing ? 'Click a point, or press Enter to select the centre guide.' : '')}</p>
        {/if}
      </section>
    {/if}

    {#if !playing || !finished}
      <div class="panel line-panel">
        <div class="line-tools">
          <div class="display-tools" role="group" aria-label="Display">
            <label><input type="checkbox" bind:checked={showNumbers}/> Numbers</label>
            <label><input type="checkbox" bind:checked={showTicks}/> Ticks</label>
            <label><span class="sr-only">Number format</span>
              <select bind:value={labelStyle} disabled={!showNumbers}>
                <option value="decimal">Decimals</option>
                <option value="fraction">Fractions</option>
              </select>
            </label>
          </div>
          {#if !playing}
            <div class="marker-tools">
              <button class="quiet" aria-pressed={choosing} onclick={choose}>{choosing ? 'Cancel placement' : 'Place marker'}</button>
              {#if marker !== null}<button class="quiet" onclick={() => { marker = null; choosing = false }}>Clear marker</button>{/if}
            </div>
          {/if}
        </div>
        {#key viewKey}
          <NumberLine bind:this={line} value={playing ? guess : marker} {colour} {showNumbers} {showTicks} {labelStyle}
            markerLabel={playing ? 'Selected answer' : 'Value marker'} markerEditable={!playing}
            onchange={value => marker = value}
            onpick={choosing ? pick : undefined}
            onmove={() => { if (playing && !solved) moves++ }}/>
        {/key}
        <p class="controls-hint">{!playing && choosing ? 'Click a point, or press Enter to place a marker at the centre guide.' : 'Click or hold to zoom. Shift reverses zoom. Drag to pan, or focus the line and use the arrow keys.'}</p>
      </div>
    {/if}
  </div>
</main>

<style>
  .standalone-line { max-width:90rem; margin-inline:auto; padding:clamp(.6rem,3vw,2rem); display:grid; gap:.8rem; }
  .page-head,.target-row,.line-tools,.display-tools,.marker-tools {
    display:flex; gap:.45rem .7rem; align-items:center; flex-wrap:wrap;
  }
  .page-head,.target-row,.line-tools { justify-content:space-between; }
  h1 { margin:0; font-size:clamp(1.8rem,4vw,3rem); line-height:1.1; letter-spacing:-.045em; }
  nav { display:flex; flex-wrap:wrap; gap:.35rem; }
  nav :global(button[aria-pressed=true]) { background:var(--brand); color:var(--brand-text); border-color:var(--brand); }
  .line-panel { container-type:inline-size; }
  .line-tools label,.target-row label { display:flex; gap:.35rem; align-items:center; }
  input[type=checkbox] { accent-color:var(--brand); inline-size:1.15em; block-size:1.15em; }
  .target { color:var(--brand); font-size:1.4em; }
  .challenge-card { display:grid; justify-items:start; gap:.5rem; }
  .target-row { width:100%; }
  .moves,.controls-hint { font-size:.88rem; color:var(--sub); }
  .result:empty { display:none; }
  .result { font-weight:700; }
  .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
</style>
