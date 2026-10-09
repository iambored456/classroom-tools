<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { categoryColour, questionMatchesSession, SENSITIVE_TOPIC_LABELS } from './data'
  import type { Category, Question, QuestionSession, SensitiveTopic } from './types'

  export let categories: Category[]
  export let questions: Question[]
  export let session: QuestionSession | null = null
  export let suggestedName = 'Session 1'

  const dispatch = createEventDispatcher<{
    close: void
    save: { name: string; categoryIds: string[]; includedSensitiveTopics: SensitiveTopic[] }
  }>()

  let name = session?.name ?? suggestedName
  let selectedCategoryIds = [...(session?.categoryIds ?? [])]
  let includedSensitiveTopics = [...(session?.includedSensitiveTopics ?? [])]
  let error = ''
  let nameInput: HTMLInputElement | null = null

  const enabledCount = (categoryId: string) =>
    questions.filter((question) => questionMatchesSession(question, {
      categoryIds: [categoryId], includedSensitiveTopics: [],
    })).length

  const sensitiveTopicCount = (topic: SensitiveTopic) =>
    questions.filter((question) => question.enabled && question.sensitiveTopics.includes(topic)).length

  const toggleSensitiveTopic = (topic: SensitiveTopic) => {
    includedSensitiveTopics = includedSensitiveTopics.includes(topic)
      ? includedSensitiveTopics.filter((item) => item !== topic)
      : [...includedSensitiveTopics, topic]
    error = ''
  }

  const toggleCategory = (categoryId: string) => {
    selectedCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId]
    error = ''
  }

  const selectAll = () => {
    selectedCategoryIds = categories
      .filter((category) => enabledCount(category.id) > 0)
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
    if (selectedCategoryIds.length === 0 && includedSensitiveTopics.length === 0) {
      error = 'Choose at least one category or sensitive topic.'
      return
    }
    if (availableQuestionCount === 0) {
      error = 'Choose a category or sensitive topic with at least one available question.'
      return
    }
    dispatch('save', { name: trimmedName, categoryIds: selectedCategoryIds, includedSensitiveTopics })
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dispatch('close')
  }

  $: availableQuestionCount = questions.filter((question) => questionMatchesSession(question, {
    categoryIds: selectedCategoryIds, includedSensitiveTopics,
  })).length

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

    {#if session}
      <p class="session-history-note">Changing question banks keeps your answered-question history, even if you remove a bank and add it again later.</p>
    {/if}

    <div class="category-heading">
      <div>
        <span class="field-title">Categories</span>
        <small>Select question banks for this session. Sensitive questions are selected separately below.</small>
      </div>
      <div class="text-actions">
        <button type="button" on:click={selectAll}>Select all</button>
        <button type="button" on:click={() => (selectedCategoryIds = [])}>Clear</button>
      </div>
    </div>

    <div class="category-choice-grid">
      {#each categories as category (category.id)}
        {@const count = enabledCount(category.id)}
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

    <section class="sensitive-topic-section" aria-labelledby="sensitive-topic-heading">
      <div class="sensitive-topic-heading">
        <div>
          <span id="sensitive-topic-heading" class="field-title">Sensitive topics</span>
          <small>Choose these on their own or alongside categories. Questions with multiple sensitive topics require each topic to be selected.</small>
        </div>
        <span class="optional-label">Optional</span>
      </div>
      <div class="sensitive-topic-grid">
        {#each Object.entries(SENSITIVE_TOPIC_LABELS) as [topic, details]}
          {@const typedTopic = topic as SensitiveTopic}
          {@const count = sensitiveTopicCount(typedTopic)}
          {#if count > 0}
            <label class="sensitive-topic-choice" class:selected={includedSensitiveTopics.includes(typedTopic)}>
              <input
                type="checkbox"
                checked={includedSensitiveTopics.includes(typedTopic)}
                on:change={() => toggleSensitiveTopic(typedTopic)}
              />
              <span class="sensitive-topic-check" aria-hidden="true">✓</span>
              <span>
                <strong>{details.label}</strong>
                <small>{details.description} {count.toLocaleString()} questions.</small>
              </span>
            </label>
          {/if}
        {/each}
      </div>
    </section>

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
