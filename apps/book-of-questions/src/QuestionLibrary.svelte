<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { categoryColour, formatQuestionForDisplay, makeId, splitFollowUpPrompts } from './data'
  import { resetLibrary } from './storage'
  import type { Category, LibraryState, Question } from './types'

  export let library: LibraryState

  const dispatch = createEventDispatcher<{ close: void; update: LibraryState }>()

  let selectedCategoryId = library.categories[0]?.id ?? ''
  let editingCategoryId: string | 'new' | null = null
  let categoryName = ''
  let categoryError = ''
  let confirmCategoryId: string | null = null
  let editingQuestionId: string | 'new' | null = null
  let questionPrompt = ''
  let questionFollowUp = ''
  let questionFollowUpPrompts: string[] = []
  let questionCategoryId = selectedCategoryId
  let questionError = ''
  let confirmQuestionId: string | null = null
  let confirmReset = false
  let promptInput: HTMLTextAreaElement | null = null

  $: selectedCategory = library.categories.find((category) => category.id === selectedCategoryId) ?? null
  $: selectedQuestions = library.questions.filter((question) => question.categoryId === selectedCategoryId)
  $: enabledTotal = library.questions.filter((question) => question.enabled).length
  $: explicitQuestions = library.questions.filter((question) => question.explicit)
  $: enabledExplicitTotal = explicitQuestions.filter((question) => question.enabled).length
  $: questionFollowUpPrompts = splitFollowUpPrompts(questionFollowUp)

  const updateLibrary = (next: LibraryState) => {
    library = next
    dispatch('update', next)
  }

  const categoryCounts = (categoryId: string) => {
    const questions = library.questions.filter((question) => question.categoryId === categoryId)
    return { total: questions.length, enabled: questions.filter((question) => question.enabled).length }
  }

  const beginCategory = (category: Category | null) => {
    editingCategoryId = category?.id ?? 'new'
    categoryName = category?.name ?? ''
    categoryError = ''
    confirmCategoryId = null
  }

  const saveCategory = () => {
    const name = categoryName.trim()
    if (!name) {
      categoryError = 'Enter a category name.'
      return
    }
    if (
      library.categories.some(
        (category) =>
          category.id !== editingCategoryId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      categoryError = 'That category name is already in use.'
      return
    }

    if (editingCategoryId === 'new') {
      const category: Category = { id: makeId('category'), name, builtIn: false }
      updateLibrary({ ...library, categories: [...library.categories, category] })
      selectedCategoryId = category.id
    } else if (editingCategoryId) {
      updateLibrary({
        ...library,
        categories: library.categories.map((category) =>
          category.id === editingCategoryId ? { ...category, name } : category,
        ),
      })
    }
    editingCategoryId = null
  }

  const requestDeleteCategory = (category: Category) => {
    const count = categoryCounts(category.id).total
    if (count > 0) {
      categoryError = `Move or delete the ${count.toLocaleString()} questions in this category first.`
      editingCategoryId = category.id
      categoryName = category.name
      return
    }
    confirmCategoryId = category.id
  }

  const deleteCategory = (category: Category) => {
    const categories = library.categories.filter((item) => item.id !== category.id)
    updateLibrary({
      ...library,
      categories,
      deletedBuiltInCategoryIds: category.builtIn
        ? [...new Set([...library.deletedBuiltInCategoryIds, category.id])]
        : library.deletedBuiltInCategoryIds,
    })
    selectedCategoryId = categories[0]?.id ?? ''
    confirmCategoryId = null
    editingCategoryId = null
  }

  const beginQuestion = async (question: Question | null) => {
    editingQuestionId = question?.id ?? 'new'
    questionPrompt = question?.prompt ?? ''
    questionFollowUp = question?.followUp ?? ''
    questionCategoryId = question?.categoryId ?? selectedCategoryId
    questionError = ''
    confirmQuestionId = null
    await tick()
    promptInput?.focus()
  }

  const saveQuestion = () => {
    const prompt = questionPrompt.trim()
    if (!prompt) {
      questionError = 'Enter the main question.'
      promptInput?.focus()
      return
    }
    if (!library.categories.some((category) => category.id === questionCategoryId)) {
      questionError = 'Choose a category.'
      return
    }

    if (editingQuestionId === 'new') {
      const question: Question = {
        id: makeId('question'),
        categoryId: questionCategoryId,
        prompt,
        followUp: questionFollowUp.trim(),
        source: 'custom',
        sourceNumber: null,
        sourcePage: null,
        explicit: false,
        enabled: true,
        builtIn: false,
      }
      updateLibrary({ ...library, questions: [...library.questions, question] })
    } else if (editingQuestionId) {
      updateLibrary({
        ...library,
        questions: library.questions.map((question) =>
          question.id === editingQuestionId
            ? {
                ...question,
                categoryId: questionCategoryId,
                prompt,
                followUp: questionFollowUp.trim(),
              }
            : question,
        ),
      })
    }
    selectedCategoryId = questionCategoryId
    editingQuestionId = null
  }

  const toggleQuestion = (questionId: string) => {
    updateLibrary({
      ...library,
      questions: library.questions.map((question) =>
        question.id === questionId ? { ...question, enabled: !question.enabled } : question,
      ),
    })
  }

  const toggleExplicit = (questionId: string) => {
    updateLibrary({
      ...library,
      questions: library.questions.map((question) =>
        question.id === questionId ? { ...question, explicit: !question.explicit } : question,
      ),
    })
  }

  const toggleExplicitQuestions = () => {
    if (explicitQuestions.length === 0) return
    const enabled = enabledExplicitTotal === 0
    updateLibrary({
      ...library,
      questions: library.questions.map((question) =>
        question.explicit ? { ...question, enabled } : question,
      ),
    })
  }

  const setCategoryEnabled = (enabled: boolean) => {
    updateLibrary({
      ...library,
      questions: library.questions.map((question) =>
        question.categoryId === selectedCategoryId ? { ...question, enabled } : question,
      ),
    })
  }

  const deleteQuestion = (question: Question) => {
    updateLibrary({
      ...library,
      questions: library.questions.filter((item) => item.id !== question.id),
      deletedBuiltInQuestionIds: question.builtIn
        ? [...new Set([...library.deletedBuiltInQuestionIds, question.id])]
        : library.deletedBuiltInQuestionIds,
    })
    confirmQuestionId = null
    if (editingQuestionId === question.id) editingQuestionId = null
  }

  const restoreLibrary = () => {
    const restored = resetLibrary()
    updateLibrary(restored)
    selectedCategoryId = restored.categories[0]?.id ?? ''
    editingQuestionId = null
    editingCategoryId = null
    confirmReset = false
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (editingQuestionId) editingQuestionId = null
    else if (editingCategoryId) editingCategoryId = null
    else dispatch('close')
  }

  onMount(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  })
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop" aria-hidden="true"></div>
<div class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">
  <header class="library-header">
    <div>
      <h2 id="library-title">Question Library</h2>
      <p>{enabledTotal.toLocaleString()} of {library.questions.length.toLocaleString()} questions enabled</p>
    </div>
    <div class="library-header-actions">
      {#if confirmReset}
        <button class="small-button danger" type="button" on:click={restoreLibrary}>Confirm reset</button>
        <button class="small-button" type="button" on:click={() => (confirmReset = false)}>Cancel</button>
      {:else}
        <button class="text-button" type="button" on:click={() => (confirmReset = true)}>Reset library</button>
      {/if}
      <button class="icon-button" type="button" aria-label="Close question library" on:click={() => dispatch('close')}>×</button>
    </div>
  </header>

  <div class="library-workspace">
    <aside class="category-sidebar" aria-label="Question categories">
      <div class="sidebar-heading">
        <strong>Categories</strong>
        <button class="round-add" type="button" aria-label="Add category" on:click={() => beginCategory(null)}>+</button>
      </div>

      {#if editingCategoryId}
        <form class="category-form" on:submit|preventDefault={saveCategory}>
          <label>
            <span>{editingCategoryId === 'new' ? 'New category' : 'Category name'}</span>
            <input bind:value={categoryName} maxlength="60" />
          </label>
          {#if categoryError}<p class="form-error" role="alert">{categoryError}</p>{/if}
          <div>
            <button class="small-button primary" type="submit">Save</button>
            <button class="small-button" type="button" on:click={() => (editingCategoryId = null)}>Cancel</button>
          </div>
        </form>
      {/if}

      <div class="category-list">
        {#each library.categories as category (category.id)}
          {@const counts = categoryCounts(category.id)}
          <div class="category-row" class:active={category.id === selectedCategoryId}>
            <button class="category-select" type="button" on:click={() => { selectedCategoryId = category.id; editingQuestionId = null }}>
              <span class="category-dot" style={`--category-colour: ${categoryColour(category.id, library.categories)}`}></span>
              <span><strong>{category.name}</strong><small>{counts.enabled.toLocaleString()} of {counts.total.toLocaleString()} enabled</small></span>
            </button>
            <button class="category-edit" type="button" aria-label={`Edit ${category.name}`} on:click={() => beginCategory(category)}>•••</button>
          </div>
          {#if editingCategoryId === category.id}
            <div class="category-delete-row">
              {#if confirmCategoryId === category.id}
                <button class="text-button danger" type="button" on:click={() => deleteCategory(category)}>Confirm delete</button>
                <button class="text-button" type="button" on:click={() => (confirmCategoryId = null)}>Keep</button>
              {:else}
                <button class="text-button danger" type="button" on:click={() => requestDeleteCategory(category)}>Delete category</button>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </aside>

    <main class="question-library-main">
      {#if selectedCategory}
        <div class="question-list-heading">
          <div>
            <p class="eyebrow">Current category</p>
            <h3>{selectedCategory.name}</h3>
          </div>
          <button class="add-question-button" type="button" on:click={() => beginQuestion(null)}>+ Add Question</button>
        </div>

        <div class="question-toolbar">
          <div class="bulk-actions">
            <button type="button" on:click={() => setCategoryEnabled(true)}>Enable all</button>
            <button type="button" on:click={() => setCategoryEnabled(false)}>Disable all</button>
            <button
              class="explicit-bulk-button"
              type="button"
              disabled={explicitQuestions.length === 0}
              on:click={toggleExplicitQuestions}
            >
              {explicitQuestions.length === 0
                ? 'No Explicit Questions'
                : enabledExplicitTotal > 0
                  ? 'Disable Explicit Questions'
                  : 'Enable Explicit Questions'}
            </button>
          </div>
        </div>

        {#if editingQuestionId}
          <form class="question-form" on:submit|preventDefault={saveQuestion}>
            <div class="form-heading">
              <div>
                <p class="eyebrow">{editingQuestionId === 'new' ? 'New question' : 'Edit question'}</p>
                <h4>{editingQuestionId === 'new' ? 'Add to the library' : 'Update this prompt'}</h4>
              </div>
              <button class="icon-button" type="button" aria-label="Close question editor" on:click={() => (editingQuestionId = null)}>×</button>
            </div>
            <label class="field-label">
              <span>Main question</span>
              <textarea bind:this={promptInput} bind:value={questionPrompt} rows="4" placeholder="Enter the question shown first"></textarea>
            </label>
            <label class="field-label">
              <span>Follow-up questions <small>(optional)</small></span>
              <textarea bind:value={questionFollowUp} rows="4" placeholder="What happened next? How did that feel? What did you learn?"></textarea>
              <small class="field-help">Finish each follow-up with a period, question mark, or exclamation point. Each one will be revealed separately.</small>
            </label>
            {#if questionFollowUpPrompts.length > 0}
              <div class="follow-up-registration" aria-live="polite">
                <ul aria-label={`${questionFollowUpPrompts.length} follow-up questions registered`}>
                  {#each questionFollowUpPrompts as followUp}<li>{formatQuestionForDisplay(followUp)}</li>{/each}
                </ul>
              </div>
            {/if}
            <label class="field-label compact-field">
              <span>Category</span>
              <select bind:value={questionCategoryId}>
                {#each library.categories as category}<option value={category.id}>{category.name}</option>{/each}
              </select>
            </label>
            {#if questionError}<p class="form-error" role="alert">{questionError}</p>{/if}
            <div class="form-actions">
              <button class="dialog-button secondary" type="button" on:click={() => (editingQuestionId = null)}>Cancel</button>
              <button class="dialog-button primary" type="submit">{editingQuestionId === 'new' ? 'Add Question' : 'Save Question'}</button>
            </div>
          </form>
        {/if}

        <div class="question-results-summary">
          <span>{selectedQuestions.length.toLocaleString()} {selectedQuestions.length === 1 ? 'question' : 'questions'}</span>
        </div>

        <div class="question-list">
          {#each selectedQuestions as question (question.id)}
            {@const followUps = splitFollowUpPrompts(question.followUp)}
            <article class="question-library-card" class:disabled={!question.enabled}>
              <label class="library-switch" aria-label={`${question.enabled ? 'Disable' : 'Enable'} question`}>
                <input type="checkbox" checked={question.enabled} on:change={() => toggleQuestion(question.id)} />
                <span aria-hidden="true"><span></span></span>
              </label>
              <div class="question-card-copy">
                <p>{formatQuestionForDisplay(question.prompt)}</p>
                {#if followUps.length > 0}
                  <div class="follow-up-preview" aria-label={`${followUps.length} follow-up questions`}>
                    <ul>{#each followUps as followUp}<li>{formatQuestionForDisplay(followUp)}</li>{/each}</ul>
                  </div>
                {/if}
              </div>
              <div class="question-card-actions">
                <button
                  class="explicit-toggle"
                  class:active={question.explicit}
                  type="button"
                  aria-pressed={question.explicit}
                  on:click={() => toggleExplicit(question.id)}
                >{question.explicit ? 'Explicit' : 'Not Explicit'}</button>
                <button type="button" on:click={() => beginQuestion(question)}>Edit</button>
                {#if confirmQuestionId === question.id}
                  <button class="danger" type="button" on:click={() => deleteQuestion(question)}>Confirm</button>
                  <button type="button" on:click={() => (confirmQuestionId = null)}>Keep</button>
                {:else}
                  <button class="danger" type="button" on:click={() => (confirmQuestionId = question.id)}>Delete</button>
                {/if}
              </div>
            </article>
          {:else}
            <div class="empty-library-state">
              <strong>No questions found</strong>
              <p>Add the first question to this category.</p>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-library-state large">
          <strong>Create a category to get started</strong>
          <button class="add-question-button" type="button" on:click={() => beginCategory(null)}>+ Add Category</button>
        </div>
      {/if}
    </main>
  </div>
</div>
