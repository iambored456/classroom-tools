<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { resetBank } from './storage'
  import { WORD_LENGTHS, type WordLength, type WordLibrary, type WordSet } from './types'
  import { analyzeWordText, parseWordText } from './words'

  export let library: WordLibrary
  export let initialLength: WordLength

  const dispatch = createEventDispatcher<{
    close: void
    change: WordLibrary
  }>()

  let selectedLength: WordLength = initialLength
  let dialog: HTMLDivElement | null = null
  let copyFeedbackId: string | null = null
  let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
  let closeError = ''

  $: currentSets = library[selectedLength]
  $: activeSet = currentSets.find((set) => set.enabled) ?? null
  $: activeWordCount = activeSet ? parseWordText(activeSet.text, selectedLength).length : 0

  const close = () => dispatch('close')

  const emit = (nextLibrary: WordLibrary) => {
    library = nextLibrary
    dispatch('change', nextLibrary)
  }

  const selectLength = (length: WordLength) => {
    selectedLength = length
    copyFeedbackId = null
    closeError = ''
  }

  const wordCountForLength = (length: WordLength) => {
    const enabledSet = library[length].find((set) => set.enabled)
    return enabledSet ? parseWordText(enabledSet.text, length).length : 0
  }

  const updateSetText = (setId: string, text: string) => {
    const editedSet = currentSets.find((set) => set.id === setId)
    if (!editedSet?.enabled || parseWordText(text, selectedLength).length > 0) closeError = ''
    emit({
      ...library,
      [selectedLength]: currentSets.map((set) => (set.id === setId ? { ...set, text } : set)),
    })
  }

  const toggleSet = (setId: string) => {
    const selectedSet = currentSets.find((set) => set.id === setId)
    if (!selectedSet) return
    closeError = ''
    const shouldEnable = !selectedSet.enabled
    emit({
      ...library,
      [selectedLength]: currentSets.map((set) => ({
        ...set,
        enabled: set.id === setId ? shouldEnable : false,
      })),
    })
  }

  const nextSetLetter = () => {
    const usedLabels = new Set(currentSets.map((set) => set.label.toLocaleUpperCase()))
    for (let code = 65; code <= 90; code += 1) {
      const letter = String.fromCharCode(code)
      if (!usedLabels.has(`SET ${letter}`)) return letter
    }
    return null
  }

  const addSet = () => {
    const letter = nextSetLetter()
    if (!letter) return
    const nextSet: WordSet = {
      id: `custom-${selectedLength}-${letter.toLocaleLowerCase()}-${Date.now()}`,
      label: `Set ${letter}`,
      text: '',
      enabled: false,
      starter: false,
    }
    emit({ ...library, [selectedLength]: [...currentSets, nextSet] })
  }

  const deleteSet = (set: WordSet) => {
    if (set.starter) return
    if (!window.confirm(`Delete ${set.label}? Its pasted word list will be removed.`)) return
    emit({
      ...library,
      [selectedLength]: currentSets.filter((candidate) => candidate.id !== set.id),
    })
  }

  const restoreBank = () => {
    if (
      !window.confirm(
        `Reset all ${selectedLength}-letter sets? Pasted lists and added sets for this length will be removed.`,
      )
    ) return
    closeError = ''
    emit(resetBank(library, selectedLength))
  }

  const finish = () => {
    if (activeSet && activeWordCount === 0) {
      closeError = `${activeSet.label} is on but has no valid ${selectedLength}-letter words.`
      document.querySelector('.word-set-card.enabled')?.scrollIntoView({ block: 'center' })
      return
    }
    close()
  }

  const copySet = async (set: WordSet) => {
    const normalizedWords = parseWordText(set.text, selectedLength).join(', ')
    if (!normalizedWords) return

    try {
      await navigator.clipboard.writeText(normalizedWords)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = normalizedWords
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }

    copyFeedbackId = set.id
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copyFeedbackId = null
    }, 1400)
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  }

  onMount(() => {
    document.body.classList.add('modal-open')
    dialog?.focus()
  })

  onDestroy(() => {
    document.body.classList.remove('modal-open')
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
  })
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="library-backdrop" aria-hidden="true"></div>
<div
  class="library-dialog"
  bind:this={dialog}
  role="dialog"
  aria-modal="true"
  aria-labelledby="library-title"
  tabindex="-1"
>
  <header class="library-header">
    <div>
      <h2 id="library-title">Word Library</h2>
    </div>
    <button type="button" class="icon-button" aria-label="Close word library" on:click={close}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
    </button>
  </header>

  <nav class="length-tabs" aria-label="Word length banks">
    {#each WORD_LENGTHS as length}
      {@const wordCount = wordCountForLength(length)}
      <button
        type="button"
        class:active={selectedLength === length}
        aria-current={selectedLength === length ? 'page' : undefined}
        on:click={() => selectLength(length)}
      >
        <strong>{length}</strong>
        <span>{wordCount} active {wordCount === 1 ? 'word' : 'words'}</span>
      </button>
    {/each}
  </nav>

  <main class="library-content set-library-content">
    <section class="library-toolbar" aria-labelledby="bank-heading">
      <div>
        <p class="eyebrow">Answer sets</p>
        <h3 id="bank-heading">{selectedLength}-letter words</h3>
        <p>
          {#if activeSet}
            {activeSet.label} is on · {activeWordCount} valid {activeWordCount === 1 ? 'word' : 'words'}
          {:else}
            No set is on
          {/if}
        </p>
      </div>
      <div class="toolbar-actions">
        <button type="button" disabled={!nextSetLetter()} on:click={addSet}>+ Add set</button>
        <button type="button" class="reset-button" on:click={restoreBank}>Reset sets</button>
      </div>
    </section>

    <div class="word-set-list">
      {#each currentSets as set (set.id)}
        {@const analysis = analyzeWordText(set.text, selectedLength)}
        <article
          class="word-set-card"
          class:enabled={set.enabled}
          class:error-state={Boolean(closeError) && set.enabled && analysis.words.length === 0}
        >
          <header class="word-set-header">
            <label class="set-toggle">
              <input
                type="checkbox"
                checked={set.enabled}
                aria-label={`Use ${set.label}`}
                on:change={() => toggleSet(set.id)}
              />
              <span class="set-toggle-track" aria-hidden="true"><span></span></span>
              <span class="toggle-copy">{set.enabled ? 'On' : 'Off'}</span>
            </label>

            <div class="set-heading">
              <h4>{set.label}</h4>
              <span>{analysis.words.length} valid {analysis.words.length === 1 ? 'word' : 'words'}</span>
            </div>

            <div class="set-actions">
              <button
                type="button"
                disabled={analysis.words.length === 0}
                on:click={() => copySet(set)}
              >{copyFeedbackId === set.id ? 'Copied!' : 'Copy words'}</button>
              {#if !set.starter}
                <button type="button" class="delete-button" on:click={() => deleteSet(set)}>Delete set</button>
              {/if}
            </div>
          </header>

          <label class="set-text-label" for={`set-${set.id}`}>{set.label} word list</label>
          <textarea
            id={`set-${set.id}`}
            value={set.text}
            rows="6"
            spellcheck="false"
            placeholder={`Paste ${selectedLength}-letter words here…`}
            on:input={(event) => updateSetText(set.id, (event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>

          <footer class="set-analysis" class:warning={set.enabled && analysis.words.length === 0}>
            {#if set.enabled && analysis.words.length === 0}
              This set is on but contains no valid {selectedLength}-letter words.
            {:else if analysis.duplicateCount > 0 || analysis.ignoredCount > 0}
              {analysis.duplicateCount} duplicate {analysis.duplicateCount === 1 ? 'entry' : 'entries'} removed ·
              {analysis.ignoredCount} other {analysis.ignoredCount === 1 ? 'token' : 'tokens'} ignored
            {:else if analysis.words.length > 0}
              Ready to use
            {:else}
              Paste a list to fill this set.
            {/if}
          </footer>
        </article>
      {/each}
    </div>
  </main>

  <footer class="library-footer">
    {#if closeError}
      <span class="library-footer-error" role="alert">{closeError}</span>
    {:else}
      <span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        Saved on this device · only one set can be on at a time
      </span>
    {/if}
    <button type="button" class="done-button" class:invalid={Boolean(closeError)} on:click={finish}>Done</button>
  </footer>
</div>
