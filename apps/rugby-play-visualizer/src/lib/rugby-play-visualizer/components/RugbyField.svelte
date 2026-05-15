<script lang="ts">
  import {
    getActivePassAtTime,
    getAllPlayerPositionsAtTime,
    getBallCarrierAtTime,
    getBallPositionAtTime,
    getPassPolyline,
  } from '../playEngine'
  import { mirrorVariation } from '../transforms'
  import type { PassEvent, PlayVariation, Point } from '../types'
  import type { DraftPlayerPath, EditorTool, SelectedItem } from '../editor/editorTypes'
  import { svgPointerToFieldPoint } from '../editor/svgPointer'
  import Ball from './Ball.svelte'
  import FieldMarkings from './FieldMarkings.svelte'
  import PathLayer from './PathLayer.svelte'
  import PlayerJersey from './PlayerJersey.svelte'

  export let variation: PlayVariation
  export let currentTime: number
  export let mirrored: boolean
  export let showPaths: boolean
  export let showPassLabels: boolean
  export let showBranchLabels: boolean
  export let editing = false
  export let editorTool: EditorTool = 'select'
  export let selectedItem: SelectedItem = null
  export let draftPlayerPath: DraftPlayerPath | null = null
  export let onFieldPoint: (point: Point) => void = () => {}
  export let onPlayerPointer: (playerId: string, point: Point) => void = () => {}
  export let onPlayerDragStart: (playerId: string) => void = () => {}
  export let onPlayerDrag: (playerId: string, point: Point) => void = () => {}
  export let onPlayerDragEnd: (playerId: string, point: Point) => void = () => {}
  export let onWaypointPointer: (playerId: string, waypointIndex: number) => void = () => {}
  export let onWaypointDragStart: (playerId: string, waypointIndex: number) => void = () => {}
  export let onWaypointDrag: (playerId: string, waypointIndex: number, point: Point) => void = () => {}
  export let onWaypointDragEnd: (playerId: string, waypointIndex: number, point: Point) => void = () => {}
  export let onPassPointer: (passId: string, point: Point) => void = () => {}
  export let onBallWaypointPointer: (passId: string, waypointIndex: number) => void = () => {}
  export let onBallWaypointDragStart: (passId: string, waypointIndex: number) => void = () => {}
  export let onBallWaypointDrag: (passId: string, waypointIndex: number, point: Point) => void = () => {}
  export let onBallWaypointDragEnd: (passId: string, waypointIndex: number, point: Point) => void = () => {}

  let svgElement: SVGSVGElement | null = null

  $: displayVariation = mirrored ? mirrorVariation(variation) : variation
  $: canEditCoordinates = editing && !mirrored
  $: playerPositions = getAllPlayerPositionsAtTime(displayVariation, currentTime)
  $: activePass = getActivePassAtTime(displayVariation, currentTime)
  $: ballCarrierId = getBallCarrierAtTime(displayVariation, currentTime)
  $: ballPosition = getBallPositionAtTime(displayVariation, currentTime)
  $: selectedPassId =
    selectedItem?.type === 'pass' || selectedItem?.type === 'ball-waypoint'
      ? selectedItem.passId
      : null
  $: displayedBallPosition = getDisplayedBallPosition(ballPosition, Boolean(activePass), mirrored)
  $: players = displayVariation.players.map((player) => ({
    player,
    position: playerPositions[player.id] ?? player.start,
    hasBall: ballCarrierId === player.id,
    isSelected:
      selectedItem?.type === 'player' && selectedItem.playerId === player.id ||
      selectedItem?.type === 'player-waypoint' && selectedItem.playerId === player.id,
    isActive:
      ballCarrierId === player.id ||
      activePass?.from === player.id ||
      activePass?.to === player.id,
  }))

  function getDisplayedBallPosition(position: Point, isInFlight: boolean, isMirrored: boolean): Point {
    if (isInFlight) {
      return position
    }

    return {
      x: position.x + (isMirrored ? -2.35 : 2.35),
      y: position.y - 1.2,
    }
  }

  function pointerPoint(event: PointerEvent): Point {
    return svgElement ? svgPointerToFieldPoint(event, svgElement) : { x: 0, y: 0 }
  }

  function handleFieldPointer(event: PointerEvent): void {
    if (!canEditCoordinates) return
    if (event.target !== svgElement) return
    onFieldPoint(pointerPoint(event))
  }

  function startPlayerDrag(event: PointerEvent, playerId: string): void {
    if (!canEditCoordinates) return
    event.preventDefault()
    event.stopPropagation()
    const startPoint = pointerPoint(event)
    onPlayerPointer(playerId, startPoint)

    if (editorTool !== 'move-player') return

    onPlayerDragStart(playerId)

    const move = (moveEvent: PointerEvent) => {
      onPlayerDrag(playerId, svgElement ? svgPointerToFieldPoint(moveEvent, svgElement) : startPoint)
    }

    const up = (upEvent: PointerEvent) => {
      const point = svgElement ? svgPointerToFieldPoint(upEvent, svgElement) : startPoint
      onPlayerDragEnd(playerId, point)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function startWaypointDrag(event: PointerEvent, playerId: string, waypointIndex: number): void {
    if (!canEditCoordinates) return
    event.preventDefault()
    event.stopPropagation()
    const startPoint = pointerPoint(event)
    onWaypointPointer(playerId, waypointIndex)
    onWaypointDragStart(playerId, waypointIndex)

    const move = (moveEvent: PointerEvent) => {
      onWaypointDrag(playerId, waypointIndex, svgElement ? svgPointerToFieldPoint(moveEvent, svgElement) : startPoint)
    }

    const up = (upEvent: PointerEvent) => {
      const point = svgElement ? svgPointerToFieldPoint(upEvent, svgElement) : startPoint
      onWaypointDragEnd(playerId, waypointIndex, point)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function startBallWaypointDrag(event: PointerEvent, passId: string, waypointIndex: number): void {
    if (!canEditCoordinates) return
    event.preventDefault()
    event.stopPropagation()
    const startPoint = pointerPoint(event)
    onBallWaypointPointer(passId, waypointIndex)
    onBallWaypointDragStart(passId, waypointIndex)

    const move = (moveEvent: PointerEvent) => {
      onBallWaypointDrag(passId, waypointIndex, svgElement ? svgPointerToFieldPoint(moveEvent, svgElement) : startPoint)
    }

    const up = (upEvent: PointerEvent) => {
      const point = svgElement ? svgPointerToFieldPoint(upEvent, svgElement) : startPoint
      onBallWaypointDragEnd(passId, waypointIndex, point)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function handlePassPointer(event: PointerEvent, pass: PassEvent): void {
    if (!canEditCoordinates) return
    event.preventDefault()
    event.stopPropagation()
    onPassPointer(pass.id, pointerPoint(event))
  }
</script>

<section class="field-panel" aria-label="Rugby play field">
  <div class="field-frame">
    <svg
      bind:this={svgElement}
      class="rugby-field"
      class:is-editing={editing}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Top-down rugby field"
      on:pointerdown={handleFieldPointer}
    >
      <defs>
        <filter id="carrier-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <marker
          id="pass-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="3.2"
          markerHeight="3.2"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" class="pass-arrow-head" />
        </marker>
      </defs>

      <FieldMarkings />

      <PathLayer
        variation={displayVariation}
        {currentTime}
        {showPaths}
        {showPassLabels}
        {showBranchLabels}
        {selectedPassId}
      />

      {#if editing}
        <g class="editor-pass-hit-layer">
          {#each displayVariation.passes as pass (pass.id)}
            <path
              role="button"
              tabindex="-1"
              aria-label={`Select pass ${pass.label ?? pass.id}`}
              class="pass-hit-path"
              d={getPassPolyline(displayVariation, pass)
                .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                .join(' ')}
              on:pointerdown={(event) => handlePassPointer(event, pass)}
            />
          {/each}
        </g>
      {/if}

      <g class="player-layer" class:is-editing={editing}>
        {#each players as item (item.player.id)}
          <g
            role="button"
            tabindex="-1"
            aria-label={`Select player ${item.player.number}`}
            class="player-hit-target"
            class:is-selected={item.isSelected}
            transform={`translate(${item.position.x} ${item.position.y})`}
            on:pointerdown={(event) => startPlayerDrag(event, item.player.id)}
          >
            <circle class="player-hit-circle" r="5.9" />
            <PlayerJersey
              number={item.player.number}
              x={0}
              y={0}
              hasBall={item.hasBall}
              isActive={item.isActive || item.isSelected}
            />
          </g>
        {/each}
      </g>

      {#if editing}
        <g class="editor-overlay">
          {#if draftPlayerPath}
            <path
              class="draft-path"
              d={draftPlayerPath.waypoints
                .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                .join(' ')}
            />
            {#each draftPlayerPath.waypoints as point, index}
              <g class="waypoint-handle draft" transform={`translate(${point.x} ${point.y})`}>
                <circle class="waypoint-hit" r="3.9" />
                <circle class="waypoint-dot" r="1.45" />
                <text y="-2.6" text-anchor="middle">{index + 1}</text>
              </g>
            {/each}
          {/if}

          {#each displayVariation.playerPaths as path (path.playerId)}
            {#if selectedItem?.type === 'player-waypoint' && selectedItem.playerId === path.playerId || selectedItem?.type === 'player' && selectedItem.playerId === path.playerId || editorTool === 'edit-player-path'}
              {#each path.waypoints as point, index}
                <g
                  role="button"
                  tabindex="-1"
                  aria-label={`Move waypoint ${index + 1} for ${path.playerId}`}
                  class="waypoint-handle"
                  class:is-selected={selectedItem?.type === 'player-waypoint' && selectedItem.playerId === path.playerId && selectedItem.waypointIndex === index}
                  transform={`translate(${point.x} ${point.y})`}
                  on:pointerdown={(event) => startWaypointDrag(event, path.playerId, index)}
                >
                  <circle class="waypoint-hit" r="3.9" />
                  <circle class="waypoint-dot" r="1.35" />
                  <text y="-2.6" text-anchor="middle">{index + 1}</text>
                </g>
              {/each}
            {/if}
          {/each}

          {#if selectedPassId}
            {#each displayVariation.passes.filter((pass) => pass.id === selectedPassId) as pass}
              {#each pass.ballPath?.waypoints ?? [] as point, index}
                <g
                  role="button"
                  tabindex="-1"
                  aria-label={`Move ball waypoint ${index + 1}`}
                  class="ball-waypoint-handle"
                  class:is-selected={selectedItem?.type === 'ball-waypoint' && selectedItem.passId === pass.id && selectedItem.waypointIndex === index}
                  transform={`translate(${point.x} ${point.y})`}
                  on:pointerdown={(event) => startBallWaypointDrag(event, pass.id, index)}
                >
                  <circle class="waypoint-hit" r="3.9" />
                  <rect class="ball-waypoint-dot" x="-1.25" y="-1.25" width="2.5" height="2.5" rx="0.4" />
                </g>
              {/each}
            {/each}
          {/if}
        </g>
      {/if}

      <Ball x={displayedBallPosition.x} y={displayedBallPosition.y} />
    </svg>
  </div>
</section>
