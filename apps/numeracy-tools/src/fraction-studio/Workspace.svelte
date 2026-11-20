<script lang="ts">
  import { untrack } from 'svelte'
  import NumberLine from '../number-line/NumberLine.svelte'
  import Board from './Board.svelte'
  import Icon from './Icon.svelte'
  import broom from './assets/clear.svg?raw'
  import { boardOf, colours, format, forms, fraction, labels, money, readTiles, resizeColour, shuffle, type Form } from './math'
  let { classroom = false, simplifyFractions }: { classroom?: boolean; simplifyFractions: boolean } = $props()
  const prompts = [
    { count: 90, whole: 1, text: 'What fraction of the grid is jade? How would you write it as a decimal?' },
    { count: 9, whole: 1, text: 'What changed between nine tenths and nine hundredths?' },
    { count: 25, whole: 20, text: 'The grid is a $20 budget. How much does the jade part represent?' },
    { count: 75, whole: 40, text: 'Three quarters of a $40 order is packed. What value is still unpacked?' },
    { count: 50, whole: 1, text: 'Can you see half when the tiles are scattered? How could you check?' },
  ]
  const startsCovered = untrack(() => classroom)
  let board = $state<number[]>(startsCovered ? boardOf(90) : [...Array(50).fill(1), ...Array(25).fill(2), ...Array(15).fill(3), ...Array(10).fill(0)])
  let selected = $state(1), erase = $state(false), prompt = $state(0)
  const whole = $derived(classroom ? prompts[prompt].whole : 1)
  let revealed = $state<string[]>([])
  let editing = $state<Form>('decimal'), entry = $state(''), error = $state('')
  let editor: HTMLDialogElement
  const counts = $derived.by(() => {
    const totals = colours.map(() => 0)
    for (const tile of board) totals[tile]++
    return totals
  })
  const rows = $derived(colours.map((colour, id) => ({ colour, id, count: counts[id] }))
    .filter(row => row.id !== 0 && row.count > 0))
  const count = $derived(counts[selected])
  const colour = $derived(colours[selected])
  const visibleKeys = $derived(rows.flatMap(row => forms.map(form => row.id + '-' + form)))
  const allRevealed = $derived(visibleKeys.length > 0 && visibleKeys.every(key => revealed.includes(key)))
  const examples: Record<Form, string> = { fraction: '75/100', decimal: '0.75', percent: '75%', money: '$0.75' }
  function changeCount(n: number) {
    if (n === count) return
    board = resizeColour(board, selected, n)
  }
  function choose(c: number) { selected = c; erase = false }
  function edit(id: number, form: Form) {
    choose(id)
    editing = form; entry = format(count, form, whole, simplifyFractions); error = ''
    editor.showModal()
    editor.querySelector('input')?.select()
  }
  function submit(e: SubmitEvent) {
    e.preventDefault()
    const n = readTiles(entry, editing, whole)
    if (typeof n === 'string') { error = n; return }
    changeCount(n)
    editor.close()
  }
  function toggle(key: string) {
    revealed = revealed.includes(key) ? revealed.filter(item => item !== key) : [...revealed, key]
  }
  function nextPrompt() {
    prompt = (prompt + 1) % prompts.length
    const next = prompts[prompt]
    selected = 1; erase = false
    board = prompt === 4 ? shuffle(boardOf(next.count)) : boardOf(next.count)
    revealed = []
  }
</script>

{#if classroom}
  <section class="class-prompt">
    <div><span class="kicker">Discuss together · {prompt + 1} / {prompts.length}</span><h2>{prompts[prompt].text}</h2></div>
    <button class="quiet" onclick={nextPrompt}>Next prompt <Icon name="arrow" /></button>
  </section>
{/if}

<div class="workspace" class:projecting={classroom} style={'--paint:' + colour.hex}>
  <section class="board-panel panel">
    <Board {board} paint={erase ? 0 : selected} onpaint={(i, c) => board[i] = c} />
    <div class="palette" aria-label="Paint colours">
      {#each colours.slice(1) as c, i}
        <button class="paint-swatch" style:background-color={c.hex} aria-label={c.name} title={c.name}
          aria-pressed={selected === i + 1 && !erase} onclick={() => choose(i + 1)}>
          {#if selected === i + 1 && !erase}<span aria-hidden="true">✓</span>{/if}
        </button>
      {/each}
      <div class="palette-tools">
        <button class:chosen={erase} aria-label="Eraser" title="Eraser" aria-pressed={erase} onclick={() => erase = !erase}><Icon name="erase" /></button>
        <button aria-label="Clear board" title="Clear board" disabled={board.every(tile => tile === 0)} onclick={() => board = boardOf(0)}>
          <span class="broom-icon">{@html broom}</span>
        </button>
      </div>
    </div>
  </section>

  <section class="connections panel" aria-label={classroom ? 'Class predictions' : 'Values by colour'}>
    {#if classroom}
      <h2>Class predictions</h2>
      <p class="panel-note">Select a card to reveal or cover its value.</p>
    {/if}
    {#each rows as row (row.id)}
      {@const ratio = fraction(row.count, simplifyFractions)}
      {@const parts = ratio.split('/')}
      <div class="value-row" role="group" aria-label={row.colour.name} style:--row-paint={row.colour.hex}>
        {#each forms as form}
          {@const key = row.id + '-' + form}
          {@const value = format(row.count, form, whole, simplifyFractions)}
          {@const covered = classroom && !revealed.includes(key)}
          <button class="value-card" aria-label={(classroom ? (covered ? 'Reveal ' : 'Hide ') : 'Edit ') + row.colour.name + ' ' + labels[form].toLowerCase()}
            onclick={() => classroom ? toggle(key) : edit(row.id, form)}>
            <span class="card-label">{labels[form]}</span>
            {#if covered}
              <strong class="covered">?</strong>
            {:else}
              <strong class="reading" style:--characters={form === 'fraction' ? 1 : value.length}>
                {#if form === 'fraction'}
                  <span class="stack-frac" aria-label={ratio}><span>{parts[0]}</span><span>{parts[1]}</span></span>
                  <i class="fraction-disc" aria-hidden="true" style:--angle={row.count * 3.6 + 'deg'}></i>
                {:else}{value}{/if}
              </strong>
              <small>{form === 'fraction' ? row.count + ' out of 100' : form === 'decimal' ? (row.count / 100).toFixed(2) : form === 'percent' ? row.count + ' per 100' : 'of ' + money(whole)}</small>
            {/if}
          </button>
        {/each}
      </div>
    {/each}
    {#if !classroom || revealed.includes(selected + '-decimal')}
      <NumberLine value={count / 100} {colour} bar onchange={value => changeCount(Math.round(value * 100))}/>
    {/if}
    {#if classroom}
      <button class="quiet reveal-all" disabled={!rows.length} onclick={() => revealed = allRevealed ? [] : [...visibleKeys]}>{allRevealed ? 'Cover all' : 'Reveal all'}</button>
    {/if}
    {#if classroom && allRevealed && prompt === 3}
      <p class="panel-note">The remaining share is {format(100 - counts[1], 'percent')}, worth {format(100 - counts[1], 'money', whole)}.</p>
    {/if}
  </section>
</div>
<dialog bind:this={editor} class="value-dialog">
  <form onsubmit={submit}>
    <div class="panel-head"><h2>Edit {labels[editing].toLowerCase()}</h2><button type="button" class="quiet" onclick={() => editor.close()}>Close</button></div>
    <label>{colour.name} share {editing === 'money' ? 'of ' + money(whole) : 'of the board'}
      <input bind:value={entry} placeholder={examples[editing]} autocomplete="off" maxlength="24" />
    </label>
    <small>New tiles fill empty spaces first, then replace other colours.</small>
    {#if error}<p class="feedback" role="alert">{error}</p>{/if}
    <button class="primary" type="submit">Update board</button>
  </form>
</dialog>

