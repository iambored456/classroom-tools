<script lang="ts">
  import settingsIconUrl from '../../city-navigator/public/assets/Settings_optimized.svg?url'

  import { onMount } from 'svelte'
  import QuestionLibrary from './QuestionLibrary.svelte'
  import SessionEditor from './SessionEditor.svelte'
  import {
    categoryColour,
    createStarterLibrary,
    formatQuestionForDisplay,
    makeId,
    questionSizeClass,
    splitFollowUpPrompts,
  } from './data'
  import {
    loadDarkMode,
    loadLibrary,
    loadSessions,
    saveDarkMode,
    saveLibrary,
    saveSessions,
  } from './storage'
  import { fitQuestionText } from './text-fit'
  import type { LibraryState, Question, QuestionSession } from './types'

  type Screen = 'home' | 'session'
  type PendingAction = { kind: 'delete' | 'restart'; sessionId: string }

  let screen: Screen = 'home'
  let darkMode = true
  let library: LibraryState = createStarterLibrary()
  let sessions: QuestionSession[] = []
  let activeSessionId: string | null = null
  let sessionEditorOpen = false
  let editingSessionId: string | null = null
  let libraryOpen = false
  let pendingAction: PendingAction | null = null
  let expandedSessionIds: string[] = []
  let questionCardElement: HTMLElement | null = null
  let questionFitFrame: number | null = null
  let questionFitVersion = 0
  let homeMessage = ''
  let activeSession: QuestionSession | null = null
  let currentQuestion: Question | null = null
  let followUpPrompts: string[] = []
  let revealedFollowUpCount = 0
  let revealedFollowUps: string[] = []
  let hasMoreFollowUps = false
  let canChooseAnotherCard = false
  let sortedSessions: QuestionSession[] = []
  let activeStats = { total: 0, answered: 0, inDeck: 0 }

  $: activeSession = sessions.find((session) => session.id === activeSessionId) ?? null
  $: currentQuestion = activeSession?.currentQuestionId
    ? library.questions.find((question) => question.id === activeSession?.currentQuestionId) ?? null
    : null
  $: followUpPrompts = splitFollowUpPrompts(currentQuestion?.followUp ?? '')
  $: revealedFollowUpCount = Math.min(
    activeSession?.revealedFollowUpCount ?? 0,
    followUpPrompts.length,
  )
  $: revealedFollowUps = followUpPrompts.slice(0, revealedFollowUpCount)
  $: hasMoreFollowUps = revealedFollowUpCount < followUpPrompts.length
  $: canChooseAnotherCard = Boolean(
    activeSession &&
      currentQuestion &&
      sessionQuestions(activeSession).some(
        (question) =>
          question.id !== currentQuestion?.id &&
          !activeSession?.askedQuestionIds.includes(question.id),
      ),
  )
  $: sortedSessions = [...sessions].sort((first, second) => second.updatedAt - first.updatedAt)
  $: editingSession = editingSessionId
    ? sessions.find((session) => session.id === editingSessionId) ?? null
    : null
  $: enabledQuestionCount = library.questions.filter((question) => question.enabled).length

  const sessionQuestions = (session: QuestionSession) =>
    library.questions.filter(
      (question) =>
        question.enabled &&
        session.categoryIds.includes(question.categoryId) &&
        (session.includeExplicit || !question.explicit),
    )

  const sessionStats = (session: QuestionSession) => {
    const questions = sessionQuestions(session)
    const questionIds = new Set(questions.map((question) => question.id))
    const answeredIds = new Set(session.askedQuestionIds.filter((id) => questionIds.has(id)))
    const currentCardIsHeld = Boolean(
      session.currentQuestionId &&
        questionIds.has(session.currentQuestionId) &&
        !answeredIds.has(session.currentQuestionId),
    )
    return {
      total: questions.length,
      answered: answeredIds.size,
      inDeck: Math.max(0, questions.length - answeredIds.size - (currentCardIsHeld ? 1 : 0)),
    }
  }

  $: activeStats = activeSession
    ? sessionStats(activeSession)
    : { total: 0, answered: 0, inDeck: 0 }

  const formatUpdatedAt = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(timestamp))

  const sessionCategorySummaries = (session: QuestionSession) =>
    session.categoryIds.flatMap((categoryId) => {
      const category = library.categories.find((item) => item.id === categoryId)
      if (!category) return []
      const enabledCount = library.questions.filter(
        (question) =>
          question.categoryId === categoryId &&
          question.enabled &&
          (session.includeExplicit || !question.explicit),
      ).length
      return [{ ...category, enabledCount }]
    })

  const toggleSessionDetails = (sessionId: string) => {
    expandedSessionIds = expandedSessionIds.includes(sessionId)
      ? expandedSessionIds.filter((id) => id !== sessionId)
      : [...expandedSessionIds, sessionId]
  }

  const sessionDetailsId = (sessionId: string) => `session-details-${sessionId}`

  const applyQuestionTextFit = async (questionId: string) => {
    const card = questionCardElement
    const question = currentQuestion
    if (!card || !question || question.id !== questionId) return

    const version = ++questionFitVersion
    await document.fonts.load('400 100px "Atkinson Hyperlegible Next"')
    if (version !== questionFitVersion || card !== questionCardElement || currentQuestion?.id !== questionId) return

    const style = getComputedStyle(card)
    const contentWidth = card.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
    const contentHeight = card.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom)
    if (contentWidth <= 0 || contentHeight <= 0) return

    const fit = fitQuestionText({
      prompt: formatQuestionForDisplay(question.prompt),
      followUps: splitFollowUpPrompts(question.followUp).map(formatQuestionForDisplay),
      contentWidth,
      contentHeight,
      rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      compact: window.matchMedia('(max-width: 620px)').matches,
    })

    card.style.setProperty('--question-fitted-font-size', `${fit.questionFontSize}px`)
    card.style.setProperty('--follow-up-fitted-font-size', `${fit.followUpFontSize}px`)
    card.classList.add('text-fitted')
    card.classList.toggle('text-fit-overflow', !fit.fits)
    card.dataset.textFitEngine = 'pretext'
    card.dataset.textFitStatus = fit.fits ? 'fit' : 'minimum-size-overflow'
    card.dataset.textFitRequiredHeight = fit.requiredHeight.toFixed(1)
    card.dataset.textFitAvailableHeight = fit.availableHeight.toFixed(1)
  }

  const scheduleQuestionTextFit = () => {
    if (!questionCardElement || !currentQuestion || typeof requestAnimationFrame === 'undefined') return
    if (questionFitFrame !== null) cancelAnimationFrame(questionFitFrame)
    const questionId = currentQuestion.id
    questionFitFrame = requestAnimationFrame(() => {
      questionFitFrame = null
      void applyQuestionTextFit(questionId)
    })
  }

  const observeQuestionCard = (card: HTMLElement) => {
    questionCardElement = card
    const observer = new ResizeObserver(scheduleQuestionTextFit)
    observer.observe(card)
    scheduleQuestionTextFit()

    return {
      destroy() {
        observer.disconnect()
        questionFitVersion += 1
        if (questionFitFrame !== null) cancelAnimationFrame(questionFitFrame)
        questionFitFrame = null
        if (questionCardElement === card) questionCardElement = null
      },
    }
  }

  $: {
    const fittingContent = currentQuestion
      ? `${currentQuestion.id}\u0000${currentQuestion.prompt}\u0000${followUpPrompts.join('\u0000')}`
      : ''
    if (fittingContent) scheduleQuestionTextFit()
  }

  const persistSessions = (nextSessions: QuestionSession[]) => {
    sessions = nextSessions
    saveSessions(sessions)
  }

  const replaceSession = (nextSession: QuestionSession) => {
    persistSessions(sessions.map((session) => (session.id === nextSession.id ? nextSession : session)))
  }

  const drawQuestion = (session: QuestionSession, excludedQuestionId: string | null = null) => {
    const answeredIds = new Set(session.askedQuestionIds)
    const available = sessionQuestions(session).filter(
      (question) => !answeredIds.has(question.id) && question.id !== excludedQuestionId,
    )
    const selected = available[Math.floor(Math.random() * available.length)] ?? null
    const nextSession: QuestionSession = {
      ...session,
      currentQuestionId: selected?.id ?? null,
      revealedFollowUpCount: 0,
      updatedAt: Date.now(),
    }
    replaceSession(nextSession)
    return nextSession
  }

  const openSession = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return
    if (session.categoryIds.length === 0) {
      editingSessionId = session.id
      sessionEditorOpen = true
      homeMessage = 'Choose at least one category before continuing.'
      return
    }
    if (sessionQuestions(session).length === 0) {
      editingSessionId = session.id
      sessionEditorOpen = true
      homeMessage = 'Those categories do not contain any enabled questions.'
      return
    }

    activeSessionId = session.id
    const currentIsAvailable = session.currentQuestionId
      ? sessionQuestions(session).some((question) => question.id === session.currentQuestionId)
      : false
    const stats = sessionStats(session)
    if (!currentIsAvailable && stats.answered < stats.total) {
      drawQuestion(session)
    } else if (currentIsAvailable) {
      replaceSession({
        ...session,
        askedQuestionIds: session.askedQuestionIds.filter((id) => id !== session.currentQuestionId),
        updatedAt: Date.now(),
      })
    }
    screen = 'session'
    homeMessage = ''
  }

  const openNewSessionEditor = () => {
    editingSessionId = null
    sessionEditorOpen = true
    homeMessage = ''
  }

  const resumeLatestSession = () => {
    const latestSession = sortedSessions[0]
    if (latestSession) openSession(latestSession.id)
  }

  const openExistingSessionEditor = (sessionId: string) => {
    editingSessionId = sessionId
    sessionEditorOpen = true
    homeMessage = ''
  }

  const saveSessionEditor = (detail: { name: string; categoryIds: string[]; includeExplicit: boolean }) => {
    const now = Date.now()
    if (editingSessionId) {
      const existing = sessions.find((session) => session.id === editingSessionId)
      if (!existing) return
      const currentStillIncluded = existing.currentQuestionId
        ? library.questions.some(
            (question) =>
              question.id === existing.currentQuestionId &&
              question.enabled &&
              detail.categoryIds.includes(question.categoryId) &&
              (detail.includeExplicit || !question.explicit),
          )
        : false
      const updatedSession: QuestionSession = {
        ...existing,
        name: detail.name,
        categoryIds: detail.categoryIds,
        includeExplicit: detail.includeExplicit,
        currentQuestionId: currentStillIncluded ? existing.currentQuestionId : null,
        askedQuestionIds: currentStillIncluded
          ? existing.askedQuestionIds.filter((id) => id !== existing.currentQuestionId)
          : existing.askedQuestionIds,
        revealedFollowUpCount: currentStillIncluded ? existing.revealedFollowUpCount : 0,
        updatedAt: now,
      }
      replaceSession(updatedSession)
      sessionEditorOpen = false
      editingSessionId = null
      if (activeSessionId === updatedSession.id && !currentStillIncluded && sessionQuestions(updatedSession).some((question) => !updatedSession.askedQuestionIds.includes(question.id))) {
        drawQuestion(updatedSession)
      }
      return
    }

    const session: QuestionSession = {
      id: makeId('session'),
      name: detail.name,
      categoryIds: detail.categoryIds,
      askedQuestionIds: [],
      currentQuestionId: null,
      revealedFollowUpCount: 0,
      includeExplicit: detail.includeExplicit,
      createdAt: now,
      updatedAt: now,
    }
    persistSessions([...sessions, session])
    sessionEditorOpen = false
    activeSessionId = session.id
    drawQuestion(session)
    screen = 'session'
  }

  const revealFollowUp = () => {
    if (!activeSession || !hasMoreFollowUps) return
    replaceSession({
      ...activeSession,
      revealedFollowUpCount: revealedFollowUpCount + 1,
      updatedAt: Date.now(),
    })
  }

  const chooseAnotherCard = () => {
    if (!activeSession || !currentQuestion || !canChooseAnotherCard) return
    drawQuestion(activeSession, currentQuestion.id)
  }

  const nextCard = () => {
    if (!activeSession || !currentQuestion || hasMoreFollowUps) return
    const answeredQuestionIds = activeSession.askedQuestionIds.includes(currentQuestion.id)
      ? activeSession.askedQuestionIds
      : [...activeSession.askedQuestionIds, currentQuestion.id]
    drawQuestion({ ...activeSession, askedQuestionIds: answeredQuestionIds })
  }

  const returnHome = () => {
    screen = 'home'
    activeSessionId = null
  }

  const completePendingAction = () => {
    if (!pendingAction) return
    const session = sessions.find((item) => item.id === pendingAction?.sessionId)
    if (!session) {
      pendingAction = null
      return
    }

    if (pendingAction.kind === 'delete') {
      persistSessions(sessions.filter((item) => item.id !== session.id))
      if (activeSessionId === session.id) returnHome()
      pendingAction = null
      return
    }

    const restarted: QuestionSession = {
      ...session,
      askedQuestionIds: [],
      currentQuestionId: null,
      revealedFollowUpCount: 0,
      updatedAt: Date.now(),
    }
    replaceSession(restarted)
    pendingAction = null
    activeSessionId = restarted.id
    drawQuestion(restarted)
    screen = 'session'
  }

  const updateLibrary = (nextLibrary: LibraryState) => {
    library = nextLibrary
    saveLibrary(library)
    const categoryIds = new Set(library.categories.map((category) => category.id))
    persistSessions(
      sessions.map((session) => {
        const activeQuestionIds = new Set(sessionQuestions(session).map((question) => question.id))
        return {
          ...session,
          categoryIds: session.categoryIds.filter((id) => categoryIds.has(id)),
          askedQuestionIds:
            session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
              ? session.askedQuestionIds.filter((id) => id !== session.currentQuestionId)
              : session.askedQuestionIds,
          currentQuestionId:
            session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
              ? session.currentQuestionId
              : null,
          revealedFollowUpCount:
            session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
              ? Math.min(
                  session.revealedFollowUpCount,
                  splitFollowUpPrompts(
                    library.questions.find((question) => question.id === session.currentQuestionId)
                      ?.followUp ?? '',
                  ).length,
                )
              : 0,
        }
      }),
    )
  }

  const toggleDarkMode = () => {
    darkMode = !darkMode
    saveDarkMode(darkMode)
  }

  const sessionMenuId = (sessionId: string) => `session-menu-${sessionId}`

  const closeSessionMenu = (sessionId: string) => {
    const menu = document.getElementById(sessionMenuId(sessionId))
    if (menu?.matches(':popover-open')) menu.hidePopover()
  }

  const positionSessionMenu = (trigger: HTMLButtonElement, sessionId: string) => {
    requestAnimationFrame(() => {
      const menu = document.getElementById(sessionMenuId(sessionId))
      if (!menu?.matches(':popover-open')) return

      const triggerBounds = trigger.getBoundingClientRect()
      const menuBounds = menu.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 4
      const left = Math.max(
        viewportPadding,
        Math.min(triggerBounds.right - menuBounds.width, window.innerWidth - menuBounds.width - viewportPadding),
      )
      const below = triggerBounds.bottom + gap
      const top = below + menuBounds.height <= window.innerHeight - viewportPadding
        ? below
        : Math.max(viewportPadding, triggerBounds.top - menuBounds.height - gap)

      menu.style.left = `${left}px`
      menu.style.top = `${top}px`
    })
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (pendingAction && event.key === 'Escape') {
      pendingAction = null
      return
    }
    if (screen !== 'session' || sessionEditorOpen || libraryOpen || pendingAction) return
    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement
    ) return
    if (event.key === ' ' && hasMoreFollowUps) {
      event.preventDefault()
      revealFollowUp()
    } else if (event.key === 'ArrowRight' && !hasMoreFollowUps) {
      event.preventDefault()
      nextCard()
    } else if (event.key.toLocaleLowerCase() === 'c' && canChooseAnotherCard) {
      event.preventDefault()
      chooseAnotherCard()
    }
  }

  onMount(() => {
    library = loadLibrary()
    darkMode = loadDarkMode()
    const validCategoryIds = new Set(library.categories.map((category) => category.id))
    sessions = loadSessions().map((session) => {
      const activeQuestionIds = new Set(sessionQuestions(session).map((question) => question.id))
      return {
        ...session,
        categoryIds: session.categoryIds.filter((id) => validCategoryIds.has(id)),
        askedQuestionIds:
          session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
            ? session.askedQuestionIds.filter((id) => id !== session.currentQuestionId)
            : session.askedQuestionIds,
        currentQuestionId:
          session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
            ? session.currentQuestionId
            : null,
        revealedFollowUpCount:
          session.currentQuestionId && activeQuestionIds.has(session.currentQuestionId)
            ? Math.min(
                session.revealedFollowUpCount,
                splitFollowUpPrompts(
                  library.questions.find((question) => question.id === session.currentQuestionId)
                    ?.followUp ?? '',
                ).length,
              )
            : 0,
      }
    })
    saveSessions(sessions)
  })
</script>

<svelte:window on:keydown={handleKeydown} />
<svelte:body class:app-dark={darkMode} />

{#if screen === 'home'}
  <main class="landing-screen" class:dark-mode={darkMode}>
    <a class="hub-link" href="../" aria-label="Classroom Tools home">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7"></path><path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path></svg>
    </a>

    <section class="landing-card" aria-labelledby="landing-title">
      <div class="landing-copy">
        <h1 id="landing-title">Book of<br />Questions</h1>
      </div>

      <div class="landing-actions" aria-label="Session actions">
        <button
          class="primary-button resume-button"
          type="button"
          disabled={sortedSessions.length === 0}
          title={sortedSessions.length > 0 ? `Resume ${sortedSessions[0].name}` : 'Create a session to begin.'}
          on:click={resumeLatestSession}
        >Resume</button>
        <button class="secondary-button new-session-button" type="button" on:click={openNewSessionEditor}>New Session</button>
      </div>

      <div class="session-panel">
        <div class="session-panel-heading">
          <h2>Sessions</h2>
        </div>

        {#if sessions.length > 0}
          <div class="session-list">
            {#each sortedSessions as session (session.id)}
              {@const stats = sessionStats(session)}
              {@const categorySummaries = sessionCategorySummaries(session)}
              {@const detailsExpanded = expandedSessionIds.includes(session.id)}
              <article class="session-card">
                <button class="session-open" type="button" on:click={() => openSession(session.id)}>
                  <span class="session-card-copy">
                    <strong>{session.name}</strong>
                  </span>
                  <span
                    class="session-progress"
                    aria-label={`${stats.answered.toLocaleString()} of ${stats.total.toLocaleString()} questions completed`}
                  >
                    <strong>{stats.answered.toLocaleString()}/{stats.total.toLocaleString()}</strong>
                    <small>questions completed</small>
                  </span>
                </button>
                <div class="session-card-footer">
                  <button
                    class="session-footer-toggle"
                    type="button"
                    aria-expanded={detailsExpanded}
                    aria-controls={sessionDetailsId(session.id)}
                    aria-label={`${detailsExpanded ? 'Hide' : 'Show'} question sets for ${session.name}`}
                    on:click={() => toggleSessionDetails(session.id)}
                  >
                    <span>Last played {formatUpdatedAt(session.updatedAt)}</span>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"></path></svg>
                  </button>
                  <div class="session-menu">
                    <button
                      class="session-menu-trigger"
                      type="button"
                      aria-label={`More actions for ${session.name}`}
                      popovertarget={sessionMenuId(session.id)}
                      on:click={(event) => positionSessionMenu(event.currentTarget, session.id)}
                    >•••</button>
                    <div class="session-menu-popover" id={sessionMenuId(session.id)} popover="auto">
                      <button type="button" on:click={() => { closeSessionMenu(session.id); openExistingSessionEditor(session.id) }}>Edit name & categories</button>
                      <button type="button" on:click={() => { closeSessionMenu(session.id); pendingAction = { kind: 'restart', sessionId: session.id } }}>Restart session</button>
                      <button class="danger" type="button" on:click={() => { closeSessionMenu(session.id); pendingAction = { kind: 'delete', sessionId: session.id } }}>Delete session</button>
                    </div>
                  </div>
                </div>
                {#if detailsExpanded}
                  <section
                    class="session-enabled-sets"
                    id={sessionDetailsId(session.id)}
                    aria-label={`Question sets enabled for ${session.name}`}
                  >
                    <p>Question sets enabled</p>
                    <ul>
                      {#each categorySummaries as category (category.id)}
                        <li>
                          <span class="session-set-marker" style={`--set-colour: ${categoryColour(category.id, library.categories)}`}></span>
                          <strong>{category.name}</strong>
                          <small>{category.enabledCount.toLocaleString()} enabled</small>
                        </li>
                      {/each}
                    </ul>
                    <small>{session.includeExplicit ? 'Explicit questions included' : 'Explicit questions excluded'}</small>
                  </section>
                {/if}
              </article>
            {/each}
          </div>
        {:else}
          <div class="empty-session-state">
            <strong>No saved sessions yet</strong>
            <p>Create one, choose its categories, and every answered question will be remembered.</p>
          </div>
        {/if}

        {#if homeMessage}<p class="home-message" role="alert">{homeMessage}</p>{/if}
      </div>

      <button class="secondary-button library-button landing-library-button" type="button" on:click={() => (libraryOpen = true)}>
        <span><strong>Question Library</strong><small>{enabledQuestionCount.toLocaleString()} questions enabled · {library.categories.length} categories</small></span>
        <span aria-hidden="true">→</span>
      </button>
    </section>

    <label class="theme-toggle">
      <span>Dark mode</span>
      <input type="checkbox" checked={darkMode} on:change={toggleDarkMode} />
      <span class="toggle-track" aria-hidden="true"><span></span></span>
    </label>
  </main>
{:else if activeSession}
  <div class="question-screen" class:dark-mode={darkMode}>
    <header class="question-header">
      <button class="header-icon-button" type="button" aria-label="Return to sessions" on:click={returnHome}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7"></path><path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path></svg>
      </button>
      <div class="active-session-heading">
        <p>{activeSession.name}</p>
        <span aria-label={`${activeStats.answered.toLocaleString()} of ${activeStats.total.toLocaleString()} questions completed`}>
          {activeStats.answered.toLocaleString()}/{activeStats.total.toLocaleString()}
        </span>
      </div>
      <button
        class="header-icon-button"
        type="button"
        aria-label="Session Settings"
        title="Session Settings"
        on:click={() => openExistingSessionEditor(activeSession.id)}
      >
        <img
          class="settings-tool-icon"
          src={settingsIconUrl}
          alt=""
          width="48"
          height="48"
          data-icon-source="music-learning-tools/packages/diatonic-compass-ui/public/assets/Settings_optimized.svg"
        />
      </button>
    </header>

    <main class="question-stage">
      {#if currentQuestion}
        {@const category = library.categories.find((item) => item.id === currentQuestion.categoryId)}
        <article class={`question-card ${questionSizeClass(currentQuestion)}`} use:observeQuestionCard>
          {#if category}
            <p class="question-category" style={`--category-colour: ${categoryColour(category.id, library.categories)}`}>
              <span></span>{category.name}
            </p>
          {/if}
          <h1>{formatQuestionForDisplay(currentQuestion.prompt)}</h1>
          {#if followUpPrompts.length > 0}
            <div class="follow-up-interaction">
              {#if revealedFollowUps.length === 0}
                <button
                  class="follow-up-reveal-card"
                  type="button"
                  aria-expanded="false"
                  aria-controls="follow-up-panel"
                  on:click={revealFollowUp}
                >
                  <span>Follow-Up Question</span>
                </button>
              {:else}
                <section
                  id="follow-up-panel"
                  class="revealed-follow-up"
                  aria-label={`${revealedFollowUpCount} of ${followUpPrompts.length} follow-ups revealed`}
                >
                  <ul class="follow-up-sequence" aria-live="polite">
                    {#each revealedFollowUps as followUp, index}
                      <li class:latest={index === revealedFollowUps.length - 1}>{formatQuestionForDisplay(followUp)}</li>
                    {/each}
                  </ul>
                  {#if hasMoreFollowUps}
                    <button class="follow-up-next-button" type="button" on:click={revealFollowUp}>
                      Next Follow-up
                    </button>
                  {/if}
                </section>
              {/if}
            </div>
          {/if}
        </article>

        <div class="question-controls">
          <button
            class="another-card-button"
            type="button"
            disabled={!canChooseAnotherCard}
            title={canChooseAnotherCard ? 'Return this card to the deck and draw a different one.' : 'No other cards are available in this deck.'}
            on:click={chooseAnotherCard}
          >
            Choose another card
          </button>
          <button
            class="next-button"
            type="button"
            disabled={hasMoreFollowUps}
            title={hasMoreFollowUps ? 'Reveal every follow-up question before continuing.' : 'Move this card to Answered and continue.'}
            on:click={nextCard}
          >
            Next Card <span>→</span>
          </button>
        </div>
      {:else}
        <section class="session-complete-card">
          <p class="eyebrow">Session complete</p>
          <h1>Every card is in the Answered deck.</h1>
          <p>Choose more categories or restart this session to begin the rotation again.</p>
          <div>
            <button class="dialog-button secondary" type="button" on:click={returnHome}>Return Home</button>
            <button class="dialog-button secondary" type="button" on:click={() => openExistingSessionEditor(activeSession.id)}>Change Categories</button>
            <button class="dialog-button primary" type="button" on:click={() => (pendingAction = { kind: 'restart', sessionId: activeSession.id })}>Restart Session</button>
          </div>
        </section>
      {/if}
    </main>

  </div>
{/if}

{#if sessionEditorOpen}
  <SessionEditor
    categories={library.categories}
    questions={library.questions}
    session={editingSession}
    suggestedName={`Session ${sessions.length + 1}`}
    on:close={() => { sessionEditorOpen = false; editingSessionId = null }}
    on:save={(event) => saveSessionEditor(event.detail)}
  />
{/if}

{#if libraryOpen}
  <QuestionLibrary
    {library}
    on:close={() => (libraryOpen = false)}
    on:update={(event) => updateLibrary(event.detail)}
  />
{/if}

{#if pendingAction}
  {@const pendingSession = sessions.find((session) => session.id === pendingAction?.sessionId)}
  <div class="modal-backdrop confirm-backdrop" aria-hidden="true"></div>
  <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <p class="eyebrow">Please confirm</p>
    <h2 id="confirm-title">{pendingAction.kind === 'delete' ? 'Delete this session?' : 'Restart this session?'}</h2>
    <p>
      {pendingAction.kind === 'delete'
        ? `“${pendingSession?.name ?? 'This session'}” and its question history will be removed.`
        : `“${pendingSession?.name ?? 'This session'}” will empty its Answered deck.`}
    </p>
    <div>
      <button class="dialog-button secondary" type="button" on:click={() => (pendingAction = null)}>Cancel</button>
      <button class="dialog-button primary" class:danger={pendingAction.kind === 'delete'} type="button" on:click={completePendingAction}>
        {pendingAction.kind === 'delete' ? 'Delete Session' : 'Restart Session'}
      </button>
    </div>
  </div>
{/if}
