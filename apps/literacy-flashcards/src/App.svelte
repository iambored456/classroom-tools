<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { cardSets, cardImage, sessionStorageKey, setFromHash } from './sets'
  import type { CardSetId } from './sets'
  import { chooseAnotherCard, createSession, nextCard, previousCard, restoreSession } from './deck'
  import type { DeckSession } from './deck'
  import { createTransitionQueue } from './transitions'
  import type { CardTransition } from './transitions'
  import CardArtwork from './CardArtwork.svelte'
  import { eyeWordsCrop } from './artwork'

  type CardAction = 'flip' | 'next' | 'another' | 'back'

  const themeKey = 'literacy-flashcards.dark-mode'
  let activeSetId = $state<CardSetId>('eyewords')
  let sessions = $state<Record<CardSetId, DeckSession>>(Object.fromEntries(
    cardSets.map(set => [set.id, createSession(set.cards.length)]),
  ) as Record<CardSetId, DeckSession>)
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
  const activeSet = $derived(cardSets.find(set => set.id === activeSetId)!)
  const session = $derived(sessions[activeSetId])
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
    sessions[setId] = updated
    try { localStorage.setItem(sessionStorageKey(setId), JSON.stringify(updated)) }
    catch { storageUnavailable = true }
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
    if (screen !== 'deck' || helpDialog?.open || event.ctrlKey || event.metaKey || event.altKey ||
      target.closest('input, select, textarea, dialog, [contenteditable="true"]')) return
    if (event.repeat && event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return
    if (event.code === 'Space' && activeSet.flippable && !target.closest('button, a')) { event.preventDefault(); void flipCard() }
    if (event.code === 'ArrowRight') { event.preventDefault(); void advance('next') }
    if (event.code === 'ArrowLeft') { event.preventDefault(); void goBack() }
  }

  onMount(() => {
    for (const set of cardSets) {
      let stored: string | null = null
      try { stored = localStorage.getItem(sessionStorageKey(set.id)) }
      catch { storageUnavailable = true }
      saveSession(set.id, restoreSession(stored, set.cards.length) ?? sessions[set.id])
    }
    try {
      darkMode = localStorage.getItem(themeKey) !== 'false'
    } catch { storageUnavailable = true }
    setScreenFromHash()
    return () => navigation.cancel()
  })

  $effect(() => {
    if (!currentId || screen !== 'deck') return
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
  {#if activeSet.frontKind === 'symbols' && showBack}
    <span class="plain-word" style={`--word-length: ${Math.max(card.word.length, 3)}`}>{card.word}</span>
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
        {#each cardSets as set (set.id)}
          {@const progress = sessions[set.id].position}
          <button class="set-card" onclick={() => openDeck(set.id)} aria-label={`Open ${set.name}. ${progress} of ${set.cards.length} cards completed.`}>
            <span class="set-preview" style={`--preview-background: ${set.previewBackground}`}>
              {#if set.id === 'eyewords'}
                <CardArtwork src={cardImage(set, 1, 'front')} crop={eyeWordsCrop(1, 'front')}
                  label={`${set.name} card: ${set.cards[0].word}`} clipId="eyewords-preview" />
              {:else}
                <img src={cardImage(set, 1, 'front')} alt={`${set.name} card: ${set.cards[0].word}`} width="946" height="633" />
              {/if}
            </span>
            <span class="set-copy"><span class="set-count">{set.cards.length} cards</span>
              <span class="set-title">{set.name} <span aria-hidden="true">↗</span></span>
              <span class="set-progress"><span style={`width: ${progress / set.cards.length * 100}%`}></span></span>
              <span class="set-bottom">{progress}/{set.cards.length} completed</span>
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
              aria-label={`${currentCard.word}. ${flipped ? activeSet.backLabel : activeSet.frontLabel}. ${flipped ? activeSet.returnHint : activeSet.revealHint}.`}
              aria-pressed={flipped}>
              {@render cardFace(currentId, flipped, imageFailed, true)}
            </button>
          {:else}
            <article class="flashcard single-sided" bind:this={cardElement} tabindex="-1" aria-label={`Closed syllable: ${currentCard.word}`}>
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
