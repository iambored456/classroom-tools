<script lang="ts">
  import { onMount } from 'svelte'
  import { defaults, display, hardError, localDay, newGame, normalize, outcome, restoreGame, score, validate, type Game, type Mark, type Operator, type Settings } from './game'

  const storageKey = 'classroom-numberle-v1'
  const operators: Operator[] = ['+', '-', '*', '/']
  const labels: Record<Mark, string> = { correct: 'correct position', present: 'different position', absent: 'no remaining match' }
  let settings: Settings = { ...defaults, operators: [...defaults.operators] }
  let pending: Settings = { ...settings, operators: [...settings.operators] }
  let game: Game = newGame(settings)
  let dailyGames: Record<string, Game> = {}
  let results: Record<string, number> = {}
  let message = ''
  let storageNotice = ''
  let modal: 'help' | 'settings' | 'stats' | 'new' | null = null
  let dialog: HTMLDialogElement
  let custom = ''
  let customError = ''
  let shareText = ''
  let input: HTMLInputElement
  const base = import.meta.env.BASE_URL
  const hubHref = base.endsWith('/numberle/') ? base.slice(0, -'numberle/'.length) : '/'
  $: status = outcome(game)
  $: marks = game.guesses.map(guess => score(guess, game.answer))
  $: keyMarks = keyboardMarks(game)
  $: played = Object.values(results).length
  $: wins = Object.values(results).filter(n => n > 0).length
  $: distribution = Array.from({ length: 6 }, (_, i) => Object.values(results).filter(n => n === i + 1).length)
  $: if (dialog) { if (modal && !dialog.open) dialog.showModal(); else if (!modal && dialog.open) dialog.close() }

  function keyboardMarks(current: Game) {
    const map: Record<string, Mark> = {}
    const priority = { absent: 0, present: 1, correct: 2 }
    for (const guess of current.guesses) score(guess, current.answer).forEach((mark, i) => {
      if (!map[guess[i]] || priority[mark] > priority[map[guess[i]]]) map[guess[i]] = mark
    })
    return map
  }
  function readSettings(value: unknown): Settings {
    const s = (value && typeof value === 'object' ? value : {}) as Partial<Settings>
    return {
      length: Number.isInteger(s.length) && s.length! >= 5 && s.length! <= 12 ? s.length! : 8,
      operators: Array.isArray(s.operators) && s.operators.some(op => operators.includes(op)) ? operators.filter(op => s.operators!.includes(op)) : [...defaults.operators],
      hard: s.hard === true, daily: s.daily === true, dark: s.dark === true, contrast: s.contrast === true, swap: s.swap === true,
    }
  }
  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && typeof saved === 'object') {
        settings = readSettings(saved.settings)
        if (saved.dailyGames && typeof saved.dailyGames === 'object') {
          for (const [id, candidate] of Object.entries(saved.dailyGames)) {
            const restored = restoreGame(candidate)
            if (restored && restored.id === id && id.startsWith('daily:')) dailyGames[id] = restored
          }
        }
        if (saved.results && typeof saved.results === 'object') results = Object.fromEntries(Object.entries(saved.results).filter(([, n]) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 6)) as Record<string, number>
        const restored = restoreGame(saved.game)
        game = restored ?? newGame(settings)
        if (settings.daily && !game.custom && game.day !== localDay()) loadDaily()
      }
    } catch { storageNotice = 'Saved progress is unavailable. You can still play.' }
    const checkDate = () => {
      if (settings.daily && !game.custom && game.day !== localDay()) { loadDaily(); message = 'A new daily puzzle is ready.'; save() }
    }
    const timer = setInterval(checkDate, 30_000)
    window.addEventListener('focus', checkDate)
    return () => { clearInterval(timer); window.removeEventListener('focus', checkDate) }
  })
  function save() {
    if (game.id.startsWith('daily:')) dailyGames[game.id] = game
    try { localStorage.setItem(storageKey, JSON.stringify({ settings, game, dailyGames, results })) }
    catch { storageNotice = 'Progress cannot be saved in this browser. Keep this tab open to continue.' }
  }
  function loadDaily() {
    const fresh = newGame(settings)
    game = dailyGames[fresh.id] ?? fresh
  }
  function start() {
    if (settings.daily) loadDaily()
    else game = newGame(settings)
    message = ''; shareText = ''; modal = null; save()
  }
  function requestNew() {
    if (game.guesses.length || game.draft) { modal = 'new'; return }
    start()
  }
  function edit(value: string) {
    game = { ...game, draft: normalize(value).replace(/[^\d+*/=-]/g, '').slice(0, game.answer.length) }
    message = ''; save()
  }
  function submit() {
    if (status !== 'playing') return
    message = validate(game.draft, game.answer.length) ?? (settings.hard ? hardError(game.draft, game.guesses, game.answer) : null) ?? ''
    if (message) return
    if (game.guesses.includes(game.draft)) { message = 'You already tried that equation. Try a new one.'; return }
    game = { ...game, guesses: [...game.guesses, game.draft], draft: '' }
    const end = outcome(game)
    if (end !== 'playing') results = { ...results, [game.id]: end === 'won' ? game.guesses.length : 0 }
    message = end === 'won' ? 'Equation solved! Nicely reasoned.' : end === 'lost' ? 'Six guesses used. Try another puzzle!' : `Guess ${game.guesses.length} checked. ${6 - game.guesses.length} tries left.`
    save()
  }
  function key(value: string) {
    if (modal || status !== 'playing') return
    if (value === 'Enter') submit()
    else if (value === 'Backspace') edit(game.draft.slice(0, -1))
    else edit(game.draft + value)
  }
  function onKey(event: KeyboardEvent) {
    if (modal || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select')) return
    // Preserve native button activation and keyboard navigation.
    if (event.key === 'Enter' && target.closest('button, a')) return
    if (/^[\d+*/=xX×÷-]$/.test(event.key) || ['Enter', 'Backspace'].includes(event.key)) {
      event.preventDefault(); key(event.key)
    }
  }
  function openSettings() {
    pending = { ...settings, operators: [...settings.operators] }; custom = ''; customError = ''; modal = 'settings'
  }
  function toggleOperator(op: Operator) {
    pending = { ...pending, operators: pending.operators.includes(op) ? pending.operators.filter(value => value !== op) : [...pending.operators, op] }
  }
  function applySettings() {
    if (!pending.operators.length) { customError = 'Choose at least one arithmetic operator.'; return }
    const changed = pending.length !== settings.length || pending.daily !== settings.daily || [...pending.operators].sort().join('') !== [...settings.operators].sort().join('')
    settings = { ...pending, operators: [...pending.operators] }
    if (changed) start()
    else { modal = null; save() }
  }
  function customGame() {
    const answer = normalize(custom)
    customError = validate(answer) ?? ''
    if (customError) return
    settings = { ...pending, length: answer.length, daily: false, operators: pending.operators.length ? [...pending.operators] : [...defaults.operators] }
    game = { answer, guesses: [], draft: '', id: `custom:${Date.now()}:${Math.random()}`, day: localDay(), custom: true }
    custom = ''; message = ''; shareText = ''; modal = null; save()
  }
  async function share() {
    shareText = `Numberle ${game.id.startsWith('daily:') ? game.day : game.custom ? 'Classroom' : 'Unlimited'} · ${status === 'won' ? game.guesses.length : 'X'}/6\n${marks.map(row => row.map(mark => mark === 'correct' ? '🟩' : mark === 'present' ? '🟨' : '⬛').join('')).join('\n')}`
    try { await navigator.clipboard.writeText(shareText); message = 'Result copied. The answer stays hidden.'; shareText = '' }
    catch { message = 'Select and copy your result below.' }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class:dark={settings.dark} class:contrast={settings.contrast} class="app-shell">
  <header>
    <a class="hub-link" href={hubHref}>← Classroom Tools</a>
    <div class="toolbar">
      <h1><span class="logo" aria-hidden="true">=</span>Numberle</h1>
      <nav aria-label="Game controls">
        <button class="new-button" onclick={requestNew} disabled={settings.daily && !game.custom} title={settings.daily ? 'Switch off Daily mode to play unlimited puzzles' : 'New puzzle'} aria-label="New puzzle">N<span>+</span></button>
        <button onclick={() => modal = 'stats'} title="Statistics" aria-label="Statistics"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V12h3v8M10 20V4h3v16M16 20V8h3v12" /></svg></button>
        <button onclick={openSettings} title="Settings" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /></svg></button>
        <button onclick={() => modal = 'help'} title="How to play" aria-label="How to play">?</button>
      </nav>
    </div>
    <div class="subhead"><span>{game.custom ? 'Classroom puzzle' : settings.daily ? `Daily · ${game.day}` : 'Unlimited equations'}</span><span>{game.answer.length} tiles · 6 tries{settings.hard ? ' · Hard' : ''}</span></div>
  </header>

  <main>
    <section class="board" aria-label="Equation guesses" style={`--columns: ${game.answer.length}`}>
      {#each Array(6) as _, row}
        <div class="guess-row" class:active={row === game.guesses.length && status === 'playing'} aria-label={`Guess ${row + 1}`}>
          {#each Array(game.answer.length) as _, column}
            {@const char = (game.guesses[row] ?? (row === game.guesses.length ? game.draft : ''))[column] ?? ''}
            {@const mark = marks[row]?.[column]}
            <div class={`tile ${mark ?? ''}`} class:filled={!!char} class:cursor={row === game.guesses.length && column === game.draft.length && status === 'playing'} aria-label={`Tile ${column + 1}: ${char ? display(char) : 'empty'}${mark ? `, ${labels[mark]}` : ''}`}>{display(char)}{#if mark && settings.contrast}<small aria-hidden="true">{mark === 'correct' ? '●' : mark === 'present' ? '◆' : '–'}</small>{/if}</div>
          {/each}
        </div>
      {/each}
    </section>

    <p class="message" class:success={status === 'won'} role="status" aria-live="polite">{message || (status === 'won' ? 'Equation solved!' : status === 'lost' ? 'A good puzzle is a chance to try again.' : 'Find the hidden equation.')}</p>

    {#if status === 'playing'}
      <form class="entry" onsubmit={(event) => { event.preventDefault(); submit() }}>
        <label class="sr-only" for="equation">Your equation</label>
        <input bind:this={input} id="equation" aria-label="Your equation" value={game.draft} oninput={() => edit(input.value)} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type an equation or use the keypad" />
        <button type="submit">Check</button>
      </form>
    {:else}
      <div class="result">
        <p>{status === 'won' ? `Solved in ${game.guesses.length} of 6 guesses` : 'The hidden equation was'}<strong>{display(game.answer)}</strong></p>
        <div class="result-actions"><button class="primary" onclick={share}>Copy result</button>{#if !settings.daily}<button onclick={start}>Play again</button>{:else}<button onclick={openSettings}>Play unlimited</button>{/if}</div>
        {#if shareText}<textarea aria-label="Result to copy" readonly value={shareText}></textarea>{/if}
      </div>
    {/if}

    <section class="keyboard" aria-label="Equation keypad">
      <div class="number-keys">{#each '1234567890' as digit}<button class={keyMarks[digit] ?? ''} disabled={status !== 'playing'} aria-label={`${digit}${keyMarks[digit] ? `, ${labels[keyMarks[digit]]}` : ''}`} onclick={() => key(digit)}>{digit}</button>{/each}</div>
      <div class="operator-keys">
        <button class="wide" disabled={status !== 'playing'} onclick={() => key(settings.swap ? 'Enter' : 'Backspace')} aria-label={settings.swap ? 'Enter' : 'Backspace'}>{settings.swap ? 'Enter' : '⌫'}</button>
        {#each [...operators, '='] as op}<button class={keyMarks[op] ?? ''} disabled={status !== 'playing'} aria-label={`${display(op)}${keyMarks[op] ? `, ${labels[keyMarks[op]]}` : ''}`} onclick={() => key(op)}>{display(op)}</button>{/each}
        <button class="wide" disabled={status !== 'playing'} onclick={() => key(settings.swap ? 'Backspace' : 'Enter')} aria-label={settings.swap ? 'Backspace' : 'Enter'}>{settings.swap ? '⌫' : 'Enter'}</button>
      </div>
    </section>
    <div class="legend"><span><i class="correct"></i>Right spot</span><span><i class="present"></i>Different spot</span><span><i class="absent"></i>No match left</span></div>
    {#if storageNotice}<p class="storage-notice">{storageNotice}</p>{/if}
  </main>
  <footer>A little arithmetic. A lot of deduction.<br /><a href="https://numberle.org/" target="_blank" rel="noreferrer">Inspired by Numberle</a></footer>

  <dialog bind:this={dialog} onclose={() => modal = null} aria-label={modal === 'settings' ? 'Settings' : modal === 'stats' ? 'Statistics' : modal === 'new' ? 'New puzzle' : 'How to play'}>
    <div class="dialog-heading"><h2>{modal === 'settings' ? 'Settings' : modal === 'stats' ? 'Your statistics' : modal === 'new' ? 'Start a new puzzle?' : 'How to play'}</h2><button aria-label="Close dialog" onclick={() => modal = null}>×</button></div>
    {#if modal === 'help'}
      <p>Find the hidden equation in <strong>six guesses</strong>. Every guess must be a correct equation that fills the row.</p>
      <div class="example" aria-label="Example: 4 plus 7 times 5 equals 39">{#each '4+7*5=39' as c, i}<span class={`tile ${i === 1 || i === 2 || i === 5 ? 'correct' : i === 0 || i === 3 || i === 7 ? 'present' : 'absent'}`}>{display(c)}</span>{/each}</div>
      <ul class="rules"><li><strong>Green:</strong> the symbol is in the right place.</li><li><strong>Amber:</strong> the symbol belongs somewhere else.</li><li><strong>Gray:</strong> no unmatched copy remains in the answer.</li></ul>
      <p>Use 0–9 and + − × ÷, with exactly one =. The right side must be a non-negative whole number. Multiply and divide before adding and subtracting. No parentheses or leading zeros.</p>
      <p>Order matters: 2+3=5 and 3+2=5 are different answers. Repeated symbols get a clue for each copy actually in the answer.</p>
      <p class="muted">Type on your keyboard, paste into the equation field, or tap the keypad. Use * for × and / for ÷.</p>
      <button class="primary full" onclick={() => modal = null}>Let’s play</button>
    {:else if modal === 'settings'}
      <label class="field-label" for="length">Equation length <span>Includes digits, operators, and =</span></label>
      <select id="length" bind:value={pending.length}>{#each [5,6,7,8,9,10,11,12] as length}<option value={length}>{length} symbols</option>{/each}</select>
      <fieldset><legend>Operators in the hidden equation</legend><div class="operator-options">{#each operators as op}<button aria-pressed={pending.operators.includes(op)} onclick={() => toggleOperator(op)}>{display(op)}</button>{/each}</div><p class="muted">Guesses may use any operator.</p></fieldset>
      <label class="toggle"><span><strong>Hard mode</strong><small>Keep correct positions and reuse revealed symbols.</small></span><input type="checkbox" bind:checked={pending.hard} /></label>
      <label class="toggle"><span><strong>Daily mode</strong><small>One puzzle per day for each length and operator selection.</small></span><input type="checkbox" bind:checked={pending.daily} /></label>
      <label class="toggle"><span><strong>Dark mode</strong></span><input type="checkbox" bind:checked={pending.dark} /></label>
      <label class="toggle"><span><strong>High contrast</strong><small>Blue/orange clues with shape markers on tiles.</small></span><input type="checkbox" bind:checked={pending.contrast} /></label>
      <label class="toggle"><span><strong>Swap Enter and Backspace</strong></span><input type="checkbox" bind:checked={pending.swap} /></label>
      <p class="muted">Changing length, operators, or daily mode starts or resumes the matching puzzle. Appearance changes keep your progress.</p>
      <button class="primary full" onclick={applySettings}>Apply settings</button>
      <details><summary>Set a classroom equation</summary><p>Enter a valid 5–12 symbol equation, then start the puzzle before showing the board to students.</p><label class="field-label" for="custom">Hidden equation</label><input id="custom" type="password" bind:value={custom} autocomplete="off" placeholder="e.g. 12+10=22" /><button class="full" onclick={customGame}>Start classroom puzzle</button></details>
      {#if customError}<p role="alert" class="error">{customError}</p>{/if}
    {:else if modal === 'stats'}
      <p class="muted">Completed puzzles on this browser, across all modes.</p>
      <div class="stats"><div><strong>{played}</strong><span>Played</span></div><div><strong>{played ? Math.round(wins / played * 100) : 0}%</strong><span>Win rate</span></div><div><strong>{wins}</strong><span>Solved</span></div></div>
      <h3>Guess distribution</h3>
      {#each distribution as count, i}<div class="distribution"><span>{i + 1}</span><div style={`width: ${Math.max(8, count / Math.max(1, ...distribution) * 100)}%`}>{count}</div></div>{/each}
      {#if !played}<p>Finish your first puzzle to start your statistics.</p>{/if}
    {:else if modal === 'new'}
      <p>Your current board will be replaced with a fresh equation.</p><div class="result-actions"><button onclick={() => modal = null}>Keep playing</button><button class="primary" onclick={start}>New puzzle</button></div>
    {/if}
  </dialog>
</div>
