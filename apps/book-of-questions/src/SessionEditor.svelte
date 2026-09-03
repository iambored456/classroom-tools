<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { categoryColour } from './data'
  import type { Category, Question, QuestionSession } from './types'

  export let categories: Category[]
  export let questions: Question[]
  export let session: QuestionSession | null = null
  export let suggestedName = 'Session 1'

  const dispatch = createEventDispatcher<{
    close: void
    save: { name: string; categoryIds: string[]; includeExplicit: boolean }
  }>()

  let name = session?.name ?? suggestedName
  let selectedCategoryIds = [...(session?.categoryIds ?? [])]
  let includeExplicit = session?.includeExplicit ?? false
  let error = ''
  let nameInput: HTMLInputElement | null = null

  const enabledCount = (categoryId: string, allowExplicit: boolean) =>
    questions.filter(
      (question) =>
        question.categoryId === categoryId &&
        question.enabled &&
        (allowExplicit || !question.explicit),
    ).length

  const toggleCategory = (categoryId: string) => {
    selectedCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId]
    error = ''
  }

  const selectAll = () => {
    selectedCategoryIds = categories
      .filter((category) => enabledCount(category.id, includeExplicit) > 0)
      .map((category) => category.id)
    error = ''
  }

  const save = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      error = 'Give this session a name.'
      nameInput?.focus()
      return
    }
    if (selectedCategoryIds.length === 0) {
      error = 'Choose at least one category.'
      return
    }
    if (availableQuestionCount === 0) {
      error = 'Choose a category with at least one available question.'
      return
    }
    dispatch('save', { name: trimmedName, categoryIds: selectedCategoryIds, includeExplicit })
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dispatch('close')
  }

  $: availableQuestionCount = questions.filter(
    (question) =>
      question.enabled &&
      selectedCategoryIds.includes(question.categoryId) &&
      (includeExplicit || !question.explicit),
  ).length

  onMount(() => {
    document.body.classList.add('modal-open')
    nameInput?.focus()
    nameInput?.select()
    return () => document.body.classList.remove('modal-open')
  })
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop" aria-hidden="true"></div>
<div class="session-dialog" role="dialog" aria-modal="true" aria-labelledby="session-editor-title">
  <header class="dialog-heading">
    <div>
      <p class="eyebrow">{session ? 'Session settings' : 'New session'}</p>
      <h2 id="session-editor-title">{session ? 'Edit this session' : 'Choose your questions'}</h2>
    </div>
    <button class="icon-button" type="button" aria-label="Close session editor" on:click={() => dispatch('close')}>×</button>
  </header>

  <div class="session-editor-content">
    <label class="field-label">
      <span>Session name</span>
      <input bind:this={nameInput} bind:value={name} maxlength="80" placeholder="e.g. Period 2 check-in" />
    </label>

    <label class="explicit-session-choice" class:selected={includeExplicit}>
      <input type="checkbox" bind:checked={includeExplicit} />
      <span>
        <strong>Include Explicit Questions?</strong>
        <small>Choose whether questions marked Explicit can appear in this session.</small>
      </span>
      <span class="explicit-session-state">{includeExplicit ? 'Included' : 'Excluded'}</span>
    </label>

    <div class="category-heading">
      <div>
        <span class="field-title">Categories</span>
        <small>Select the pools this session can draw from.</small>
      </div>
      <div class="text-actions">
        <button type="button" on:click={selectAll}>Select all</button>
        <button type="button" on:click={() => (selectedCategoryIds = [])}>Clear</button>
      </div>
    </div>

    <div class="category-choice-grid">
      {#each categories as category (category.id)}
        {@const count = enabledCount(category.id, includeExplicit)}
        <label class="category-choice" class:selected={selectedCategoryIds.includes(category.id)} class:empty={count === 0}>
          <input
            type="checkbox"
            checked={selectedCategoryIds.includes(category.id)}
            disabled={count === 0}
            on:change={() => toggleCategory(category.id)}
          />
          <span class="category-dot" style={`--category-colour: ${categoryColour(category.id, categories)}`}></span>
          <span><strong>{category.name}</strong><small>{count.toLocaleString()} questions</small></span>
          <span class="checkmark" aria-hidden="true">✓</span>
        </label>
      {/each}
    </div>
  </div>

  <footer class="dialog-footer">
    <div>
      <strong>{availableQuestionCount.toLocaleString()}</strong>
      <span>questions available</span>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
    </div>
    <div class="footer-actions">
      <button class="dialog-button secondary" type="button" on:click={() => dispatch('close')}>Cancel</button>
      <button class="dialog-button primary" type="button" on:click={save}>{session ? 'Save Changes' : 'Start Session'}</button>
    </div>
  </footer>
</div>
