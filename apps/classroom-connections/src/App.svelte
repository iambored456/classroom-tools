<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import GroupLibrary from './GroupLibrary.svelte'
  import { createStarterGroups } from './groups'
  import {
    loadGroups,
    loadSessionPlayedGroupIds,
    saveGroups,
    saveSessionPlayedGroupIds,
  } from './storage'
  import { DIFFICULTIES, type Difficulty, type GameTile, type WordGroup } from './types'

  type Screen = 'home' | 'game'
  type StatusTone = 'neutral' | 'success' | 'error'
  type SubmissionPhase = 'idle' | 'pending' | 'wrong' | 'moving' | 'illuminating'
  type ScoreEntry = {
    id: string
    completedAt: number
    durationMs: number
    groupCount: number
    guessesUsed: number
    guessLimit: number
  }

  const MIN_GROUPS = 2
  const MAX_GROUPS = 6
  const MIN_GUESSES = 3
  const MAX_GUESSES = 10
  const SETTINGS_KEY = 'classroom-connections:settings:v1'
  const SCORE_HISTORY_KEY = 'classroom-connections:score-history:v1'
  const THEME_KEY = 'classroom-connections:dark-mode:v1'
  const groupCountWords: Record<number, string> = {
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
  }
  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`

  let screen: Screen = 'home'
  let libraryOpen = false
  let exitConfirmOpen = false
  let darkMode = true
  let groups: WordGroup[] = createStarterGroups()
  let groupCount = 4
  let guessLimit = 4
  let activeGroups: WordGroup[] = []
  let tiles: GameTile[] = []
  let selectedIds: string[] = []
  let solvedGroups: WordGroup[] = []
  let revealedGroupIds: string[] = []
  let guessesRemaining = guessLimit
  let statusMessage = ''
  let statusTone: StatusTone = 'neutral'
  let gameEnded = false
  let gameWon = false
  let submissionPhase: SubmissionPhase = 'idle'
  let solvingGroup: WordGroup | null = null
  let solvingTiles: GameTile[] = []
  let solvingIlluminating = false
  let gameBoard: HTMLElement | null = null
  let puzzleColourByGroupId: Record<string, Difficulty> = {}
  let sessionPlayedGroupIds = new Set<string>()
  let gameStartedAt: number | null = null
  let completedTimeMs: number | null = null
  let homeMessage = ''
  let exitStayButton: HTMLButtonElement | null = null
  let statusTimer: ReturnType<typeof setTimeout> | null = null
  let tileFontMeasureFrame: number | null = null
  let hintGroupId: string | null = null
  let hintAvailable = false
  let hintedTileIds: string[] = []
  let scoreHistory: ScoreEntry[] = []
  let scoreboardOpen = false

  $: enabledCount = groups.filter((group) => group.enabled).length
  $: enabledDifficulties = DIFFICULTIES.filter((difficulty) =>
    groups.some((group) => group.enabled && group.difficulty === difficulty),
  )
  $: enabledDifficultySummary =
    enabledDifficulties.map((difficulty) => difficulty[0].toUpperCase() + difficulty.slice(1)).join(', ') ||
    'No difficulties enabled'
  $: isSubmitting = submissionPhase !== 'idle'

  const delay = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration))

  const animationDuration = (standard: number, reduced = 80) =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? reduced : standard

  const shuffle = <T,>(items: T[]): T[] => {
    const next = [...items]
    for (let index = next.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1))
      ;[next[index], next[target]] = [next[target], next[index]]
    }
    return next
  }

  const normalizedWords = (group: WordGroup) =>
    new Set(group.words.map((word) => word.trim().toLocaleLowerCase()))

  const chooseGameGroups = (
    availableGroups: WordGroup[],
    playedGroupIds: Set<string>,
    requestedGroupCount: number,
  ): WordGroup[] => {
    const candidates = shuffle(availableGroups)
    const picked: WordGroup[] = []
    const usedWords = new Set<string>()
    const maximumFreshGroups = Math.min(
      requestedGroupCount,
      candidates.filter((group) => !playedGroupIds.has(group.id)).length,
    )
    let bestPicked: WordGroup[] = []
    let bestFreshCount = -1

    const search = (startIndex: number): boolean => {
      if (picked.length === requestedGroupCount) {
        const freshCount = picked.filter((group) => !playedGroupIds.has(group.id)).length
        if (freshCount > bestFreshCount) {
          bestFreshCount = freshCount
          bestPicked = [...picked]
        }
        return freshCount === maximumFreshGroups
      }

      if (picked.length + candidates.length - startIndex < requestedGroupCount) return false

      for (let index = startIndex; index < candidates.length; index += 1) {
        const candidate = candidates[index]
        const candidateWords = normalizedWords(candidate)
        if ([...candidateWords].some((word) => usedWords.has(word))) continue

        picked.push(candidate)
        candidateWords.forEach((word) => usedWords.add(word))

        const foundMaximum = search(index + 1)

        picked.pop()
        candidateWords.forEach((word) => usedWords.delete(word))
        if (foundMaximum) return true
      }

      return false
    }

    search(0)
    return bestPicked
  }

  const recordPlayedGroups = (chosenGroups: WordGroup[], availableGroups: WordGroup[]) => {
    const enabledGroupIds = new Set(availableGroups.map((group) => group.id))
    const nextPlayedGroupIds = new Set(
      [...sessionPlayedGroupIds].filter((groupId) => enabledGroupIds.has(groupId)),
    )
    chosenGroups.forEach((group) => nextPlayedGroupIds.add(group.id))

    if (availableGroups.every((group) => nextPlayedGroupIds.has(group.id))) {
      nextPlayedGroupIds.clear()
    }

    sessionPlayedGroupIds = nextPlayedGroupIds
    saveSessionPlayedGroupIds(sessionPlayedGroupIds)
  }

  const stopGameTimer = () => {
    if (gameStartedAt === null || completedTimeMs !== null) return
    completedTimeMs = Math.max(0, Date.now() - gameStartedAt)
  }

  const formatElapsedTime = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
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

  const recordScore = () => {
    const completedAt = Date.now()
    const entry: ScoreEntry = {
      id: `${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt,
      durationMs: completedTimeMs ?? 0,
      groupCount,
      guessesUsed: guessLimit - guessesRemaining,
      guessLimit,
    }
    saveScoreHistory([entry, ...scoreHistory].slice(0, 50))
    scoreboardOpen = true
  }

  const clearScoreHistory = () => saveScoreHistory([])

  const assignPuzzleColours = (chosenGroups: WordGroup[]): Record<string, Difficulty> => {
    const rankedGroups = [...chosenGroups].sort(
      (first, second) =>
        DIFFICULTIES.indexOf(first.difficulty) - DIFFICULTIES.indexOf(second.difficulty),
    )

    const lastColourIndex = DIFFICULTIES.length - 1
    const lastGroupIndex = Math.max(1, rankedGroups.length - 1)
    return Object.fromEntries(
      rankedGroups.map((group, index) => [
        group.id,
        DIFFICULTIES[Math.round((index * lastColourIndex) / lastGroupIndex)],
      ]),
    )
  }

  const puzzleColour = (group: WordGroup) =>
    puzzleColourByGroupId[group.id] ?? group.difficulty

  const setStatus = (message: string, tone: StatusTone = 'neutral', duration = 1300) => {
    if (statusTimer) clearTimeout(statusTimer)
    statusMessage = message
    statusTone = tone
    if (duration > 0) {
      statusTimer = setTimeout(() => {
        statusMessage = ''
      }, duration)
    }
  }

  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ groupCount, guessLimit }))
    } catch {
      // Settings still work for this session when storage is unavailable.
    }
  }

  const changeGroupCount = (amount: number) => {
    groupCount = Math.min(MAX_GROUPS, Math.max(MIN_GROUPS, groupCount + amount))
    saveSettings()
    homeMessage = ''
  }

  const changeGuessLimit = (amount: number) => {
    guessLimit = Math.min(MAX_GUESSES, Math.max(MIN_GUESSES, guessLimit + amount))
    saveSettings()
  }

  const measureTileFontSize = () => {
    if (screen !== 'game' || !gameBoard || activeGroups.length === 0) return
    const sampleTile = gameBoard.querySelector<HTMLElement>('.word-tile')
    if (!sampleTile) return

    const tileRect = sampleTile.getBoundingClientRect()
    const tileStyle = getComputedStyle(sampleTile)
    const measurement = document.createElement('span')
    measurement.style.cssText = `
      position: fixed;
      left: -10000px;
      top: -10000px;
      visibility: hidden;
      white-space: nowrap;
      font-family: ${tileStyle.fontFamily};
      font-size: 100px;
      font-weight: ${tileStyle.fontWeight};
      letter-spacing: ${tileStyle.letterSpacing};
      text-transform: uppercase;
    `
    document.body.appendChild(measurement)

    let widestWordAt100Px = 1
    activeGroups.flatMap((group) => group.words).forEach((word) => {
      measurement.textContent = word
      widestWordAt100Px = Math.max(widestWordAt100Px, measurement.getBoundingClientRect().width)
    })
    measurement.remove()

    const horizontalPadding =
      Number.parseFloat(tileStyle.paddingLeft) + Number.parseFloat(tileStyle.paddingRight)
    const verticalPadding =
      Number.parseFloat(tileStyle.paddingTop) + Number.parseFloat(tileStyle.paddingBottom)
    const innerMargin = Math.max(8, tileRect.width * 0.08)
    const widthLimitedSize =
      ((tileRect.width - horizontalPadding - innerMargin) * 100) / widestWordAt100Px
    const heightLimitedSize = (tileRect.height - verticalPadding) * 0.44
    const nextSize = Math.max(8, Math.min(widthLimitedSize, heightLimitedSize))
    gameBoard.style.setProperty('--tile-word-font-size', `${Math.floor(nextSize * 2) / 2}px`)
  }

  const scheduleTileFontSize = () => {
    if (tileFontMeasureFrame !== null) cancelAnimationFrame(tileFontMeasureFrame)
    tileFontMeasureFrame = requestAnimationFrame(() => {
      tileFontMeasureFrame = null
      measureTileFontSize()
    })
  }

  const startGame = () => {
    const availableGroups = groups.filter((group) => group.enabled)
    const chosenGroups = chooseGameGroups(availableGroups, sessionPlayedGroupIds, groupCount)
    if (chosenGroups.length < groupCount) {
      homeMessage =
        enabledCount < groupCount
          ? `Enable at least ${groupCount} groups before starting a game.`
          : `Choose ${groupCount} enabled groups that do not repeat the same word.`
      libraryOpen = true
      return
    }

    recordPlayedGroups(chosenGroups, availableGroups)
    activeGroups = chosenGroups
    puzzleColourByGroupId = assignPuzzleColours(chosenGroups)
    tiles = shuffle(
      chosenGroups.flatMap((group) =>
        group.words.map((word, index) => ({
          id: `${group.id}:${index}`,
          groupId: group.id,
          word,
        })),
      ),
    )
    selectedIds = []
    solvedGroups = []
    revealedGroupIds = []
    guessesRemaining = guessLimit
    gameEnded = false
    gameWon = false
    submissionPhase = 'idle'
    solvingGroup = null
    solvingTiles = []
    solvingIlluminating = false
    gameStartedAt = Date.now()
    completedTimeMs = null
    hintGroupId = null
    hintAvailable = false
    hintedTileIds = []
    scoreboardOpen = false
    homeMessage = ''
    statusMessage = ''
    exitConfirmOpen = false
    screen = 'game'
    void tick().then(scheduleTileFontSize)
  }

  const selectTile = (tileId: string) => {
    if (gameEnded || isSubmitting) return
    hintGroupId = null
    hintAvailable = false
    hintedTileIds = []
    if (selectedIds.includes(tileId)) {
      selectedIds = selectedIds.filter((id) => id !== tileId)
      return
    }
    if (selectedIds.length < 4) selectedIds = [...selectedIds, tileId]
  }

  const selectedVisualIndex = (tileId: string) =>
    tiles.filter((tile) => selectedIds.includes(tile.id)).findIndex((tile) => tile.id === tileId)

  const deselectAll = () => {
    selectedIds = []
    hintGroupId = null
    hintAvailable = false
    hintedTileIds = []
  }

  const useHint = () => {
    if (!hintAvailable || !hintGroupId) return
    hintedTileIds = tiles
      .filter((tile) => selectedIds.includes(tile.id) && tile.groupId === hintGroupId)
      .map((tile) => tile.id)
    hintAvailable = false
  }

  const animateCorrectGroup = async (matchingGroup: WordGroup, selectedTiles: GameTile[]) => {
    const sourceElements = new Map<string, HTMLElement>()
    gameBoard?.querySelectorAll<HTMLElement>('.word-tile[data-tile-id]').forEach((element) => {
      const tileId = element.dataset.tileId
      if (tileId && selectedIds.includes(tileId)) sourceElements.set(tileId, element)
    })

    const movingClones = selectedTiles.flatMap((tile) => {
      const source = sourceElements.get(tile.id)
      if (!source) return []

      const sourceRect = source.getBoundingClientRect()
      const sourceStyle = getComputedStyle(source)
      const clone = source.cloneNode(true) as HTMLElement
      clone.classList.remove('pending', 'wrong')
      clone.classList.add('moving-card-clone')
      clone.removeAttribute('data-tile-id')
      clone.setAttribute('aria-hidden', 'true')
      clone.setAttribute('tabindex', '-1')
      clone.style.left = `${sourceRect.left}px`
      clone.style.top = `${sourceRect.top}px`
      clone.style.width = `${sourceRect.width}px`
      clone.style.height = `${sourceRect.height}px`
      clone.style.fontSize = sourceStyle.fontSize
      clone.style.backgroundColor = sourceStyle.getPropertyValue('--moving-tile').trim() || sourceStyle.backgroundColor
      clone.style.color = sourceStyle.getPropertyValue('--moving-tile-text').trim() || sourceStyle.color
      document.body.appendChild(clone)

      return [{ tileId: tile.id, element: clone, sourceRect }]
    })

    solvingGroup = matchingGroup
    solvingTiles = selectedTiles
    solvingIlluminating = false
    tiles = tiles.filter((tile) => tile.groupId !== matchingGroup.id)
    selectedIds = []
    submissionPhase = 'moving'

    await tick()

    const moveDuration = animationDuration(760, 100)
    const targets = [...(gameBoard?.querySelectorAll<HTMLElement>('.solving-card') ?? [])]
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    movingClones.forEach(({ tileId, element, sourceRect }) => {
      const targetIndex = solvingTiles.findIndex((tile) => tile.id === tileId)
      const target = targets[targetIndex]
      if (!target || typeof element.animate !== 'function') return
      const destination = target.getBoundingClientRect()
      const horizontalOffset = destination.left - sourceRect.left
      const verticalOffset = destination.top - sourceRect.top
      const scaleX = destination.width / sourceRect.width
      const scaleY = destination.height / sourceRect.height

      element.animate(
        [
          { transform: 'translate(0, 0) scale(1, 1)' },
          { transform: `translate(${horizontalOffset}px, ${verticalOffset}px) scale(${scaleX}, ${scaleY})` },
        ],
        {
          duration: moveDuration,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'both',
        },
      )
    })

    await delay(moveDuration)
    submissionPhase = 'illuminating'
    solvingIlluminating = true
    targets.forEach((target) => {
      target.style.visibility = 'visible'
    })
    await tick()
    movingClones.forEach(({ element }) => element.remove())
    setStatus(solvedGroups.length === groupCount - 1 ? 'Perfect!' : 'Nice!', 'success', 1800)
    await delay(animationDuration(340, 100))

    solvedGroups = [...solvedGroups, matchingGroup]
    solvingGroup = null
    solvingTiles = []
    solvingIlluminating = false

    if (solvedGroups.length === groupCount) {
      gameEnded = true
      gameWon = true
      recordScore()
    }
    submissionPhase = 'idle'
  }

  const submitSelection = async () => {
    if (selectedIds.length !== 4 || gameEnded || isSubmitting) return

    const selectedTiles = tiles.filter((tile) => selectedIds.includes(tile.id))
    hintGroupId = null
    hintAvailable = false
    hintedTileIds = []
    submissionPhase = 'pending'
    await delay(animationDuration(650, 100))

    const matchingGroup = activeGroups.find(
      (group) =>
        !solvedGroups.some((solved) => solved.id === group.id) &&
        selectedTiles.every((tile) => tile.groupId === group.id),
    )

    if (matchingGroup) {
      if (solvedGroups.length === groupCount - 1) stopGameTimer()
      await animateCorrectGroup(matchingGroup, selectedTiles)
      return
    }

    const selectedByGroup = new Map<string, number>()
    selectedTiles.forEach((tile) => {
      selectedByGroup.set(tile.groupId, (selectedByGroup.get(tile.groupId) ?? 0) + 1)
    })
    const bestMatch = [...selectedByGroup.entries()].sort((first, second) => second[1] - first[1])[0]
    const matchingCount = bestMatch?.[1] ?? 0

    guessesRemaining -= 1
    if (guessesRemaining <= 0) stopGameTimer()
    submissionPhase = 'wrong'
    setStatus(matchingCount === 3 ? 'Three match' : matchingCount === 2 ? 'Two match' : 'Not quite', 'error')
    if (matchingCount >= 2 && guessesRemaining > 0) {
      hintGroupId = bestMatch[0]
      hintAvailable = true
    }
    await delay(animationDuration(460, 100))

    if (guessesRemaining <= 0) {
      const remainingGroups = activeGroups.filter(
        (group) => !solvedGroups.some((solved) => solved.id === group.id),
      )
      revealedGroupIds = remainingGroups.map((group) => group.id)
      solvedGroups = [...solvedGroups, ...remainingGroups]
      tiles = []
      selectedIds = []
      gameEnded = true
      gameWon = false
      setStatus('Good try!', 'error', 1800)
    }
    submissionPhase = 'idle'
  }

  const shuffleTiles = () => {
    if (isSubmitting) return
    tiles = shuffle(tiles)
  }

  const returnHome = () => {
    if (isSubmitting) return
    exitConfirmOpen = false
    scoreboardOpen = false
    screen = 'home'
    statusMessage = ''
    selectedIds = []
  }

  const requestExit = async () => {
    if (isSubmitting) return
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

  const toggleDarkMode = () => {
    darkMode = !darkMode
    try {
      localStorage.setItem(THEME_KEY, String(darkMode))
    } catch {
      // The theme still works for this visit when storage is unavailable.
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && exitConfirmOpen) cancelExit()
  }

  const updateGroups = (nextGroups: WordGroup[]) => {
    groups = nextGroups
    saveGroups(groups)
    homeMessage = ''
  }

  onMount(() => {
    groups = loadGroups()
    sessionPlayedGroupIds = loadSessionPlayedGroupIds()
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
            typeof (entry as ScoreEntry).groupCount === 'number' &&
            typeof (entry as ScoreEntry).guessesUsed === 'number' &&
            typeof (entry as ScoreEntry).guessLimit === 'number',
        )
      }
    } catch {
      scoreHistory = []
    }
    try {
      darkMode = localStorage.getItem(THEME_KEY) !== 'false'
      const rawSettings = localStorage.getItem(SETTINGS_KEY)
      if (rawSettings) {
        const settings = JSON.parse(rawSettings) as { groupCount?: unknown; guessLimit?: unknown }
        if (typeof settings.groupCount === 'number') {
          groupCount = Math.min(MAX_GROUPS, Math.max(MIN_GROUPS, Math.round(settings.groupCount)))
        }
        if (typeof settings.guessLimit === 'number') {
          guessLimit = Math.min(MAX_GUESSES, Math.max(MIN_GUESSES, Math.round(settings.guessLimit)))
        }
      }
    } catch {
      darkMode = true
    }
    const handleResize = () => scheduleTileFontSize()
    window.addEventListener('resize', handleResize)
    void document.fonts.ready.then(scheduleTileFontSize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (tileFontMeasureFrame !== null) cancelAnimationFrame(tileFontMeasureFrame)
    }
  })
</script>

<svelte:window on:keydown={handleKeydown} />

{#if screen === 'home'}
  <main class="landing-screen" class:dark-mode={darkMode}>
    <a class="hub-link" href="../" aria-label="Classroom Tools home">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 11 8.5-7 8.5 7"></path>
        <path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path>
      </svg>
    </a>

    <section class="landing-card" aria-labelledby="landing-title">
      <img class="connections-logo" src={logoUrl} alt="" aria-hidden="true" />

      <div class="landing-copy">
        <h1 id="landing-title">Classroom<br />Connections</h1>
        <p>Find {groupCountWords[groupCount]} groups of four.</p>
      </div>

      <div class="game-settings" aria-label="Game setup">
        <fieldset>
          <legend>Number of Groups</legend>
          <div class="stepper">
            <button
              type="button"
              aria-label="Fewer groups"
              disabled={groupCount <= MIN_GROUPS}
              on:click={() => changeGroupCount(-1)}
            >−</button>
            <output aria-live="polite"><strong>{groupCount}</strong></output>
            <button
              type="button"
              aria-label="More groups"
              disabled={groupCount >= MAX_GROUPS}
              on:click={() => changeGroupCount(1)}
            >+</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Number of Guesses</legend>
          <div class="stepper">
            <button
              type="button"
              aria-label="Fewer guesses"
              disabled={guessLimit <= MIN_GUESSES}
              on:click={() => changeGuessLimit(-1)}
            >−</button>
            <output aria-live="polite"><strong>{guessLimit}</strong></output>
            <button
              type="button"
              aria-label="More guesses"
              disabled={guessLimit >= MAX_GUESSES}
              on:click={() => changeGuessLimit(1)}
            >+</button>
          </div>
        </fieldset>
      </div>

      <div class="landing-actions">
        <button type="button" class="landing-button primary" on:click={startGame}>Play</button>
        <button type="button" class="landing-button secondary" on:click={() => (libraryOpen = true)}>
          <span class="library-button-label">
            <strong>Group Library</strong>
            <small>{enabledDifficultySummary}</small>
          </span>
        </button>
      </div>

      {#if homeMessage}
        <p class="home-message" role="alert">{homeMessage}</p>
      {/if}
    </section>

    <label class="theme-toggle">
      <span>Dark mode</span>
      <input type="checkbox" checked={darkMode} on:change={toggleDarkMode} />
      <span class="theme-toggle-track" aria-hidden="true"><span></span></span>
    </label>
  </main>
{:else}
  <div class="game-screen" class:dark-mode={darkMode} style={`--group-count: ${groupCount};`}>
    <main class="game-main">
      <section
        class="game-board"
        bind:this={gameBoard}
        aria-label="Classroom Connections game board"
        aria-busy={isSubmitting}
      >
        {#if solvedGroups.length > 0 || solvingGroup}
          <div class="solved-list" aria-label="Found groups">
            {#each solvedGroups as group (group.id)}
              <article
                class={`solved-group ${puzzleColour(group)}`}
                class:revealed={revealedGroupIds.includes(group.id)}
              >
                <h2>{group.title}</h2>
                <p>{group.words.join(', ')}</p>
                {#if revealedGroupIds.includes(group.id)}<span class="revealed-label">Answer</span>{/if}
              </article>
            {/each}

            {#if solvingGroup}
              <article
                class={`solving-stage ${puzzleColour(solvingGroup)}`}
                class:illuminating={solvingIlluminating}
                aria-label={`Correct group: ${solvingGroup.title}`}
              >
                <div class="solving-cards" aria-hidden={solvingIlluminating}>
                  {#each solvingTiles as tile (tile.id)}
                    <div class="solving-card">{tile.word}</div>
                  {/each}
                </div>
                <div class="solving-answer" aria-hidden={!solvingIlluminating}>
                  <h2>{solvingGroup.title}</h2>
                  <p>{solvingGroup.words.join(', ')}</p>
                </div>
              </article>
            {/if}
          </div>
        {/if}

        {#if tiles.length > 0}
          <div class="tile-grid">
            {#each tiles as tile (tile.id)}
              <button
                type="button"
                class="word-tile"
                class:selected={selectedIds.includes(tile.id)}
                class:pending={submissionPhase === 'pending' && selectedIds.includes(tile.id)}
                class:wrong={submissionPhase === 'wrong' && selectedIds.includes(tile.id)}
                class:hinted={hintedTileIds.includes(tile.id)}
                style={`--pending-index: ${selectedVisualIndex(tile.id)};`}
                data-tile-id={tile.id}
                aria-pressed={selectedIds.includes(tile.id)}
                aria-disabled={isSubmitting}
                animate:flip={{ duration: animationDuration(760, 100) }}
                on:click={() => selectTile(tile.id)}
              >
                {tile.word}
              </button>
            {/each}
          </div>
        {/if}
      </section>

      <div class="mistakes" aria-label={`${guessesRemaining} guesses remaining`}>
        <span>Guesses Remaining:</span>
        <span class="mistake-dots" aria-hidden="true">
          {#each Array(guessLimit) as _, index}
            <span class:spent={index >= guessesRemaining}></span>
          {/each}
        </span>
        {#if hintAvailable}
          <button type="button" class="hint-button" disabled={isSubmitting} on:click={useHint}>Hint</button>
        {/if}
      </div>

      {#if gameEnded}
        <section class="completion-card" aria-live="polite">
          <strong>{gameWon ? 'You found every connection!' : 'The board is complete.'}</strong>
          {#if completedTimeMs !== null}
            <p class="completion-time"><span>Time</span><strong>{formatElapsedTime(completedTimeMs)}</strong></p>
          {/if}
          <div>
            <button type="button" class="control-button primary-control" on:click={startGame}>New Game</button>
            <button type="button" class="control-button" on:click={requestExit}>Home</button>
          </div>
        </section>
      {:else}
        <div class="game-controls">
          <button
            type="button"
            class="header-action home-action"
            aria-label="Return to home"
            disabled={isSubmitting}
            on:click={requestExit}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3.5 11 8.5-7 8.5 7"></path>
              <path d="M6 9.5V20h12V9.5M9.5 20v-6h5v6"></path>
            </svg>
          </button>
          <button type="button" class="control-button" disabled={isSubmitting} on:click={shuffleTiles}>Shuffle</button>
          <button
            type="button"
            class="control-button"
            disabled={selectedIds.length === 0 || isSubmitting}
            on:click={deselectAll}
          >
            Deselect All
          </button>
          <button
            type="button"
            class="control-button submit-button"
            disabled={selectedIds.length !== 4 || isSubmitting}
            on:click={submitSelection}
          >
            Submit
          </button>
        </div>
      {/if}
    </main>

    <div class={`game-toast ${statusTone}`} class:visible={statusMessage} role="status" aria-live="polite">
      {statusMessage}
    </div>
  </div>
{/if}

{#if scoreboardOpen}
  <div class="scoreboard-backdrop" aria-hidden="true"></div>
  <div
    class="scoreboard-dialog"
    class:dark-mode={darkMode}
    role="dialog"
    aria-modal="true"
    aria-labelledby="scoreboard-title"
  >
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
            <tr><th>Date and time</th><th>Solve time</th><th>Groups</th><th>Guesses</th></tr>
          </thead>
          <tbody>
            {#each scoreHistory as score (score.id)}
              <tr>
                <td>{formatCompletedAt(score.completedAt)}</td>
                <td>{formatElapsedTime(score.durationMs)}</td>
                <td>{score.groupCount}</td>
                <td>{score.guessesUsed} / {score.guessLimit}</td>
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

{#if exitConfirmOpen}
  <div class="exit-confirm-backdrop" aria-hidden="true"></div>
  <div
    class="exit-confirm-dialog"
    class:dark-mode={darkMode}
    role="dialog"
    aria-modal="true"
    aria-labelledby="exit-confirm-title"
  >
    <h2 id="exit-confirm-title">Are you sure you want to exit the game?</h2>
    <p>Your current game will be left behind.</p>
    <div class="exit-confirm-actions">
      <button type="button" bind:this={exitStayButton} on:click={cancelExit}>Stay</button>
      <button type="button" class="confirm-exit-button" on:click={confirmExit}>Exit game</button>
    </div>
  </div>
{/if}

{#if libraryOpen}
  <GroupLibrary
    {groups}
    on:close={() => (libraryOpen = false)}
    on:change={(event) => updateGroups(event.detail)}
  />
{/if}
