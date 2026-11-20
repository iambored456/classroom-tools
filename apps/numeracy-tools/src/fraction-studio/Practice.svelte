<script lang="ts">
  import Board from './Board.svelte'
  import GameSetup from './GameSetup.svelte'
  import Icon from './Icon.svelte'
  import { boardOf, format, fraction, labels, money, readTiles, resizeColour } from './math'
  import { kinds, makeRounds, type Kind, type Round } from './rounds'
  let { simplifyFractions }: { simplifyFractions: boolean } = $props()
  let selectedChoice = $state<number | undefined>()
  let stage = $state<'setup' | 'playing' | 'done'>('setup')
  let kind = $state<Kind>('mixed'), difficulty = $state('benchmarks'), total = $state(5), pair = $state('all')
  let rounds = $state<Round[]>([]), index = $state(0)
  let board = $state(boardOf(0)), answer = $state(''), remaining = $state('')
  let checked = $state(false), attempted = $state(false), hint = $state(false), message = $state(''), firstTry = $state(0)
  const q = $derived(rounds[index])
  const painted = $derived(board.filter(Boolean).length)
  const source = $derived(q ? format(q.count, q.source, 1, simplifyFractions) : '')
  const equivalence = $derived(q ? fraction(q.count, simplifyFractions) + ' = ' + format(q.count, 'decimal') + ' = ' + q.count + '%' : '')
  function enterRound() {
    board = boardOf(q.kind === 'build' ? 0 : q.count)
    selectedChoice = undefined
    answer = ''; remaining = ''; checked = false; attempted = false; hint = false; message = ''
  }
  function start() {
    rounds = makeRounds(kind, difficulty, total, pair)
    index = 0; firstTry = 0; stage = 'playing'; enterRound()
  }
  function next() {
    if (index + 1 === rounds.length) { stage = 'done'; return }
    index++; enterRound()
  }
  function check(e: SubmitEvent) {
    e.preventDefault()
    if (checked || (q.kind === 'match' && selectedChoice === undefined)) return
    let correct: boolean
    if (q.kind === 'build') {
      correct = painted === q.count
      message = 'You shaded ' + painted + ' of 100 tiles. Try ' + (painted < q.count ? 'adding' : 'removing') + ' tiles.'
    } else if (q.kind === 'money') {
      const off = readTiles(answer, 'money', q.whole), rest = readTiles(remaining, 'money', q.whole)
      correct = off === q.count && rest === 100 - q.count
      if (off === q.count) message = 'Your discount is correct. Subtract it from the original price to find the sale price.'
      else message = 'Find the value of the shaded part first. Each tile is worth ' + money(q.whole / 100) + '.'
    } else {
      const parsed = q.kind === 'match' ? selectedChoice : readTiles(answer, q.output)
      correct = parsed === q.count
      message = typeof parsed === 'string' ? parsed : 'That represents ' + parsed + ' of 100 tiles. Compare it with the shaded part of the board.'
    }
    if (correct) {
      if (!attempted && !hint) firstTry++
      checked = true
      message = q.kind === 'money' ? 'Correct. You save ' + money(q.count * q.whole / 100) + ' and pay ' + money((100 - q.count) * q.whole / 100) + '.' : ''
    }
    attempted = true
  }
</script>
{#if stage === 'setup'}
  <GameSetup bind:kind bind:difficulty bind:pair bind:total onstart={start} />
{:else if stage === 'done'}
  <section class="practice-setup panel" aria-live="polite"><span class="kicker">Practice complete</span><h2>You solved {total} rounds.</h2>
    <p>{firstTry} of {total} solved on the first try without a hint.</p>
    <div class="actions"><button class="primary" onclick={start}>Play again <Icon name="arrow"/></button><button class="quiet" onclick={() => stage = 'setup'}>Change game</button></div>
  </section>
{:else}
  <div class="workspace practice">
    <section class="board-panel panel">
      <Board {board} editable={q.kind === 'build' && !checked} onpaint={(i,c) => board[i] = c}/>
      {#if q.kind === 'build' && !checked}
        <div class="board-tools">
          {#each [-10,-1,1,10] as delta}
            <button aria-label={(delta > 0 ? 'Add ' : 'Remove ') + Math.abs(delta) + ' tiles'} disabled={painted + delta > 100 || painted + delta < 0} onclick={() => board = resizeColour(board, 1, painted + delta)}>{delta > 0 ? '+' : '−'}{Math.abs(delta)} {Math.abs(delta) === 1 ? 'tile' : 'tiles'}</button>
          {/each}
        </div>
      {/if}
      <p class="panel-note">{q.kind === 'build' ? 'Paint tiles or use the buttons to build your answer.' : 'Each row is one tenth of the whole.'}</p>
    </section>
    <section class="challenge panel">
      <div class="panel-head"><span class="kicker">Round {index + 1} of {rounds.length}</span><button class="text-btn" onclick={() => stage = 'setup'}>End game</button></div>
      <progress aria-label="Rounds completed" value={index + Number(checked)} max={rounds.length}></progress>
      <h2>{kinds[q.kind]}</h2>
      {#if q.kind === 'money'}
        <p class="question">A {money(q.whole)} item is {q.count}% off. How much do you save, and what do you pay?</p>
      {:else if q.kind === 'build'}
        <p class="question">Shade {source}{q.source === 'money' ? ' of $1.00' : ' of the board'} in jade.</p>
      {:else}
        <p class="question">{q.kind === 'match' ? 'Which ' + labels[q.output].toLowerCase() + ' matches ' : 'Write '}{source}{q.kind === 'match' ? '?' : ' as ' + (q.output === 'money' ? 'a money amount.' : 'a ' + labels[q.output].toLowerCase() + '.')}</p>
      {/if}
      {#if q.kind !== 'money' && (q.output === 'money' || q.source === 'money')}<p class="panel-note">One whole is $1.00.</p>{/if}
      <form onsubmit={check}>
        {#if q.kind === 'match'}
          <div class="options">{#each q.choices as choice}<button type="button" disabled={checked} class:chosen={selectedChoice === choice} aria-pressed={selectedChoice === choice} onclick={() => selectedChoice = choice}>{format(choice, q.output, 1, simplifyFractions)}</button>{/each}</div>
        {:else if q.kind !== 'build'}
          <label>{q.kind === 'money' ? 'Discount amount ($)' : labels[q.output]}<input disabled={checked} bind:value={answer} required autocomplete="off" maxlength="24" placeholder={q.kind === 'money' || q.output === 'money' ? '$0.00' : q.output === 'fraction' ? 'numerator / denominator' : 'Your answer'} /></label>
          {#if q.kind === 'money'}<label>Sale price ($)<input disabled={checked} bind:value={remaining} required maxlength="24" placeholder="$0.00"/></label>{/if}
        {/if}
        {#if checked || message}<p class="feedback" class:success={checked} role="status">{checked && q.kind !== 'money' ? 'Correct. ' + equivalence + '.' : message}</p>{/if}
        {#if hint && !checked}<p class="hint">{q.kind === 'money' ? 'Multiply the price by the discount as a decimal. The unshaded tiles represent the sale price.' : 'Each full row is 10%, or 0.1. Each individual tile adds one hundredth.'}</p>{/if}
        {#if checked}<button type="button" class="primary" onclick={next}>{index + 1 === rounds.length ? 'See results' : 'Next round'} <Icon name="arrow"/></button>
        {:else}<div class="actions"><button type="submit" class="primary" disabled={q.kind === 'match' && selectedChoice === undefined}>Check answer</button><button type="button" class="quiet" disabled={hint} onclick={() => hint = true}>Get a hint</button></div>{/if}
      </form>
    </section>
  </div>
{/if}

