<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { cardSets, cardImage, createNonsenseSet, sessionStorageKey, setFromHash } from './sets'
  import type { CardSet, CardSetId } from './sets'
  import { chooseAnotherCard, createSession, nextCard, previousCard, restoreSession } from './deck'
  import type { DeckSession } from './deck'
  import { createTransitionQueue } from './transitions'
  import type { CardTransition } from './transitions'
  import CardArtwork from './CardArtwork.svelte'
  import { eyeWordsCrop } from './artwork'
  import { nonsenseGroups, nonsenseCards, normalizeNonsenseSelection } from './nonsense-words'
  import type { NonsenseGroupId } from './nonsense-words'

  type CardAction = 'flip' | 'next' | 'another' | 'back'

  const themeKey = 'literacy-flashcards.dark-mode'
  const nonsenseSelectionKey = 'literacy-flashcards.nonsense-words.selection.v1'
  let activeSetId = $state<CardSetId>('eyewords')
  let nonsenseIds = $state<NonsenseGroupId[]>(['A'])
  let draftNonsenseIds = $state<NonsenseGroupId[]>(['A'])
  let sessions = $state<Record<string, DeckSession>>(Object.fromEntries(
    cardSets.map(set => [sessionStorageKey(set.id), createSession(set.cards.length)]),
  ))
  let screen = $state<'sets' | 'deck'>('sets')
  let darkMode = $state(true)
  let flipped = $state(false)
  let busy = $state(false)
  let fullscreen = $state(false)
  let queuedId = $state<number | null>(null)
  let queuedFlipped = $state(false)
  let returning = $state(false)
  let storageUnavailable = $state(false)
  let imageFailed = $state(false)
  let notice = $state('')
  let restartConfirm = $state(false)
  let cardElement = $state<HTMLElement>(null!)
  let helpDialog = $state<HTMLDialogElement>(null!)
  let helpButton = $state<HTMLButtonElement>(null!)
  let nonsenseDialog = $state<HTMLDialogElement>(null!)
  let nonsenseButton = $state<HTMLButtonElement>(null!)
  const nonsenseSet = $derived(createNonsenseSet(nonsenseIds))
  const displaySets = $derived(cardSets.map(set => set.id === 'nonsense-words' ? nonsenseSet : set))
  const draftWordCount = $derived(nonsenseCards(draftNonsenseIds).length)
  const activeSet = $derived(displaySets.find(set => set.id === activeSetId)!)
  const session = $derived(sessions[sessionStorageKey(activeSetId, nonsenseIds)])
  const cardCount = $derived(activeSet.cards.length)
  const currentId = $derived(session.order[session.position])
  const currentCard = $derived(activeSet.cards[currentId - 1])
  const complete = $derived(session.position === cardCount)
  const hubUrl = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:5173/`
    : new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname

  const navigation = createTransitionQueue<CardAction>(performCardAction, value => {
    busy = value
    if (!value) void tick().then(() => {
      if (!busy && screen === 'deck' && !complete && cardElement?.isConnected) {
        cardElement.focus({ preventScroll: true })
      }
    })
  }, () => { notice = 'Card navigation couldn’t finish. Please try again.' })

  function saveSession(setId: CardSetId, updated: DeckSession) {
    const key = sessionStorageKey(setId, nonsenseIds)
    sessions[key] = updated
    try { localStorage.setItem(key, JSON.stringify(updated)) }
    catch { storageUnavailable = true }
  }

  function loadSession(set: CardSet, ids = nonsenseIds) {
    const key = sessionStorageKey(set.id, ids)
    if (sessions[key]) return
    let stored: string | null = null
    try { stored = localStorage.getItem(key) }
    catch { storageUnavailable = true }
    sessions[key] = restoreSession(stored, set.cards.length) ?? createSession(set.cards.length)
    try { localStorage.setItem(key, JSON.stringify(sessions[key])) }
    catch { storageUnavailable = true }
  }

  function showNonsensePicker(button: HTMLButtonElement) {
    nonsenseButton = button
    draftNonsenseIds = [...nonsenseIds]
    nonsenseDialog.showModal()
  }

  async function startNonsense() {
    const selected = normalizeNonsenseSelection(draftNonsenseIds)
    if (!selected.length) return
    loadSession(createNonsenseSet(selected), selected)
    nonsenseIds = selected
    try { localStorage.setItem(nonsenseSelectionKey, JSON.stringify(selected)) }
    catch { storageUnavailable = true }
    nonsenseDialog.close()
    await openDeck('nonsense-words')
  }

  function setScreenFromHash() {
    navigation.cancel()
    const set = setFromHash(window.location.hash)
    if (set) activeSetId = set.id
    screen = set ? 'deck' : 'sets'
    queuedId = null
    queuedFlipped = false
    returning = false
    flipped = false
    imageFailed = false
  }

  async function openDeck(setId: CardSetId) {
    window.location.hash = setId
    setScreenFromHash()
    await tick()
    if (!complete) cardElement?.focus({ preventScroll: true })
  }

  function returnToSets() {
    history.replaceState(null, '', `${location.pathname}${location.search}`)
    setScreenFromHash()
  }

  function toggleTheme() {
    darkMode = !darkMode
    try { localStorage.setItem(themeKey, String(darkMode)) } catch { /* The theme still works for this visit. */ }
  }

  function showHelp() {
    restartConfirm = false
    helpDialog.showModal()
  }

  function restart() {
    navigation.cancel()
    saveSession(activeSetId, createSession(cardCount))
    flipped = false
    imageFailed = false
    restartConfirm = false
    if (helpDialog.open) helpDialog.close()
  }

  function playCardAnimation(transition: CardTransition, frames: Keyframe[], duration: number) {
    return transition.play(() => cardElement.animate(frames, {
      duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards',
    }))
  }

  async function performCardAction(action: CardAction, transition: CardTransition) {
    if (screen !== 'deck' || transition.cancelled) return
    if (action === 'flip') {
      if (complete || !activeSet.flippable) return
      const outgoing = await playCardAnimation(transition, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(88deg)', opacity: .42 }], 240)
      if (transition.cancelled) return
      flipped = !flipped
      imageFailed = false
      await tick()
      outgoing?.cancel()
      if (transition.cancelled) return
      await playCardAnimation(transition, [{ transform: 'rotateY(-88deg)', opacity: .42 }, { transform: 'rotateY(0)', opacity: 1 }], 290)
      return
    }

    if ((action === 'back' && session.position === 0) ||
      (action !== 'back' && complete) ||
      (action === 'another' && session.position >= cardCount - 1)) return
    const setId = activeSetId
    const updated = action === 'back' ? previousCard(session)
      : action === 'another' ? chooseAnotherCard(session) : nextCard(session)
    try {
      if (action === 'back') {
        // Keep the current card underneath while the previous card returns from the left.
        queuedId = currentId ?? null
        queuedFlipped = flipped
        returning = true
        saveSession(setId, updated)
        flipped = false
        imageFailed = false
        await tick()
        if (transition.cancelled) return
        await playCardAnimation(transition, [
          { transform: 'translateX(-118vw) rotate(-8deg)', opacity: 0 },
          { transform: 'translateX(0) rotate(0)', opacity: 1 },
        ], 520)
      } else {
        queuedId = updated.order[updated.position] ?? null
        queuedFlipped = false
        await tick()
        if (transition.cancelled) return
        await playCardAnimation(transition, [
          { transform: 'translateX(0) rotate(0)', opacity: 1 },
          { transform: 'translateX(-118vw) rotate(-8deg)', opacity: 0 },
        ], 520)
        if (transition.cancelled) return
        saveSession(setId, updated)
        flipped = false
        imageFailed = false
        await tick()
      }
    } finally {
      queuedId = null
      queuedFlipped = false
      returning = false
    }
  }

  function flipCard() { navigation.enqueue('flip') }
  function advance(kind: 'another' | 'next') { navigation.enqueue(kind) }
  function goBack() { navigation.enqueue('back') }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else notice = 'Fullscreen is unavailable in this browser.'
    } catch { notice = 'Fullscreen is unavailable in this browser.' }
  }

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    if (screen !== 'deck' || helpDialog?.open || nonsenseDialog?.open || event.ctrlKey || event.metaKey || event.altKey ||
      target.closest('input, select, textarea, dialog, [contenteditable="true"]')) return
    if (event.repeat && event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return
    if (event.code === 'Space' && activeSet.flippable && !target.closest('button, a')) { event.preventDefault(); void flipCard() }
    if (event.code === 'ArrowRight') { event.preventDefault(); void advance('next') }
    if (event.code === 'ArrowLeft') { event.preventDefault(); void goBack() }
  }

  onMount(() => {
    try {
      const savedSelection = JSON.parse(localStorage.getItem(nonsenseSelectionKey) ?? 'null')
      const selected = normalizeNonsenseSelection(Array.isArray(savedSelection) ? savedSelection : [])
      if (selected.length) nonsenseIds = selected
    } catch { /* Invalid saved choices fall back to Set A. */ }
    for (const set of displaySets) {
      let stored: string | null = null
      try { stored = localStorage.getItem(sessionStorageKey(set.id, nonsenseIds)) }
      catch { storageUnavailable = true }
      saveSession(set.id, restoreSession(stored, set.cards.length) ?? createSession(set.cards.length))
    }
    try {
      darkMode = localStorage.getItem(themeKey) !== 'false'
    } catch { storageUnavailable = true }
    setScreenFromHash()
    return () => navigation.cancel()
  })

  $effect(() => {
    if (!currentId || screen !== 'deck' || activeSet.frontKind === 'text') return
    if (activeSet.flippable) {
      const back = new Image()
      back.src = cardImage(activeSet, currentId, 'back')
    }
    const upcoming = session.order[session.position + 1]
    if (upcoming) { const image = new Image(); image.src = cardImage(activeSet, upcoming, 'front') }
  })
</script>

<svelte:window onhashchange={setScreenFromHash} onkeydown={onKeydown}
  onfullscreenchange={() => fullscreen = Boolean(document.fullscreenElement)} />

{#snippet cardFace(id: number, showBack: boolean, failed: boolean, reportError: boolean)}
  {@const card = activeSet.cards[id - 1]}
  <span class="card-label"><span>{activeSet.name}</span><span>{showBack ? activeSet.backLabel : activeSet.frontLabel}</span></span>
  {#if activeSet.frontKind === 'text'}
    <span class="nonsense-word" style={`--word-length: ${Math.max(card.word.length, 3)}`}>{card.word}</span>
  {:else if activeSet.frontKind === 'symbols' && showBack}
    <span class="sentence">{card.sentence ?? card.word}</span>
  {:else if failed}
    <span class="image-fallback"><strong>{card.word}</strong><span>{card.cue}</span></span>
  {:else if activeSet.id === 'eyewords'}
    <CardArtwork src={cardImage(activeSet, id, showBack ? 'back' : 'front')}
      crop={eyeWordsCrop(id, showBack ? 'back' : 'front')}
      label={showBack ? `${card.word}. ${card.cue}` : `Illustrated sight word: ${card.word}`}
      clipId={`eyewords-${id}-${showBack ? 'back' : 'front'}-${reportError ? 'main' : 'underlay'}`}
      onerror={() => { if (reportError) imageFailed = true }} />
  {:else}
    <img src={cardImage(activeSet, id, showBack ? 'back' : 'front')}
      alt={activeSet.frontKind === 'symbols' ? `${card.word}. Original UFLI card with hearts and sound boxes.` : `Closed syllable: ${card.word}`}
      onerror={() => { if (reportError) imageFailed = true }} draggable="false" />
  {/if}
  {#if activeSet.flippable}
    <span class="flip-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-9a4 4 0 0 0-4 4v2m13-6-3-3m3 3-3 3M4 17h9a4 4 0 0 0 4-4v-2M4 17l3 3m-3-3 3-3" /></svg>{showBack ? activeSet.returnHint : activeSet.revealHint}</span>
  {/if}
{/snippet}

<div class="app" class:dark-mode={darkMode}>
  {#if screen === 'sets'}
    <header class="sets-header">
      <a class="icon-button" href={hubUrl} aria-label="Return to Classroom Tools" title="Classroom Tools">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5M9.5 20v-6h5v6" /></svg>
      </a>
      <button class="icon-button" onclick={toggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} title={darkMode ? 'Use light mode' : 'Use dark mode'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      </button>
    </header>
    <main class="sets-main">
      <h1>Literacy Flashcards</h1>
      <div class="set-grid">
        {#each displaySets as set (set.id)}
          {@const progress = sessions[sessionStorageKey(set.id, nonsenseIds)]?.position ?? 0}
          <button class="set-card" onclick={(event) => set.id === 'nonsense-words' ? showNonsensePicker(event.currentTarget) : openDeck(set.id)}
            aria-label={set.id === 'nonsense-words' ? 'Nonsense Words. Choose sets A, B, C, and D.' : `Open ${set.name}. ${progress} of ${set.cards.length} cards completed.`}
            aria-haspopup={set.id === 'nonsense-words' ? 'dialog' : undefined}>
            <span class="set-preview" style={`--preview-background: ${set.previewBackground}`}>
              {#if set.frontKind === 'text'}
                <span class="text-preview" aria-hidden="true">som</span>
              {:else if set.id === 'eyewords'}
                <CardArtwork src={cardImage(set, 1, 'front')} crop={eyeWordsCrop(1, 'front')}
                  label={`${set.name} card: ${set.cards[0].word}`} clipId="eyewords-preview" />
              {:else}
                <img src={cardImage(set, 1, 'front')} alt={`${set.name} card: ${set.cards[0].word}`} width="946" height="633" />
              {/if}
            </span>
            <span class="set-copy"><span class="set-count">{set.id === 'nonsense-words' ? '4 sets · Single-sided' : `${set.cards.length} cards`}</span>
              <span class="set-title">{set.name} <span aria-hidden="true">↗</span></span>
              {#if set.id === 'nonsense-words'}
                <span class="set-bottom">Choose sets A–D to practise</span>
              {:else}
                <span class="set-progress"><span style={`width: ${progress / set.cards.length * 100}%`}></span></span>
                <span class="set-bottom">{progress}/{set.cards.length} completed</span>
              {/if}
            </span>
          </button>
        {/each}
      </div>
    </main>
  {:else}
    <header class="question-header">
      <button class="icon-button" onclick={returnToSets} disabled={busy} aria-label="Return to card sets" title="Card sets">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7M6 9.5V20h12V9.5M9.5 20v-6h5v6" /></svg>
      </button>
      <div class="active-set-heading"><h1>{activeSet.name}</h1><span>{session.position}/{cardCount} completed</span></div>
      <div class="header-actions">
        <button class="icon-button" bind:this={helpButton} onclick={showHelp} disabled={busy} aria-label="Help and settings" title="Help and settings"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16.5v.1" /></svg></button>
        <button class="icon-button fullscreen-button" onclick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>
        <button class="icon-button previous-card-button" onclick={goBack} disabled={!busy && session.position === 0} aria-label="Previous card" title={busy || session.position > 0 ? 'Return to the previous card and mark it incomplete.' : 'No completed cards to return to.'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg></button>
      </div>
    </header>
    <main class="question-stage">
      {#if complete}
        <section class="complete-card">
          <span class="complete-icon" aria-hidden="true">✓</span>
          <p class="eyebrow">{activeSet.name} · Set complete</p>
          <h2>{cardCount} cards.<br />Well done!</h2>
          <p>You’ve practised every card in this set.</p>
          <button class="primary-button" onclick={restart}>Shuffle and practise again <span aria-hidden="true">↻</span></button>
          <button class="text-button" onclick={returnToSets}>Back to card sets</button>
        </section>
      {:else if currentCard}
        <div class="card-stack" aria-busy={busy}>
          {#if queuedId}
            <div class="flashcard underlay" class:returning aria-hidden="true">
              {@render cardFace(queuedId, queuedFlipped, false, false)}
            </div>
          {/if}
          {#if activeSet.flippable}
            <button class="flashcard" class:cue-side={flipped} bind:this={cardElement} onclick={flipCard} disabled={busy}
              aria-label={`${flipped && currentCard.sentence ? currentCard.sentence : `${currentCard.word}.`} ${flipped ? activeSet.backLabel : activeSet.frontLabel}. ${flipped ? activeSet.returnHint : activeSet.revealHint}.`}
              aria-pressed={flipped}>
              {@render cardFace(currentId, flipped, imageFailed, true)}
            </button>
          {:else}
            <article class="flashcard single-sided" bind:this={cardElement} tabindex="-1" aria-label={`${activeSet.frontLabel}: ${currentCard.word}`}>
              {@render cardFace(currentId, false, imageFailed, true)}
            </article>
          {/if}
        </div>
        <div class="deck-footer">
          <div class="question-controls">
            <button class="secondary-button" disabled={!busy && session.position >= cardCount - 1} onclick={() => advance('another')}>Reshuffle</button>
            <button class="primary-button" onclick={() => advance('next')}>Next</button>
          </div>
          <p class="keyboard-hint">{#if activeSet.flippable}Space to flip <span>·</span>{/if} ← previous card <span>·</span> → next card</p>
        </div>
      {/if}
    </main>
  {/if}
  {#if storageUnavailable}<p class="status-notice" role="status">Progress can’t be saved in this browser. You can still practise.</p>{/if}
  {#if notice}<button class="status-notice" onclick={() => notice = ''} aria-label={`${notice} Dismiss.`}>{notice} ×</button>{/if}
  <span class="sr-only" aria-live="polite">{screen === 'deck' ? complete ? `Set complete. All ${cardCount} cards practised.` : `Card ${session.position + 1} of ${cardCount}. ${flipped ? activeSet.backLabel : activeSet.frontLabel}.` : ''}</span>
</div>

<dialog bind:this={nonsenseDialog} class="nonsense-picker" class:light-dialog={!darkMode}
  aria-labelledby="nonsense-picker-title" aria-describedby="nonsense-picker-description"
  onclose={() => { if (nonsenseButton?.isConnected) nonsenseButton.focus() }}>
  <div class="dialog-heading">
    <h2 id="nonsense-picker-title">Nonsense Words</h2>
    <button class="icon-button" aria-label="Close set picker" onclick={() => nonsenseDialog.close()}>×</button>
  </div>
  <p id="nonsense-picker-description">Choose one or more sets. Words from your chosen sets are shuffled together.</p>
  <form onsubmit={(event) => { event.preventDefault(); void startNonsense() }}>
    <div class="nonsense-table-scroll">
      <table class="nonsense-table">
        <caption class="sr-only">Select nonsense word sets by syllables and blends.</caption>
        <thead><tr>
          <th scope="col">Set</th>
          {#each nonsenseGroups as group (group.id)}
            <th scope="col"><label class="nonsense-choice"><input type="checkbox" bind:group={draftNonsenseIds} value={group.id} aria-label={`Include Set ${group.id}`} /><span>{group.id}</span></label></th>
          {/each}
        </tr></thead>
        <tbody>
          <tr><th scope="row">Syllables?</th>{#each nonsenseGroups as group (group.id)}<td>{group.syllables}</td>{/each}</tr>
          <tr><th scope="row">R-Blends?</th>{#each nonsenseGroups as group (group.id)}<td>{group.rBlends ? 'Yes' : 'No'}</td>{/each}</tr>
          <tr><th scope="row">S-Blends?</th>{#each nonsenseGroups as group (group.id)}<td>{group.sBlends ? 'Yes' : 'No'}</td>{/each}</tr>
          <tr><th scope="row">L-Blends?</th>{#each nonsenseGroups as group (group.id)}<td>{group.lBlends ? 'Yes' : 'No'}</td>{/each}</tr>
          <tr><th scope="row">Words</th>{#each nonsenseGroups as group (group.id)}<td>{group.words.length}</td>{/each}</tr>
          <tr><th scope="row">Examples</th>{#each nonsenseGroups as group (group.id)}<td class="nonsense-examples">{#each group.words.slice(0, 3) as word}<span>{word}</span>{/each}</td>{/each}</tr>
        </tbody>
      </table>
    </div>
    <details class="nonsense-word-lists">
      <summary>View all word lists</summary>
      {#each nonsenseGroups as group (group.id)}
        <section><h3>Set {group.id} · {group.words.length} words</h3><p>{group.words.join(' · ')}</p></section>
      {/each}
    </details>
    <p class="help-note" role="status">{draftWordCount ? `${draftWordCount} words selected. Progress is saved for each combination of sets.` : 'Choose at least one set to begin.'}</p>
    <div class="nonsense-picker-actions">
      <button type="button" class="secondary-button" onclick={() => nonsenseDialog.close()}>Cancel</button>
      <button type="submit" class="primary-button" disabled={!draftWordCount}>{draftWordCount ? `Practise ${draftWordCount} words` : 'Choose a set'}</button>
    </div>
  </form>
</dialog>

<dialog bind:this={helpDialog} class:light-dialog={!darkMode} onclose={() => helpButton?.focus()}>
  <div class="dialog-heading"><h2>Help & settings</h2><button class="icon-button" aria-label="Close help" onclick={() => helpDialog.close()}>×</button></div>
  <p>{activeSet.instructions}</p>
  <dl><dt>Next</dt><dd>Marks this card complete and draws a new one.</dd><dt>Reshuffle</dt><dd>Draws a different card. This one stays in the deck for later.</dd><dt>Previous card (←)</dt><dd>Returns to the last completed card and marks it incomplete. Press again to go further back.</dd></dl>
  <p class="help-note">Completed cards won’t repeat. Your shuffled deck and progress are saved on this device.</p>
  <label class="theme-setting">Dark mode<input type="checkbox" checked={darkMode} onchange={toggleTheme} /></label>
  <div class="restart-setting">
    {#if restartConfirm}
      <p>Restart {activeSet.name}? Your completed count will return to 0.</p>
      <div class="restart-actions"><button class="secondary-button" onclick={() => restartConfirm = false}>Keep progress</button><button class="primary-button" onclick={restart}>Restart set</button></div>
    {:else}
      <button class="secondary-button" onclick={() => restartConfirm = true}>Restart and shuffle set</button>
    {/if}
  </div>
  <p class="source-credit">{activeSet.credit}</p>
</dialog>
