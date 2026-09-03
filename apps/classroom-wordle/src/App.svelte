<script lang="ts">
  import { onMount, tick } from 'svelte'
  import WordLibrary from './WordLibrary.svelte'
  import { loadLibrary, loadSettings, saveLibrary, saveSettings } from './storage'
  import {
    WORD_LENGTHS,
    type LetterState,
    type ScoredGuess,
    type WordLength,
    type WordLibrary as WordLibraryData,
    type WordSet,
  } from './types'
  import { createStarterLibrary, parseWordText } from './words'

  type Screen = 'home' | 'game'
  type ScoreEntry = {
    id: string
    completedAt: number
    durationMs: number
    wordLength: number
    guessesUsed: number
    guessLimit: number
    won: boolean
  }

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ]
  const stateRank: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 }
  const SCORE_HISTORY_KEY = 'classroom-wordle:score-history:v1'
  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`

  let screen: Screen = 'home'
  let libraryOpen = false
  let roundSetupOpen = false
  let exitConfirmOpen = false
  let returningHomeWithinApp = false
  let library: WordLibraryData = createStarterLibrary()
  let selectedLength: WordLength = 5
  let guessLimit = 6
  let colorblindMode = true
  let answer = ''
  let currentGuess = ''
  let submittedGuesses: ScoredGuess[] = []
  let keyStates: Record<string, LetterState> = {}
  let gameEnded = false
  let gameWon = false
  let homeMessage = ''
  let gameMessage = ''
  let enabledWords: string[] = []
  let activeSet: WordSet | null = null
  let teacherWord = ''
  let roundSetupError = ''
  let roundSetupDialog: HTMLDivElement | null = null
  let exitStayButton: HTMLButtonElement | null = null
  let messageTimer: ReturnType<typeof setTimeout> | null = null
  let gameStartedAt: number | null = null
  let scoreHistory: ScoreEntry[] = []
  let scoreboardOpen = false

  const usedAnswerIds: Record<WordLength, Set<string>> = {
    3: new Set(),
    4: new Set(),
    5: new Set(),
    6: new Set(),
  }

  $: activeSet = library[selectedLength].find((set) => set.enabled) ?? null
  $: enabledWords = parseWordText(activeSet?.text ?? '', selectedLength)
  $: enabledWordCount = enabledWords.length

  const updateSettings = () => {
    homeMessage = ''
    saveSettings({ wordLength: selectedLength, guessLimit, colorblindMode })
  }

  const toggleColorblindMode = (event: Event) => {
    colorblindMode = (event.currentTarget as HTMLInputElement).checked
    updateSettings()
  }

  const changeWordLength = (change: number) => {
    const currentIndex = WORD_LENGTHS.indexOf(selectedLength)
    const nextIndex = Math.max(0, Math.min(WORD_LENGTHS.length - 1, currentIndex + change))
    selectedLength = WORD_LENGTHS[nextIndex]
    updateSettings()
  }

  const changeGuessLimit = (change: number) => {
    guessLimit = Math.max(3, Math.min(10, guessLimit + change))
    updateSettings()
  }

  const chooseAnswer = () => {
    let candidates = enabledWords.filter((word) => !usedAnswerIds[selectedLength].has(word))
    if (candidates.length === 0) {
      usedAnswerIds[selectedLength].clear()
      candidates = enabledWords
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    usedAnswerIds[selectedLength].add(chosen)
    return chosen
  }

  const openRoundSetup = async () => {
    if (enabledWordCount === 0) {
      homeMessage = `Add or enable at least one ${selectedLength}-letter word before playing.`
      libraryOpen = true
      return
    }

    teacherWord = ''
    roundSetupError = ''
    roundSetupOpen = true
    await tick()
    roundSetupDialog?.focus()
  }

  const beginRound = (chosenWord: string) => {
    const enteringGame = screen !== 'game'
    answer = chosenWord
    usedAnswerIds[selectedLength].add(chosenWord)
    currentGuess = ''
    submittedGuesses = []
    keyStates = {}
    gameEnded = false
    gameWon = false
    gameMessage = ''
    gameStartedAt = Date.now()
    scoreboardOpen = false
    homeMessage = ''
    roundSetupOpen = false
    screen = 'game'
    if (enteringGame) {
      const currentState =
        history.state && typeof history.state === 'object' ? history.state : {}
      history.pushState({ ...currentState, classroomWordleScreen: 'game' }, '')
    }
  }

  const useTeacherWord = () => {
    const word = teacherWord.trim().toLocaleLowerCase()
    if (!word) {
      roundSetupError = 'Type in a word before continuing.'
      return
    }
    if (!new RegExp(`^[a-z]{${selectedLength}}$`, 'i').test(word)) {
      roundSetupError = `Enter exactly ${selectedLength} letters.`
      return
    }
    if (!enabledWords.includes(word)) {
      roundSetupError = `${word.toLocaleUpperCase()} is not in ${activeSet?.label ?? 'the active set'}.`
      return
    }
    beginRound(word)
  }

  const useRandomWord = () => beginRound(chooseAnswer())

  const closeRoundSetup = () => {
    roundSetupOpen = false
    teacherWord = ''
    roundSetupError = ''
  }

  const scoreGuess = (guess: string): ScoredGuess => {
    const letters = [...guess].map((letter) => ({ letter, state: 'absent' as LetterState }))
    const remaining = new Map<string, number>()

    for (let index = 0; index < answer.length; index += 1) {
      if (guess[index] === answer[index]) {
        letters[index].state = 'correct'
      } else {
        remaining.set(answer[index], (remaining.get(answer[index]) ?? 0) + 1)
      }
    }

    for (let index = 0; index < guess.length; index += 1) {
      if (letters[index].state === 'correct') continue
      const available = remaining.get(guess[index]) ?? 0
      if (available > 0) {
        letters[index].state = 'present'
        remaining.set(guess[index], available - 1)
      }
    }

    return { word: guess, letters }
  }

  const updateKeyboard = (guess: ScoredGuess) => {
    const nextStates = { ...keyStates }
    guess.letters.forEach(({ letter, state }) => {
      const currentState = nextStates[letter]
      if (!currentState || stateRank[state] > stateRank[currentState]) nextStates[letter] = state
    })
    keyStates = nextStates
  }

  const showGameMessage = (message: string) => {
    if (messageTimer) clearTimeout(messageTimer)
    gameMessage = message
    messageTimer = setTimeout(() => {
      gameMessage = ''
    }, 1500)
  }

  const formatElapsedTime = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatCompletedAt = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp))

  const saveScoreHistory = (history: ScoreEntry[]) => {
    scoreHistory = history
    try {
      localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history))
    } catch {
      // Score history remains available for this visit when storage is unavailable.
    }
  }

  const recordScore = (guessesUsed: number, won: boolean) => {
    const completedAt = Date.now()
    const entry: ScoreEntry = {
      id: `${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt,
      durationMs: gameStartedAt === null ? 0 : Math.max(0, completedAt - gameStartedAt),
      wordLength: selectedLength,
      guessesUsed,
      guessLimit,
      won,
    }
    saveScoreHistory([entry, ...scoreHistory].slice(0, 50))
    scoreboardOpen = true
  }

  const clearScoreHistory = () => saveScoreHistory([])

  const submitGuess = () => {
    if (gameEnded) return
    if (currentGuess.length !== selectedLength) {
      showGameMessage(`${selectedLength} letters are needed.`)
      return
    }

    const scored = scoreGuess(currentGuess)
    const nextGuesses = [...submittedGuesses, scored]
    submittedGuesses = nextGuesses
    updateKeyboard(scored)
    gameWon = currentGuess === answer
    gameEnded = gameWon || submittedGuesses.length >= guessLimit
    currentGuess = ''
    if (gameEnded) recordScore(nextGuesses.length, gameWon)
  }

  const enterLetter = (letter: string) => {
    if (screen !== 'game' || gameEnded || currentGuess.length >= selectedLength) return
    currentGuess += letter.toLocaleLowerCase()
  }

  const eraseLetter = () => {
    if (screen !== 'game' || gameEnded) return
    if (currentGuess) currentGuess = currentGuess.slice(0, -1)
  }

  const useKey = (key: string) => {
    if (key === 'ENTER') submitGuess()
    else if (key === 'BACKSPACE') eraseLetter()
    else enterLetter(key)
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (scoreboardOpen) {
      if (event.key === 'Escape') scoreboardOpen = false
      return
    }
    if (exitConfirmOpen) {
      if (event.key === 'Escape') exitConfirmOpen = false
      return
    }
    if (roundSetupOpen) {
      if (event.key === 'Escape') closeRoundSetup()
      return
    }
    if (screen !== 'game' || libraryOpen || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Enter') {
      event.preventDefault()
      submitGuess()
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      eraseLetter()
    } else if (/^[a-z]$/i.test(event.key)) {
      enterLetter(event.key)
    }
  }

  const returnHome = () => {
    exitConfirmOpen = false
    scoreboardOpen = false
    closeRoundSetup()
    if (screen === 'game' && history.state?.classroomWordleScreen === 'game') {
      returningHomeWithinApp = true
      history.back()
      return
    }
    screen = 'home'
    gameMessage = ''
  }

  const requestExit = async () => {
    exitConfirmOpen = true
    await tick()
    exitStayButton?.focus()
  }

  const cancelExit = () => {
    exitConfirmOpen = false
  }

  const confirmExit = () => {
    exitConfirmOpen = false
    returnHome()
  }

  const handlePopState = (event: PopStateEvent) => {
    exitConfirmOpen = false
    closeRoundSetup()
    gameMessage = ''
    if (returningHomeWithinApp) {
      returningHomeWithinApp = false
      screen = 'home'
      return
    }
    if (screen === 'game' && event.state?.classroomWordleScreen !== 'game') {
      window.location.assign(new URL('../', window.location.href).href)
      return
    }
    screen = event.state?.classroomWordleScreen === 'game' && answer ? 'game' : 'home'
  }

  const updateLibrary = (nextLibrary: WordLibraryData) => {
    library = nextLibrary
    saveLibrary(library)
    homeMessage = ''
  }

  onMount(() => {
    library = loadLibrary()
    try {
      const savedScores = JSON.parse(localStorage.getItem(SCORE_HISTORY_KEY) ?? '[]') as unknown
      if (Array.isArray(savedScores)) {
        scoreHistory = savedScores.filter(
          (entry): entry is ScoreEntry =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as ScoreEntry).id === 'string' &&
            typeof (entry as ScoreEntry).completedAt === 'number' &&
            typeof (entry as ScoreEntry).durationMs === 'number' &&
            typeof (entry as ScoreEntry).wordLength === 'number' &&
            typeof (entry as ScoreEntry).guessesUsed === 'number' &&
            typeof (entry as ScoreEntry).guessLimit === 'number' &&
            typeof (entry as ScoreEntry).won === 'boolean',
        )
      }
    } catch {
      scoreHistory = []
    }
    const settings = loadSettings()
    selectedLength = settings.wordLength
    guessLimit = settings.guessLimit
    colorblindMode = settings.colorblindMode
    const currentState =
      history.state && typeof history.state === 'object' ? history.state : {}
    history.replaceState({ ...currentState, classroomWordleScreen: 'home' }, '')
  })
</script>

<svelte:window on:keydown={handleKeydown} on:popstate={handlePopState} />

{#if screen === 'home'}
  <main class="landing-screen" class:colorblind-mode={colorblindMode}>
    <a class="hub-link" href="../" aria-label="Classroom Tools home">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 11 8.5-7 8.5 7"></path>
        <path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path>
      </svg>
    </a>

    <section class="landing-card" aria-labelledby="landing-title">
      <img class="wordle-logo" src={logoUrl} alt="" aria-hidden="true" />
      <div class="landing-copy">
        <h1 id="landing-title">Classroom<br />Wordle</h1>
        <p>Guess the hidden word.</p>
      </div>

      <div class="game-settings" aria-label="Game setup">
        <fieldset>
          <legend>Number of Letters</legend>
          <div class="stepper letter-stepper">
            <button
              type="button"
              aria-label="Fewer letters"
              disabled={selectedLength <= 3}
              on:click={() => changeWordLength(-1)}
            >−</button>
            <output aria-live="polite">
              <strong>{selectedLength}</strong>
            </output>
            <button
              type="button"
              aria-label="More letters"
              disabled={selectedLength >= 6}
              on:click={() => changeWordLength(1)}
            >+</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Number of guesses</legend>
          <div class="stepper">
            <button
              type="button"
              aria-label="Fewer guesses"
              disabled={guessLimit <= 3}
              on:click={() => changeGuessLimit(-1)}
            >−</button>
            <output aria-live="polite"><strong>{guessLimit}</strong></output>
            <button
              type="button"
              aria-label="More guesses"
              disabled={guessLimit >= 10}
              on:click={() => changeGuessLimit(1)}
            >+</button>
          </div>
        </fieldset>
      </div>

      <div class="landing-actions">
        <button
          type="button"
          class="landing-button primary"
          data-action="play"
          aria-label={`Play ${selectedLength}-letter Wordle`}
          on:click={openRoundSetup}
        >
          Play
        </button>
        <button type="button" class="landing-button secondary" on:click={() => (libraryOpen = true)}>
          <span class="library-button-label">
            <strong>Word Library</strong>
            <small>{activeSet?.label ?? 'No set selected'}</small>
          </span>
        </button>
      </div>

      {#if homeMessage}<p class="home-message" role="alert">{homeMessage}</p>{/if}
    </section>

    <label class="preference-toggle">
      <span>Colorblind mode</span>
      <input type="checkbox" checked={colorblindMode} on:change={toggleColorblindMode} />
      <span class="toggle-track" aria-hidden="true"><span></span></span>
    </label>
  </main>
{:else}
  <div
    class="game-screen"
    class:colorblind-mode={colorblindMode}
    style={`--word-length: ${selectedLength}; --guess-rows: ${guessLimit};`}
  >
    <button type="button" class="game-home-action" aria-label="Return to home" on:click={requestExit}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 11 8.5-7 8.5 7"></path>
        <path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path>
      </svg>
    </button>
    <main class="game-main">
      <div class="game-board-area">
        <div class="game-board-row" class:round-complete={gameEnded}>
          <section class="word-grid" aria-label="Classroom Wordle game board">
        {#each Array(guessLimit) as _, rowIndex}
          {@const submitted = submittedGuesses[rowIndex]}
          {@const isActiveRow = !gameEnded && rowIndex === submittedGuesses.length}
          <div class="guess-row" aria-label={`Guess ${rowIndex + 1}`}>
            {#each Array(selectedLength) as _, columnIndex}
              {@const scoredLetter = submitted?.letters[columnIndex]}
              {@const liveLetter = isActiveRow ? currentGuess[columnIndex] ?? '' : ''}
              <div
                class="letter-tile"
                class:filled={Boolean(liveLetter)}
                class:evaluated={Boolean(scoredLetter)}
                class:absent={scoredLetter?.state === 'absent'}
                class:present={scoredLetter?.state === 'present'}
                class:correct={scoredLetter?.state === 'correct'}
                class:reveal={Boolean(submitted) && rowIndex === submittedGuesses.length - 1}
                style={`--reveal-index: ${columnIndex};`}
                aria-label={scoredLetter ? `${scoredLetter.letter}, ${scoredLetter.state}` : liveLetter || 'empty'}
              >
                {scoredLetter?.letter ?? liveLetter}
                {#if scoredLetter?.state === 'correct'}
                  <span class="tile-marker" aria-hidden="true">✓</span>
                {:else if scoredLetter?.state === 'present'}
                  <span class="tile-marker" aria-hidden="true">?</span>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
          </section>

          {#if gameEnded}
            <div class="completion-actions">
              <button type="button" class="new-word-button" on:click={openRoundSetup}>New word</button>
              <button type="button" on:click={requestExit}>Change setup</button>
            </div>
          {/if}
        </div>
      </div>

      <div class="sr-only" aria-live="polite">
        {#if gameMessage}
          {gameMessage}
        {:else if gameEnded}
          {gameWon ? 'Correct.' : 'Round complete.'}
        {/if}
      </div>

      <section class="keyboard" aria-label="On-screen keyboard">
        {#each KEYBOARD_ROWS as row}
          <div class="keyboard-row">
            {#each row as key}
              <button
                type="button"
                class="key"
                class:wide={key === 'ENTER' || key === 'BACKSPACE'}
                class:absent={keyStates[key.toLocaleLowerCase()] === 'absent'}
                class:present={keyStates[key.toLocaleLowerCase()] === 'present'}
                class:correct={keyStates[key.toLocaleLowerCase()] === 'correct'}
                disabled={gameEnded}
                aria-label={key === 'BACKSPACE' ? 'Backspace' : key}
                on:click={() => useKey(key)}
              >
                {#if key === 'BACKSPACE'}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10 6h10v12H10l-6-6 6-6Z"></path><path d="m13 9 4 6M17 9l-4 6"></path>
                  </svg>
                {:else}{key}{/if}
              </button>
            {/each}
          </div>
        {/each}
      </section>
    </main>
  </div>
{/if}

{#if scoreboardOpen}
  <div class="scoreboard-backdrop" aria-hidden="true"></div>
  <div class="scoreboard-dialog" role="dialog" aria-modal="true" aria-labelledby="scoreboard-title">
    <div class="scoreboard-heading">
      <div>
        <p>Game history</p>
        <h2 id="scoreboard-title">Scoreboard</h2>
      </div>
      <button type="button" aria-label="Close scoreboard" on:click={() => (scoreboardOpen = false)}>×</button>
    </div>

    {#if scoreHistory.length > 0}
      <div class="scoreboard-table-wrap">
        <table>
          <thead>
            <tr><th>Date and time</th><th>Solve time</th><th>Letters</th><th>Guesses</th><th>Result</th></tr>
          </thead>
          <tbody>
            {#each scoreHistory as score (score.id)}
              <tr>
                <td>{formatCompletedAt(score.completedAt)}</td>
                <td>{formatElapsedTime(score.durationMs)}</td>
                <td>{score.wordLength}</td>
                <td>{score.guessesUsed} / {score.guessLimit}</td>
                <td>{score.won ? 'Solved' : 'Not solved'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty-scoreboard">No saved games yet.</p>
    {/if}

    <div class="scoreboard-actions">
      <button type="button" class="clear-history-button" disabled={scoreHistory.length === 0} on:click={clearScoreHistory}>Clear History</button>
      <button type="button" class="close-scoreboard-button" on:click={() => (scoreboardOpen = false)}>Close</button>
    </div>
  </div>
{/if}

{#if roundSetupOpen}
  <div class="round-setup-backdrop" aria-hidden="true"></div>
  <div
    class="round-setup-dialog"
    class:colorblind-mode={colorblindMode}
    bind:this={roundSetupDialog}
    role="dialog"
    aria-modal="true"
    aria-labelledby="round-setup-title"
    tabindex="-1"
  >
    <button type="button" class="round-setup-close" aria-label="Close word chooser" on:click={closeRoundSetup}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
    </button>

    <h2 id="round-setup-title">Choose this round’s word</h2>

    <button type="button" class="random-word-button" data-action="choose-random" on:click={useRandomWord}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h3c4.5 0 5.5 10 10 10h3"></path><path d="m17 14 3 3-3 3"></path>
        <path d="M4 17h3c1.8 0 3-1.6 4.1-3.6M14 8.5C15 7.6 16 7 17 7h3"></path><path d="m17 4 3 3-3 3"></path>
      </svg>
      Choose Random
    </button>

    <div class="choice-divider"><span>OR</span></div>

    <form class="teacher-word-form" on:submit|preventDefault={useTeacherWord}>
      <label class="sr-only" for="teacher-word">Type in a word</label>
      <input
        id="teacher-word"
        bind:value={teacherWord}
        type="text"
        inputmode="text"
        name="classroom-round-word"
        maxlength={selectedLength}
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        data-1p-ignore
        data-lpignore="true"
        placeholder="Type in a word"
        aria-invalid={roundSetupError ? 'true' : undefined}
        on:input={() => (roundSetupError = '')}
      />
      {#if roundSetupError}<p class="round-setup-error" role="alert">{roundSetupError}</p>{/if}
      <button type="submit" class="use-word-button">Use this word</button>
    </form>
  </div>
{/if}

{#if exitConfirmOpen}
  <div class="exit-confirm-backdrop" aria-hidden="true"></div>
  <div
    class="exit-confirm-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="exit-confirm-title"
  >
    <h2 id="exit-confirm-title">Are you sure you want to exit the game?</h2>
    <p>Your current round will be left behind.</p>
    <div class="exit-confirm-actions">
      <button type="button" bind:this={exitStayButton} on:click={cancelExit}>Stay</button>
      <button type="button" class="confirm-exit-button" on:click={confirmExit}>Exit game</button>
    </div>
  </div>
{/if}

{#if libraryOpen}
  <WordLibrary
    {library}
    initialLength={selectedLength}
    on:close={() => (libraryOpen = false)}
    on:change={(event) => updateLibrary(event.detail)}
  />
{/if}
