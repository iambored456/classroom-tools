<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { defaultRugbyPlayDocument } from '../plays/london'
  import type { PassEvent, PlayerPath, PlayFamily, PlayVariation, Point, RugbyPlayDocument } from '../types'
  import {
    type DraftPass,
    type DraftPlayerPath,
    type EditorTool,
    type Mode,
    type SelectedItem,
  } from '../editor/editorTypes'
  import { buildDocumentExport, buildFamilyExport, buildVariationExport } from '../editor/jsonExport'
  import {
    cloneVariation,
    createUndoState,
    pushUndoSnapshot,
    redoVariation,
    undoVariation,
  } from '../editor/undoRedo'
  import { validatePassEvents } from '../editor/validation'
  import Controls from './Controls.svelte'
  import EditorToolbar from '../editor/components/EditorToolbar.svelte'
  import InspectorPanel from '../editor/components/InspectorPanel.svelte'
  import RugbyField from './RugbyField.svelte'
  import Timeline from '../editor/components/Timeline.svelte'

  const homeHref = new URL('..', new URL(import.meta.env.BASE_URL, window.location.origin)).toString()
  const screenshotMode = new URLSearchParams(window.location.search).get('screenshot') === '1'

  let playDocument: RugbyPlayDocument = structuredClone(defaultRugbyPlayDocument)
  let selectedFamilyId = playDocument.playFamilies[0]?.id ?? ''
  let selectedVariationId = playDocument.playFamilies[0]?.variations[0]?.id ?? ''
  let mode: Mode = 'view'
  let editorTool: EditorTool = 'select'
  let selectedItem: SelectedItem = null
  let draftPlayerPath: DraftPlayerPath | null = null
  let draftPass: DraftPass | null = null
  let undoState = createUndoState()
  let exportText = ''
  let importText = ''
  let currentTime = screenshotMode ? 2.65 : 0
  let isPlaying = !screenshotMode
  let userPaused = false
  let speed = 1
  let mirrored = false
  let showPaths = true
  let showPassLabels = true
  let showBranchLabels = true
  let animationFrameId: number | null = null
  let lastFrameTimestamp: number | null = null

  $: playFamilies = playDocument.playFamilies
  $: selectedFamily =
    playFamilies.find((family) => family.id === selectedFamilyId) ?? playFamilies[0]
  $: selectedVariation = getSelectedVariation(selectedFamily, selectedVariationId)
  $: validationIssues = validatePassEvents(selectedVariation)
  $: selectedPassId =
    selectedItem?.type === 'pass' || selectedItem?.type === 'ball-waypoint'
      ? selectedItem.passId
      : null
  $: if (currentTime > selectedVariation.duration) {
    currentTime = selectedVariation.duration
  }

  function getSelectedVariation(family: PlayFamily, variationId: string): PlayVariation {
    return family.variations.find((variation) => variation.id === variationId) ?? family.variations[0]
  }

  function replaceSelectedVariation(nextVariation: PlayVariation): void {
    playDocument = {
      ...playDocument,
      playFamilies: playDocument.playFamilies.map((family) =>
        family.id === selectedFamilyId
          ? {
              ...family,
              variations: family.variations.map((variation) =>
                variation.id === selectedVariationId ? nextVariation : variation,
              ),
            }
          : family,
      ),
    }
  }

  function updateSelectedVariation(updater: (variation: PlayVariation) => PlayVariation): void {
    replaceSelectedVariation(updater(cloneVariation(selectedVariation)))
  }

  function pushUndo(): void {
    undoState = pushUndoSnapshot(undoState, selectedVariation)
  }

  function setMode(nextMode: Mode): void {
    mode = nextMode
    if (nextMode === 'editor') {
      isPlaying = false
      userPaused = true
      editorTool = 'select'
    } else {
      cancelDraft()
      selectedItem = null
    }
  }

  function setTool(tool: EditorTool): void {
    editorTool = tool
    if (tool !== 'draw-player-path' && tool !== 'add-pass') {
      cancelDraft()
    }
  }

  function selectFamily(familyId: string): void {
    selectedFamilyId = familyId
    const nextFamily = playFamilies.find((family) => family.id === familyId) ?? playFamilies[0]
    selectedVariationId = nextFamily.variations[0].id
    resetEditorForVariation()

    if (!screenshotMode && !userPaused && mode === 'view') {
      isPlaying = true
    }
  }

  function selectVariation(variationId: string): void {
    selectedVariationId = variationId
    resetEditorForVariation()

    if (!screenshotMode && !userPaused && mode === 'view') {
      isPlaying = true
    }
  }

  function resetEditorForVariation(): void {
    currentTime = 0
    selectedItem = null
    cancelDraft()
    undoState = createUndoState()
  }

  function play(): void {
    userPaused = false
    if (currentTime >= selectedVariation.duration) {
      currentTime = 0
    }
    isPlaying = true
  }

  function pause(): void {
    userPaused = true
    isPlaying = false
  }

  function restart(): void {
    userPaused = false
    currentTime = 0
    isPlaying = !screenshotMode
  }

  function cancelDraft(): void {
    draftPlayerPath = null
    draftPass = null
  }

  function getPlayerNumber(playerId: string): string {
    return String(selectedVariation.players.find((player) => player.id === playerId)?.number ?? playerId)
  }

  function selectOrActOnPlayer(playerId: string): void {
    if (mode !== 'editor' || mirrored) return

    if (editorTool === 'draw-player-path') {
      const player = selectedVariation.players.find((candidate) => candidate.id === playerId)
      if (!player) return
      draftPlayerPath = {
        playerId,
        waypoints: [{ ...player.start }],
      }
      selectedItem = { type: 'player', playerId }
      return
    }

    if (editorTool === 'add-pass') {
      if (!draftPass?.fromPlayerId) {
        draftPass = { fromPlayerId: playerId }
        selectedItem = { type: 'player', playerId }
        return
      }

      if (draftPass.fromPlayerId !== playerId) {
        createPass(draftPass.fromPlayerId, playerId)
      }
      return
    }

    selectedItem = { type: 'player', playerId }
    if (editorTool === 'erase') {
      clearPlayerPath(playerId)
    }
  }

  function movePlayer(playerId: string, point: Point): void {
    updateSelectedVariation((variation) => ({
      ...variation,
      players: variation.players.map((player) =>
        player.id === playerId ? { ...player, start: { ...point } } : player,
      ),
      playerPaths: variation.playerPaths.map((path) =>
        path.playerId === playerId
          ? {
              ...path,
              waypoints: path.waypoints.length > 0 ? [{ ...point }, ...path.waypoints.slice(1)] : [{ ...point }],
            }
          : path,
      ),
    }))
    selectedItem = { type: 'player', playerId }
  }

  function handleFieldPoint(point: Point): void {
    if (mode !== 'editor' || mirrored) return

    if (editorTool === 'draw-player-path' && draftPlayerPath) {
      draftPlayerPath = {
        ...draftPlayerPath,
        waypoints: [...draftPlayerPath.waypoints, point],
      }
      return
    }

    if (editorTool === 'edit-player-path' && selectedItem?.type === 'player') {
      addWaypointToPlayerPath(selectedItem.playerId, point)
    }
  }

  function finishDraftPath(): void {
    if (!draftPlayerPath || draftPlayerPath.waypoints.length < 2) return
    const existingPath = selectedVariation.playerPaths.find(
      (path) => path.playerId === draftPlayerPath?.playerId,
    )
    pushUndo()
    const nextPath: PlayerPath = {
      playerId: draftPlayerPath.playerId,
      waypoints: draftPlayerPath.waypoints,
      startT: existingPath?.startT ?? 0,
      pace: existingPath?.pace ?? 12,
      interpolation: 'linear',
    }
    updatePlayerPathWithoutUndo(nextPath)
    selectedItem = { type: 'player', playerId: draftPlayerPath.playerId }
    draftPlayerPath = null
  }

  function updatePlayerPathWithoutUndo(nextPath: PlayerPath): void {
    updateSelectedVariation((variation) => {
      const hasPath = variation.playerPaths.some((path) => path.playerId === nextPath.playerId)
      return {
        ...variation,
        playerPaths: hasPath
          ? variation.playerPaths.map((path) => (path.playerId === nextPath.playerId ? nextPath : path))
          : [...variation.playerPaths, nextPath],
      }
    })
  }

  function updatePlayerPath(nextPath: PlayerPath): void {
    pushUndo()
    updatePlayerPathWithoutUndo(nextPath)
  }

  function addWaypointToPlayerPath(playerId: string, point: Point): void {
    const path = selectedVariation.playerPaths.find((candidate) => candidate.playerId === playerId)
    if (!path) return
    pushUndo()
    updatePlayerPathWithoutUndo({
      ...path,
      waypoints: [...path.waypoints, point],
    })
    selectedItem = { type: 'player-waypoint', playerId, waypointIndex: path.waypoints.length }
  }

  function updatePlayerWaypoint(playerId: string, waypointIndex: number, point: Point): void {
    updateSelectedVariation((variation) => ({
      ...variation,
      players: waypointIndex === 0
        ? variation.players.map((player) =>
            player.id === playerId ? { ...player, start: { ...point } } : player,
          )
        : variation.players,
      playerPaths: variation.playerPaths.map((path) =>
        path.playerId === playerId
          ? {
              ...path,
              waypoints: path.waypoints.map((waypoint, index) =>
                index === waypointIndex ? { ...point } : waypoint,
              ),
            }
          : path,
      ),
    }))
    selectedItem = { type: 'player-waypoint', playerId, waypointIndex }
  }

  function clearPlayerPath(playerId: string): void {
    pushUndo()
    updateSelectedVariation((variation) => ({
      ...variation,
      playerPaths: variation.playerPaths.filter((path) => path.playerId !== playerId),
    }))
    selectedItem = { type: 'player', playerId }
  }

  function createPass(fromPlayerId: string, toPlayerId: string): void {
    const previousEnd = selectedVariation.passes.reduce((max, pass) => Math.max(max, pass.endT), 0)
    const startT = currentTime > 0 ? currentTime : Math.min(previousEnd + 0.4, selectedVariation.duration - 0.35)
    const endT = Math.min(startT + 0.35, selectedVariation.duration)
    const id = `pass-${Date.now().toString(36)}`
    const pass: PassEvent = {
      id,
      from: fromPlayerId,
      to: toPlayerId,
      startT,
      endT,
      label: `${getPlayerNumber(fromPlayerId)} to ${getPlayerNumber(toPlayerId)}`,
      ballPath: {
        interpolation: 'linear',
        waypoints: [],
      },
    }

    pushUndo()
    updateSelectedVariation((variation) => ({
      ...variation,
      passes: [...variation.passes, pass].sort((a, b) => a.startT - b.startT),
    }))
    selectedItem = { type: 'pass', passId: id }
    currentTime = startT
    draftPass = null
  }

  function updatePassWithoutUndo(nextPass: PassEvent): void {
    updateSelectedVariation((variation) => ({
      ...variation,
      passes: variation.passes
        .map((pass) => (pass.id === nextPass.id ? nextPass : pass))
        .sort((a, b) => a.startT - b.startT),
    }))
    selectedItem = { type: 'pass', passId: nextPass.id }
  }

  function updatePass(nextPass: PassEvent): void {
    pushUndo()
    updatePassWithoutUndo(nextPass)
  }

  function addBallWaypoint(passId: string, point: Point): void {
    const pass = selectedVariation.passes.find((candidate) => candidate.id === passId)
    if (!pass) return
    const waypoints = pass.ballPath?.waypoints ?? []
    pushUndo()
    updatePassWithoutUndo({
      ...pass,
      ballPath: {
        interpolation: 'linear',
        waypoints: [...waypoints, point],
      },
    })
    selectedItem = { type: 'ball-waypoint', passId, waypointIndex: waypoints.length }
  }

  function updateBallWaypoint(passId: string, waypointIndex: number, point: Point): void {
    const pass = selectedVariation.passes.find((candidate) => candidate.id === passId)
    if (!pass) return
    updatePassWithoutUndo({
      ...pass,
      ballPath: {
        interpolation: 'linear',
        waypoints: (pass.ballPath?.waypoints ?? []).map((waypoint, index) =>
          index === waypointIndex ? { ...point } : waypoint,
        ),
      },
    })
    selectedItem = { type: 'ball-waypoint', passId, waypointIndex }
  }

  function clearBallWaypoints(passId: string): void {
    const pass = selectedVariation.passes.find((candidate) => candidate.id === passId)
    if (!pass) return
    pushUndo()
    updatePassWithoutUndo({
      ...pass,
      ballPath: {
        interpolation: 'linear',
        waypoints: [],
      },
    })
  }

  function deletePass(passId: string): void {
    pushUndo()
    updateSelectedVariation((variation) => ({
      ...variation,
      passes: variation.passes.filter((pass) => pass.id !== passId),
    }))
    selectedItem = null
  }

  function deleteSelected(): void {
    if (!selectedItem) return

    if (selectedItem.type === 'player-waypoint') {
      const item = selectedItem
      const path = selectedVariation.playerPaths.find((candidate) => candidate.playerId === item.playerId)
      if (!path || path.waypoints.length <= 2) return
      pushUndo()
      updatePlayerPathWithoutUndo({
        ...path,
        waypoints: path.waypoints.filter((_, index) => index !== item.waypointIndex),
      })
      selectedItem = { type: 'player', playerId: item.playerId }
      return
    }

    if (selectedItem.type === 'ball-waypoint') {
      const item = selectedItem
      const pass = selectedVariation.passes.find((candidate) => candidate.id === item.passId)
      if (!pass) return
      pushUndo()
      updatePassWithoutUndo({
        ...pass,
        ballPath: {
          interpolation: 'linear',
          waypoints: (pass.ballPath?.waypoints ?? []).filter((_, index) => index !== item.waypointIndex),
        },
      })
      selectedItem = { type: 'pass', passId: item.passId }
      return
    }

    if (selectedItem.type === 'pass') {
      deletePass(selectedItem.passId)
    }
  }

  function undo(): void {
    const result = undoVariation(undoState, selectedVariation)
    if (!result) return
    undoState = result.state
    replaceSelectedVariation(result.variation)
    selectedItem = null
  }

  function redo(): void {
    const result = redoVariation(undoState, selectedVariation)
    if (!result) return
    undoState = result.state
    replaceSelectedVariation(result.variation)
    selectedItem = null
  }

  function exportVariation(): void {
    exportText = buildVariationExport(selectedVariation)
  }

  function exportFamily(): void {
    exportText = buildFamilyExport(selectedFamily)
  }

  function exportDocument(): void {
    exportText = buildDocumentExport(playDocument)
  }

  async function copyJson(): Promise<void> {
    const text = exportText || buildVariationExport(selectedVariation)
    exportText = text
    await navigator.clipboard?.writeText(text)
  }

  function importJson(): void {
    if (!importText.trim()) return
    const parsed = JSON.parse(importText) as RugbyPlayDocument | PlayFamily | PlayVariation

    if ('schemaVersion' in parsed && Array.isArray(parsed.playFamilies)) {
      playDocument = parsed
      selectedFamilyId = parsed.playFamilies[0]?.id ?? ''
      selectedVariationId = parsed.playFamilies[0]?.variations[0]?.id ?? ''
      resetEditorForVariation()
      return
    }

    if ('variations' in parsed) {
      playDocument = {
        ...playDocument,
        playFamilies: playDocument.playFamilies.map((family) =>
          family.id === selectedFamilyId ? (parsed as PlayFamily) : family,
        ),
      }
      resetEditorForVariation()
      return
    }

    if ('players' in parsed && 'passes' in parsed) {
      pushUndo()
      replaceSelectedVariation(parsed as PlayVariation)
    }
  }

  function resetDefault(): void {
    playDocument = structuredClone(defaultRugbyPlayDocument)
    selectedFamilyId = playDocument.playFamilies[0]?.id ?? ''
    selectedVariationId = playDocument.playFamilies[0]?.variations[0]?.id ?? ''
    resetEditorForVariation()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (mode !== 'editor') return
    const target = event.target
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelDraft()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      finishDraftPath()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteSelected()
    }
  }

  function tick(timestamp: number): void {
    if (lastFrameTimestamp === null) {
      lastFrameTimestamp = timestamp
    }

    const elapsedSeconds = (timestamp - lastFrameTimestamp) / 1000
    lastFrameTimestamp = timestamp

    if (isPlaying) {
      currentTime = Math.min(selectedVariation.duration, currentTime + elapsedSeconds * speed)

      if (currentTime >= selectedVariation.duration) {
        isPlaying = false
      }
    }

    animationFrameId = window.requestAnimationFrame(tick)
  }

  onMount(() => {
    if (!screenshotMode) {
      animationFrameId = window.requestAnimationFrame(tick)
    }
  })

  onDestroy(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
    }
  })
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="app-shell">
  <header class="topbar">
    <a class="home-button" href={homeHref} aria-label="Back to app hub" title="Back to app hub">
      <svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5L12 3.75l8.5 6.75" />
        <path d="M6.5 9.75V20.25h11V9.75" />
        <path d="M10 20.25v-5.5h4v5.5" />
      </svg>
    </a>
    <div class="topbar-title">
      <h1>Rugby Play Visualizer</h1>
      <p>{selectedVariation.description}</p>
    </div>
    <div class="header-mode-toggle" aria-label="Mode">
      <button type="button" class:active={mode === 'view'} on:click={() => setMode('view')}>View</button>
      <button type="button" class:active={mode === 'editor'} on:click={() => setMode('editor')}>Editor</button>
    </div>
  </header>

  <section class="workspace">
    <div class="field-stack">
      <RugbyField
        variation={selectedVariation}
        {currentTime}
        {mirrored}
        {showPaths}
        {showPassLabels}
        {showBranchLabels}
        editing={mode === 'editor'}
        {editorTool}
        {selectedItem}
        {draftPlayerPath}
        onFieldPoint={handleFieldPoint}
        onPlayerPointer={(playerId) => selectOrActOnPlayer(playerId)}
        onPlayerDragStart={pushUndo}
        onPlayerDrag={movePlayer}
        onPlayerDragEnd={movePlayer}
        onWaypointPointer={(playerId, waypointIndex) =>
          (selectedItem = { type: 'player-waypoint', playerId, waypointIndex })}
        onWaypointDragStart={pushUndo}
        onWaypointDrag={updatePlayerWaypoint}
        onWaypointDragEnd={updatePlayerWaypoint}
        onPassPointer={(passId, point) => {
          selectedItem = { type: 'pass', passId }
          if (editorTool === 'edit-ball-path') addBallWaypoint(passId, point)
        }}
        onBallWaypointPointer={(passId, waypointIndex) =>
          (selectedItem = { type: 'ball-waypoint', passId, waypointIndex })}
        onBallWaypointDragStart={pushUndo}
        onBallWaypointDrag={updateBallWaypoint}
        onBallWaypointDragEnd={updateBallWaypoint}
      />

      {#if mode === 'editor'}
        <Timeline
          variation={selectedVariation}
          {currentTime}
          {selectedPassId}
          onScrub={(time) => {
            currentTime = time
            isPlaying = false
            userPaused = true
          }}
          onSelectPass={(passId) => (selectedItem = { type: 'pass', passId })}
          onBeginPassEdit={pushUndo}
          onUpdatePass={updatePassWithoutUndo}
        />
      {/if}
    </div>

    <div class="side-stack">
      <Controls
        {playFamilies}
        {selectedFamilyId}
        {selectedVariationId}
        {selectedFamily}
        {selectedVariation}
        {currentTime}
        {isPlaying}
        bind:speed
        bind:mirrored
        bind:showPaths
        bind:showPassLabels
        bind:showBranchLabels
        onSelectFamily={selectFamily}
        onSelectVariation={selectVariation}
        onPlay={play}
        onPause={pause}
        onRestart={restart}
      />

      {#if mode === 'editor'}
        <EditorToolbar
          {mode}
          {editorTool}
          canUndo={undoState.past.length > 0}
          canRedo={undoState.future.length > 0}
          {draftPlayerPath}
          {draftPass}
          onSetMode={setMode}
          onSetTool={setTool}
          onUndo={undo}
          onRedo={redo}
          onFinishDraftPath={finishDraftPath}
          onCancelDraft={cancelDraft}
        />

        <InspectorPanel
          variation={selectedVariation}
          {selectedItem}
          {editorTool}
          {mirrored}
          {validationIssues}
          bind:exportText
          bind:importText
          onUpdatePlayerPath={updatePlayerPath}
          onDeleteSelected={deleteSelected}
          onClearSelectedPath={() => {
            if (selectedItem?.type === 'player' || selectedItem?.type === 'player-waypoint') {
              clearPlayerPath(selectedItem.playerId)
            }
          }}
          onUpdatePass={updatePass}
          onClearBallWaypoints={clearBallWaypoints}
          onDeletePass={deletePass}
          onExportVariation={exportVariation}
          onExportFamily={exportFamily}
          onExportDocument={exportDocument}
          onCopyJson={copyJson}
          onImportJson={importJson}
          onResetDefault={resetDefault}
        />
      {/if}
    </div>
  </section>
</main>
