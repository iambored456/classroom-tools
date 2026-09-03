<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { resetGroups } from './storage'
  import { DIFFICULTIES, type Difficulty, type WordGroup } from './types'

  export let groups: WordGroup[]

  const dispatch = createEventDispatcher<{
    close: void
    change: WordGroup[]
  }>()

  const difficultyDetails: Record<Difficulty, { label: string }> = {
    easy: { label: 'Easy' },
    medium: { label: 'Medium' },
    hard: { label: 'Hard' },
    tricky: { label: 'Tricky' },
  }

  let dialog: HTMLDivElement | null = null
  let showForm = false
  let editingId: string | null = null
  let title = ''
  let words = ['', '', '', '']
  let formDifficulty: Difficulty = 'easy'
  let formError = ''
  let copyFeedback: { difficulty: Difficulty; message: 'Copied!' | 'Copy failed' } | null = null
  let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
  let expandedDifficulties = new Set<Difficulty>()

  $: enabledCount = groups.filter((group) => group.enabled).length

  const emitGroups = (nextGroups: WordGroup[]) => {
    dispatch('change', nextGroups)
  }

  const close = () => dispatch('close')

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showForm) {
        closeForm()
      } else {
        close()
      }
    }
  }

  const openAddForm = () => {
    editingId = null
    title = ''
    words = ['', '', '', '']
    formDifficulty = 'easy'
    formError = ''
    showForm = true
  }

  const openEditForm = (group: WordGroup) => {
    editingId = group.id
    title = group.title
    words = [...group.words]
    formDifficulty = group.difficulty
    formError = ''
    showForm = true
  }

  const closeForm = () => {
    showForm = false
    editingId = null
    formError = ''
  }

  const updateWord = (index: number, value: string) => {
    words = words.map((word, wordIndex) => (wordIndex === index ? value : word))
  }

  const saveForm = () => {
    const cleanTitle = title.trim()
    const cleanWords = words.map((word) => word.trim())
    const uniqueWords = new Set(cleanWords.map((word) => word.toLocaleLowerCase()))

    if (!cleanTitle) {
      formError = 'Give this group a category name.'
      return
    }

    if (cleanWords.some((word) => !word)) {
      formError = 'Add all four words before saving.'
      return
    }

    if (uniqueWords.size !== 4) {
      formError = 'Each word in a group needs to be different.'
      return
    }

    if (editingId) {
      emitGroups(
        groups.map((group) =>
          group.id === editingId
            ? {
                ...group,
                title: cleanTitle,
                words: cleanWords,
                difficulty: formDifficulty,
              }
            : group,
        ),
      )
    } else {
      const randomPart = Math.random().toString(36).slice(2, 8)
      const newGroup: WordGroup = {
        id: `custom-${Date.now()}-${randomPart}`,
        title: cleanTitle,
        words: cleanWords,
        difficulty: formDifficulty,
        enabled: true,
        custom: true,
      }
      emitGroups([...groups, newGroup])
    }

    closeForm()
  }

  const toggleGroup = (groupId: string) => {
    emitGroups(
      groups.map((group) =>
        group.id === groupId ? { ...group, enabled: !group.enabled } : group,
      ),
    )
  }

  const moveGroup = (groupId: string, difficulty: Difficulty) => {
    emitGroups(
      groups.map((group) => (group.id === groupId ? { ...group, difficulty } : group)),
    )
  }

  const setDifficultyEnabled = (difficulty: Difficulty, enabled: boolean) => {
    emitGroups(
      groups.map((group) =>
        group.difficulty === difficulty ? { ...group, enabled } : group,
      ),
    )
  }

  const toggleDifficulty = (difficulty: Difficulty) => {
    const nextExpanded = new Set(expandedDifficulties)
    if (nextExpanded.has(difficulty)) nextExpanded.delete(difficulty)
    else nextExpanded.add(difficulty)
    expandedDifficulties = nextExpanded
  }

  const copyDifficultyGroups = async (difficulty: Difficulty) => {
    const text = groups
      .filter((group) => group.difficulty === difficulty)
      .map((group) => `${group.title}:(${group.words.join(',')})`)
      .join('\n')

    if (!text) return

    let copied = false
    try {
      await navigator.clipboard.writeText(text)
      copied = true
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      copied = document.execCommand('copy')
      textArea.remove()
    }

    copyFeedback = {
      difficulty,
      message: copied ? 'Copied!' : 'Copy failed',
    }
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copyFeedback = null
    }, 1600)
  }

  const deleteGroup = (group: WordGroup) => {
    if (!group.custom) return
    if (!window.confirm(`Delete “${group.title}”?`)) return
    emitGroups(groups.filter((candidate) => candidate.id !== group.id))
  }

  const restoreStarterLibrary = () => {
    if (!window.confirm('Restore the starter library? Teacher-created groups and edits will be removed.')) {
      return
    }
    emitGroups(resetGroups())
    closeForm()
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
      <h2 id="library-title">Group Library</h2>
      <p>Choose which groups can appear, or move them to a different difficulty.</p>
    </div>
    <button type="button" class="icon-button close-button" aria-label="Close group library" on:click={close}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18"></path>
      </svg>
    </button>
  </header>

  <div class="library-summary">
    <div class="enabled-summary">
      <span class="summary-number">{enabledCount}</span>
      <span>of {groups.length} groups enabled</span>
    </div>
    <div class="library-top-actions">
      <span class="saved-label">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        Saved on this device
      </span>
      <button type="button" class="add-button" on:click={openAddForm}>
        <span aria-hidden="true">+</span> Add group
      </button>
      <button type="button" class="text-button" on:click={restoreStarterLibrary}>Reset library</button>
    </div>
  </div>

  <main class="library-content">
    {#if showForm}
      <form class="group-form" on:submit|preventDefault={saveForm}>
        <div class="form-heading">
          <div>
            <p class="form-eyebrow">{editingId ? 'Edit group' : 'New group'}</p>
            <h3>{editingId ? 'Update this connection' : 'Create a connection'}</h3>
          </div>
          <button type="button" class="text-button" on:click={closeForm}>Cancel</button>
        </div>

        <div class="form-grid">
          <label class="category-field">
            <span>Category name</span>
            <input bind:value={title} maxlength="60" placeholder="e.g. Bugs" autocomplete="off" />
          </label>

          <label class="difficulty-field">
            <span>Difficulty</span>
            <select bind:value={formDifficulty}>
              {#each DIFFICULTIES as difficulty}
                <option value={difficulty}>{difficultyDetails[difficulty].label}</option>
              {/each}
            </select>
          </label>

          <fieldset class="word-fields">
            <legend>Four connected words</legend>
            <div class="word-input-grid">
              {#each words as word, index}
                <label>
                  <span class="sr-only">Word {index + 1}</span>
                  <input
                    value={word}
                    maxlength="32"
                    placeholder={`Word ${index + 1}`}
                    autocomplete="off"
                    on:input={(event) =>
                      updateWord(index, (event.currentTarget as HTMLInputElement).value)}
                  />
                </label>
              {/each}
            </div>
          </fieldset>
        </div>

        <div class="form-footer">
          <p class:error-visible={formError} aria-live="polite">{formError || 'Exactly four words are needed.'}</p>
          <button type="submit" class="save-button">{editingId ? 'Save changes' : 'Add to library'}</button>
        </div>
      </form>
    {/if}

    <div class="library-tiers">
      {#each DIFFICULTIES as difficulty}
        {@const tierGroups = groups.filter((group) => group.difficulty === difficulty)}
        <section class="tier-section" aria-labelledby={`tier-${difficulty}`}>
          <div class="tier-heading">
            <button
              type="button"
              class="tier-toggle"
              aria-expanded={expandedDifficulties.has(difficulty)}
              aria-controls={`tier-content-${difficulty}`}
              on:click={() => toggleDifficulty(difficulty)}
            >
              <span class={`tier-title-row ${difficulty}`}>
                <span class="tier-swatch" aria-hidden="true"></span>
                <h3 id={`tier-${difficulty}`}>{difficultyDetails[difficulty].label}</h3>
              </span>
              <span class="tier-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="tier-section-actions">
              <button
                type="button"
                class="small-button copy-button"
                class:copied={
                  copyFeedback?.difficulty === difficulty && copyFeedback.message === 'Copied!'
                }
                class:copy-failed={
                  copyFeedback?.difficulty === difficulty && copyFeedback.message === 'Copy failed'
                }
                disabled={tierGroups.length === 0}
                aria-label={`Copy all ${difficultyDetails[difficulty].label} groups`}
                on:click={() => copyDifficultyGroups(difficulty)}
              >
                {copyFeedback?.difficulty === difficulty ? copyFeedback.message : 'Copy all'}
              </button>
              <button
                type="button"
                class="small-button"
                on:click={() => setDifficultyEnabled(difficulty, true)}
              >
                Enable all
              </button>
              <button
                type="button"
                class="small-button"
                on:click={() => setDifficultyEnabled(difficulty, false)}
              >
                Disable all
              </button>
            </div>
          </div>

          {#if expandedDifficulties.has(difficulty)}
            <div id={`tier-content-${difficulty}`} class="tier-content">
            {#if tierGroups.length > 0}
              <div class="group-list">
              {#each tierGroups as group (group.id)}
                <article class="group-card" class:disabled={!group.enabled}>
                  <div class="group-toggle-row">
                    <label class="switch-label">
                      <input
                        type="checkbox"
                        checked={group.enabled}
                        on:change={() => toggleGroup(group.id)}
                      />
                      <span class="switch-track" aria-hidden="true"><span></span></span>
                      <span class="sr-only">{group.enabled ? 'Disable' : 'Enable'} {group.title}</span>
                    </label>
                    <div class="group-title-wrap">
                      <h4>{group.title}</h4>
                      {#if group.custom}<span class="custom-badge">Teacher-made</span>{/if}
                    </div>
                    <div class="group-card-actions">
                      <label class="move-control">
                        <span>Move to</span>
                        <select
                          value={group.difficulty}
                          on:change={(event) =>
                            moveGroup(
                              group.id,
                              (event.currentTarget as HTMLSelectElement).value as Difficulty,
                            )}
                        >
                          {#each DIFFICULTIES as targetDifficulty}
                            <option value={targetDifficulty}>{difficultyDetails[targetDifficulty].label}</option>
                          {/each}
                        </select>
                      </label>
                      <button type="button" class="edit-button" on:click={() => openEditForm(group)}>Edit</button>
                      {#if group.custom}
                        <button type="button" class="delete-button" on:click={() => deleteGroup(group)}>Delete</button>
                      {/if}
                    </div>
                  </div>

                  <p class="word-preview">{group.words.join(' · ')}</p>
                </article>
              {/each}
              </div>
            {:else}
              <div class="empty-tier">
                <p>No groups are in this difficulty yet.</p>
              </div>
            {/if}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  </main>
</div>
