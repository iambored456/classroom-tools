<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DirectionSymbol from './DirectionSymbol.svelte'
  import { commandText, nodeById } from '../lib/domain'
  import {
    cityBlocks,
    goalVisualOffset,
    roadGeometries,
    shortenedCenterLine,
    streetLabels,
  } from '../lib/layout'
  import type {
    CityMap,
    Command,
    ExecutionStep,
    Goal,
    GoalSnapshot,
    Heading,
    Point,
    RepresentationMode,
  } from '../lib/types'

  export let map: CityMap
  export let goals: Goal[] = []
  export let startNodeId = ''
  export let car: (Point & { heading: Heading }) | null = null
  export let carAngle: number | null = null
  export let history: ExecutionStep[] = []
  export let goalState: GoalSnapshot = { completedIds: [], activeIndex: 0, finalReached: false }
  export let representation: RepresentationMode = 'letters'
  export let celebrationGoalId: string | null = null
  export let editor = false
  export let tool = 'select'
  export let selectedNodeId: string | null = null
  export let selectedEdgeId: string | null = null
  export let roadStart: Point | null = null
  export let roadPreview: Point | null = null
  export let transientTrace: { from: Point; to: Point; offset: number; progress: number; command: Command; glyphOffset: Point } | null = null
  export let startOnly = false

  const dispatch = createEventDispatcher<{
    mapclick: Point
    nodeclick: { nodeId: string; point: Point }
    edgeclick: { edgeId: string; point: Point }
    crossingclick: Point
    mappointer: Point | null
    nodecontext: { nodeId: string; point: Point }
    edgecontext: { edgeId: string; point: Point }
  }>()

  const headingAngle: Record<Heading, number> = { north: 0, east: 90, south: 180, west: 270 }
  const bridgeHalfSpan = 7.5
  const bridgeHalfWidth = 2.8
  const houseIcons = ['#side-view-house', '#side-view-house-blue', '#side-view-house-bungalow'] as const
  const deciduousTreeIcons = ['#side-view-tree', '#side-view-tree-wide', '#side-view-tree-tall'] as const
  const orderedGoals = () => [...goals].sort((a, b) => a.order - b.order)
  const pointFor = (nodeId: string) => nodeById(map, nodeId) ?? { x: 0, y: 0 }
  const bridgeGradientId = (kind: 'surface' | 'edge', crossingId: string) =>
    `bridge-${kind}-${map.id}-${crossingId}`.replace(/[^a-zA-Z0-9_-]/g, '-')

  const edgeGeometry = (edgeId: string) => {
    const edge = map.edges.find((item) => item.id === edgeId)
    if (!edge) return null
    return { edge, from: pointFor(edge.from), to: pointFor(edge.to) }
  }

  const offsetLine = (step: ExecutionStep) => {
    const from = pointFor(step.fromNodeId)
    const to = pointFor(step.toNodeId)
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
    const px = -(to.y - from.y) / length
    const py = (to.x - from.x) / length
    return {
      x1: from.x + px * step.traceOffset,
      y1: from.y + py * step.traceOffset,
      x2: to.x + px * step.traceOffset,
      y2: to.y + py * step.traceOffset,
    }
  }

  const goalStatus = (goal: Goal) => {
    const ordered = orderedGoals()
    const index = ordered.findIndex((item) => item.id === goal.id)
    if (goalState.completedIds.includes(goal.id)) {
      const carNode = map.nodes.find((node) => car && Math.hypot(node.x - car.x, node.y - car.y) < 0.4)
      return carNode?.id === goal.nodeId ? 'current' : 'completed'
    }
    return index === goalState.activeIndex ? 'active' : 'future'
  }

  const goalNumber = (goal: Goal) => orderedGoals().findIndex((item) => item.id === goal.id) + 1

  const mapPointFromEvent = (event: MouseEvent | PointerEvent): Point | null => {
    const target = event.currentTarget as SVGGraphicsElement | SVGSVGElement
    const svg = target instanceof SVGSVGElement ? target : target.ownerSVGElement
    if (!svg) return null
    const bounds = svg.getBoundingClientRect()
    return {
      x: Math.max(4, Math.min(96, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(4, Math.min(60, ((event.clientY - bounds.top) / bounds.height) * 64)),
    }
  }

  const handleSvgClick = (event: MouseEvent) => {
    const point = mapPointFromEvent(event)
    if (point) dispatch('mapclick', point)
  }

  const handleSvgPointerMove = (event: PointerEvent) => {
    if (!editor) return
    const point = mapPointFromEvent(event)
    if (point) dispatch('mappointer', point)
  }

  const activateKey = (event: KeyboardEvent, action: () => void) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    action()
  }

  const snap = (value: number) => Math.round(value / 5) * 5
  const iconLabel = (goal: Goal) => {
    if (goal.type === 'library') return 'LIBRARY'
    if (goal.type === 'grocery') return 'MARKET'
    if (goal.type === 'school') return 'SCHOOL'
    return goal.label.toUpperCase()
  }

  $: occluded = Boolean(car && map.overpasses.some((crossing) => {
    const close = Math.abs(car!.x - crossing.x) < 2.7 && Math.abs(car!.y - crossing.y) < 2.7
    const orientation = car!.heading === 'east' || car!.heading === 'west' ? 'horizontal' : 'vertical'
    return close && orientation !== crossing.upper
  }))
  $: startPoint = pointFor(startNodeId)
  $: blocks = cityBlocks(map)
  $: roads = roadGeometries(map)
  $: labels = streetLabels(map)
</script>

<svg
  class:editor-map={editor}
  class="city-map"
  data-tool={tool}
  viewBox="0 0 100 64"
  role="img"
  aria-label={editor ? 'Editable city map' : 'City navigation map'}
  on:pointermove={handleSvgPointerMove}
  on:pointerleave={() => editor && dispatch('mappointer', null)}
>
  <defs>
    <pattern id="grass-speckle" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#b9d7bd" />
      <circle cx="1.4" cy="1.7" r=".25" fill="#8cb598" opacity=".42" />
      <circle cx="5.5" cy="4.9" r=".22" fill="#8cb598" opacity=".35" />
    </pattern>
    <filter id="map-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy=".6" stdDeviation=".7" flood-color="#17352f" flood-opacity=".35" />
    </filter>
    <filter id="goal-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#ffd84d" flood-opacity=".9" />
    </filter>
    {#each map.overpasses as crossing (crossing.id)}
      {@const horizontal = crossing.upper === 'horizontal'}
      <linearGradient
        id={bridgeGradientId('surface', crossing.id)}
        gradientUnits="userSpaceOnUse"
        x1={crossing.x - (horizontal ? bridgeHalfSpan : 0)}
        y1={crossing.y - (horizontal ? 0 : bridgeHalfSpan)}
        x2={crossing.x + (horizontal ? bridgeHalfSpan : 0)}
        y2={crossing.y + (horizontal ? 0 : bridgeHalfSpan)}
      >
        <stop offset="0" stop-color="#646e70" />
        <stop offset=".24" stop-color="#6f797b" />
        <stop offset=".5" stop-color="#98a1a2" />
        <stop offset=".76" stop-color="#6f797b" />
        <stop offset="1" stop-color="#646e70" />
      </linearGradient>
      <linearGradient
        id={bridgeGradientId('edge', crossing.id)}
        gradientUnits="userSpaceOnUse"
        x1={crossing.x - (horizontal ? bridgeHalfSpan : 0)}
        y1={crossing.y - (horizontal ? 0 : bridgeHalfSpan)}
        x2={crossing.x + (horizontal ? bridgeHalfSpan : 0)}
        y2={crossing.y + (horizontal ? 0 : bridgeHalfSpan)}
      >
        <stop offset="0" stop-color="#263533" stop-opacity="0" />
        <stop offset=".25" stop-color="#263533" stop-opacity=".16" />
        <stop offset=".5" stop-color="#263533" stop-opacity=".52" />
        <stop offset=".75" stop-color="#263533" stop-opacity=".16" />
        <stop offset="1" stop-color="#263533" stop-opacity="0" />
      </linearGradient>
    {/each}
    <g id="side-view-tree">
      <rect class="tree-trunk" x="-.38" y=".25" width=".76" height="2.25" rx=".18" />
      <path class="tree-canopy" d="M0,-3.05 C-1.25,-3.05 -2.1,-2.22 -1.82,-1.22 C-2.48,-.7 -2.2,.42 -1.18,.65 C-.72,1.2 .08,1.08 .42,.62 C1.34,.95 2.17,.3 1.88,-.62 C2.5,-1.27 1.92,-2.22 .95,-2.2 C.78,-2.72 .42,-3.05 0,-3.05 Z" />
      <path class="tree-highlight" d="M-.98,-1.95 C-.55,-2.46 .12,-2.58 .58,-2.25 C-.15,-2.1 -.68,-1.62 -.76,-.98 C-1.16,-1.13 -1.28,-1.58 -.98,-1.95 Z" />
    </g>
    <g id="side-view-tree-wide" class="tree-variant-wide">
      <rect class="tree-trunk" x="-.42" y=".1" width=".84" height="2.45" rx=".18" />
      <path class="tree-branch" d="M0,1 V-.7 M0,-.15 L-1.05,-1.1 M.05,-.45 L1.12,-1.35" />
      <circle class="tree-canopy" cx="-1.25" cy="-1.25" r="1.35" />
      <circle class="tree-canopy" cx=".05" cy="-2" r="1.55" />
      <circle class="tree-canopy" cx="1.4" cy="-1.2" r="1.28" />
      <circle class="tree-canopy" cx=".05" cy="-.85" r="1.5" />
      <path class="tree-highlight" d="M-1.6,-1.75 C-.95,-2.65 -.12,-2.85 .55,-2.45 C-.4,-2.25 -1.05,-1.75 -1.25,-1.08 Z" />
    </g>
    <g id="side-view-tree-tall" class="tree-variant-tall">
      <rect class="tree-trunk" x="-.34" y="-.1" width=".68" height="2.75" rx=".17" />
      <path class="tree-branch" d="M0,.8 V-1.35 M0,-.6 L-.9,-1.5 M.02,-.9 L.88,-1.75" />
      <ellipse class="tree-canopy" cx="0" cy="-2.05" rx="1.55" ry="2.05" />
      <circle class="tree-canopy" cx="-.92" cy="-1.2" r=".92" />
      <circle class="tree-canopy" cx=".95" cy="-1.25" r=".9" />
      <path class="tree-highlight" d="M-.72,-2.75 C-.28,-3.42 .35,-3.35 .7,-2.88 C.05,-2.72 -.35,-2.2 -.4,-1.55 C-.92,-1.82 -1.02,-2.3 -.72,-2.75 Z" />
    </g>
    <g id="side-view-evergreen">
      <rect class="tree-trunk" x="-.34" y=".5" width=".68" height="2.05" rx=".14" />
      <path class="evergreen-canopy" d="M0,-4.05 L-1.62,-1.55 L-.82,-1.55 L-2.15,.45 L-.85,.45 L-2.45,1.65 H2.45 L.85,.45 H2.15 L.82,-1.55 H1.62 Z" />
      <path class="evergreen-highlight" d="M0,-3.45 L-.78,-1.85 H-.28 L-1.05,-.25 H-.38 L-1.15,.95 H-.18 V-3.45 Z" />
    </g>
    <g id="side-view-house">
      <ellipse class="house-shadow" cx="0" cy="2.38" rx="3.25" ry=".46" />
      <rect class="house-chimney" x="1.45" y="-3.35" width=".78" height="1.55" rx=".12" />
      <rect class="house-wall" x="-3" y="-1.28" width="6" height="3.62" rx=".34" />
      <path class="house-side-shade" d="M2.18,-1.28 H3 V2.34 H2.18 Z" />
      <path class="house-roof" d="M-3.72,-1.08 L0,-3.7 L3.72,-1.08 Z" />
      <path class="house-roof-trim" d="M-3.55,-1.04 L0,-3.48 L3.55,-1.04" />
      <rect class="house-window" x="-2.28" y="-.18" width="1.22" height="1.12" rx=".13" />
      <path class="house-window-pane" d="M-1.67,-.15 V.9 M-2.24,.36 H-1.1" />
      <rect class="house-window" x="1.06" y="-.18" width="1.22" height="1.12" rx=".13" />
      <path class="house-window-pane" d="M1.67,-.15 V.9 M1.1,.36 H2.24" />
      <rect class="house-door" x="-.62" y=".02" width="1.24" height="2.32" rx=".16" />
      <circle class="house-doorknob" cx=".34" cy="1.2" r=".1" />
      <path class="house-foundation" d="M-3.05,2.34 H3.05" />
    </g>
    <g id="side-view-house-blue" class="house-variant-blue">
      <ellipse class="house-shadow" cx="0" cy="2.42" rx="3.45" ry=".46" />
      <rect class="house-chimney" x="-2.25" y="-3.22" width=".76" height="1.6" rx=".12" />
      <rect class="house-wall" x="-3.18" y="-1.38" width="6.36" height="3.78" rx=".3" />
      <path class="house-side-shade" d="M2.35,-1.38 H3.18 V2.4 H2.35 Z" />
      <path class="house-roof" d="M-3.75,-1.18 L0,-3.88 L3.75,-1.18 Z" />
      <path class="house-roof-trim" d="M-3.55,-1.15 L0,-3.62 L3.55,-1.15" />
      <circle class="house-attic-window" cx="0" cy="-2.05" r=".48" />
      <path class="house-window-pane" d="M0,-2.48 V-1.62 M-.42,-2.05 H.42" />
      <rect class="house-window" x="-2.35" y="-.22" width="1.38" height="1.22" rx=".13" />
      <path class="house-window-pane" d="M-1.66,-.18 V.96 M-2.3,.38 H-1.02" />
      <rect class="house-door" x="1.02" y="-.05" width="1.34" height="2.45" rx=".16" />
      <circle class="house-doorknob" cx="2.02" cy="1.2" r=".1" />
      <path class="house-foundation" d="M-3.23,2.4 H3.23" />
    </g>
    <g id="side-view-house-bungalow" class="house-variant-bungalow">
      <ellipse class="house-shadow" cx="0" cy="2.32" rx="3.85" ry=".44" />
      <rect class="house-chimney" x="2.2" y="-2.82" width=".72" height="1.45" rx=".12" />
      <rect class="house-wall" x="-3.55" y="-1.02" width="7.1" height="3.3" rx=".3" />
      <path class="house-side-shade" d="M2.62,-1.02 H3.55 V2.28 H2.62 Z" />
      <path class="house-roof" d="M-4.05,-.85 L-1.75,-3.05 L1.85,-3.05 L4.05,-.85 Z" />
      <path class="house-roof-trim" d="M-3.85,-.82 L-1.6,-2.82 H1.7 L3.85,-.82" />
      <rect class="house-door" x="-2.55" y="-.08" width="1.25" height="2.36" rx=".15" />
      <circle class="house-doorknob" cx="-1.62" cy="1.12" r=".1" />
      <rect class="house-window house-picture-window" x="-.25" y="-.18" width="2.6" height="1.42" rx=".15" />
      <path class="house-window-pane" d="M1.05,-.14 V1.2 M-.2,.52 H2.3" />
      <path class="house-awning" d="M-.55,-.42 H2.65 L2.3,-.82 H-.2 Z" />
      <path class="house-foundation" d="M-3.6,2.28 H3.6" />
    </g>
  </defs>

  <rect class="map-ground" x="0" y="0" width="100" height="64" rx="2" />
  <g class="city-blocks" aria-hidden="true">
    {#each blocks as block, index (block.id)}
      <rect class="city-block" x={block.x} y={block.y} width={block.width} height={block.height} rx="2" />
      {#if block.width > 9 && block.height > 7}
        {#if index % 3 === 1}
          <g class="park-trees">
            <use href={deciduousTreeIcons[0]} transform={`translate(${block.x + block.width * .2} ${block.y + block.height * .45}) scale(.82)`} />
            <use href={deciduousTreeIcons[1]} transform={`translate(${block.x + block.width * .43} ${block.y + block.height * .67}) scale(.68)`} />
            <use href={deciduousTreeIcons[2]} transform={`translate(${block.x + block.width * .67} ${block.y + block.height * .43}) scale(.76)`} />
            <use href="#side-view-evergreen" transform={`translate(${block.x + block.width * .83} ${block.y + block.height * .7}) scale(.7)`} />
          </g>
        {:else}
          <g class="side-view-houses">
            <use href={houseIcons[Math.floor(index / 2) % houseIcons.length]} transform={`translate(${block.x + block.width * (block.width > 18 ? .3 : .55)} ${block.y + block.height * .58}) scale(${block.width > 18 ? .92 : .8})`} />
            {#if block.width > 18}
              <use href={index % 4 === 0 ? '#side-view-evergreen' : deciduousTreeIcons[Math.floor(index / 2) % deciduousTreeIcons.length]} transform={`translate(${block.x + block.width * .51} ${block.y + block.height * .68}) scale(.58)`} />
              <use href={houseIcons[(Math.floor(index / 2) + 1) % houseIcons.length]} transform={`translate(${block.x + block.width * .72} ${block.y + block.height * .61}) scale(.82)`} />
            {:else if block.width > 12}
              <use href={index % 4 === 0 ? '#side-view-evergreen' : deciduousTreeIcons[(Math.floor(index / 2) + 1) % deciduousTreeIcons.length]} transform={`translate(${block.x + block.width * .2} ${block.y + block.height * .68}) scale(.58)`} />
            {/if}
          </g>
        {/if}
      {/if}
    {/each}
  </g>

  <g class="roads">
    <g class="road-curb-layer" aria-hidden="true">
      {#each roads as road (road.edge.id)}
        <line class="road-curb" x1={road.from.x} y1={road.from.y} x2={road.to.x} y2={road.to.y} />
      {/each}
    </g>
    <g class="road-surface-layer" aria-hidden="true">
      {#each roads as road (road.edge.id)}
        <line class="road-surface" x1={road.from.x} y1={road.from.y} x2={road.to.x} y2={road.to.y} />
      {/each}
      {#each map.nodes as node (node.id)}
        <rect class="intersection-surface" x={node.x - 2.82} y={node.y - 2.82} width="5.64" height="5.64" rx=".58" />
      {/each}
    </g>
    <g class="road-center-layer" aria-hidden="true">
      {#each roads as road (road.edge.id)}
        {@const center = shortenedCenterLine(road.from, road.to)}
        <line class="road-center" x1={center.x1} y1={center.y1} x2={center.x2} y2={center.y2} />
      {/each}
      {#each map.nodes as node (node.id)}
        {#if node.id !== startNodeId}
          <rect class="intersection-marking" x={node.x - 2.62} y={node.y - 2.62} width="5.24" height="5.24" />
        {/if}
      {/each}
    </g>
    <g class="street-labels" aria-hidden="true">
      {#each labels as label (label.id)}
        {@const labelWidth = Math.max(7.4, label.name.length * .9) + (label.vertical ? 2.6 : 0)}
        <g class="street-label-wrap" class:vertical-street-label={label.vertical} transform={`translate(${label.x} ${label.y})${label.vertical ? ' rotate(90)' : ''}`}>
          <rect class="street-label-background" x={-labelWidth / 2} y="-1.3" width={labelWidth} height="2.6" rx=".42" />
          <text class="street-label" x="0" y=".05">{label.name}</text>
        </g>
      {/each}
    </g>
  </g>

  <g class="route-traces" aria-label="Travelled route">
    {#each history as step}
      {@const line = offsetLine(step)}
      <line class="route-trace" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
    {/each}
    {#if transientTrace}
      {@const length = Math.hypot(transientTrace.to.x - transientTrace.from.x, transientTrace.to.y - transientTrace.from.y) || 1}
      {@const px = -(transientTrace.to.y - transientTrace.from.y) / length}
      {@const py = (transientTrace.to.x - transientTrace.from.x) / length}
      <line
        class="route-trace transient"
        x1={transientTrace.from.x + px * transientTrace.offset}
        y1={transientTrace.from.y + py * transientTrace.offset}
        x2={transientTrace.from.x + (transientTrace.to.x - transientTrace.from.x) * transientTrace.progress + px * transientTrace.offset}
        y2={transientTrace.from.y + (transientTrace.to.y - transientTrace.from.y) * transientTrace.progress + py * transientTrace.offset}
      />
    {/if}
  </g>

  <g class="route-glyphs" aria-label="Executed directions">
    {#each history as step}
      {@const origin = pointFor(step.fromNodeId)}
      {@const startsRoute = step.commandIndex === 0 && step.fromNodeId === startNodeId}
      <g class:start-direction={startsRoute} transform={`translate(${origin.x + step.glyphOffset.x} ${origin.y + step.glyphOffset.y})`}>
        {#if startsRoute}
          <rect class="route-glyph-frame start-command-frame" x="-2.08" y="-2.08" width="4.16" height="4.16" rx=".82" />
        {:else}
          <circle class="route-glyph-frame" r="2.25" />
        {/if}
        {#if representation === 'letters-arrows'}
          <DirectionSymbol command={step.command} map />
        {:else}
          <text y=".15">{commandText(step.command, representation)}</text>
        {/if}
      </g>
    {/each}
    {#if transientTrace}
      {@const travelDistance = Math.hypot(transientTrace.to.x - transientTrace.from.x, transientTrace.to.y - transientTrace.from.y) * transientTrace.progress}
      {#if travelDistance >= 3.1}
        <g
          class:start-direction={history.length === 0 && Math.hypot(transientTrace.from.x - startPoint.x, transientTrace.from.y - startPoint.y) < .1}
          class="transient-route-glyph"
          transform={`translate(${transientTrace.from.x + transientTrace.glyphOffset.x} ${transientTrace.from.y + transientTrace.glyphOffset.y})`}
        >
          {#if history.length === 0 && Math.hypot(transientTrace.from.x - startPoint.x, transientTrace.from.y - startPoint.y) < .1}
            <rect class="route-glyph-frame start-command-frame" x="-2.08" y="-2.08" width="4.16" height="4.16" rx=".82" />
          {:else}
            <circle class="route-glyph-frame" r="2.25" />
          {/if}
          {#if representation === 'letters-arrows'}
            <DirectionSymbol command={transientTrace.command} map />
          {:else}
            <text y=".15">{commandText(transientTrace.command, representation)}</text>
          {/if}
        </g>
      {/if}
    {/if}
  </g>

  <g class="start-marker" class:initial-start={startOnly} aria-label="Starting position">
    <rect class="start-outline" x={startPoint.x - 2.65} y={startPoint.y - 2.65} width="5.3" height="5.3" rx=".52" />
    <text x={startPoint.x} y={startOnly ? startPoint.y + .12 : startPoint.y + 4.2}>START</text>
  </g>

  <g class="goals">
    {#each orderedGoals() as goal}
      {@const anchor = pointFor(goal.nodeId)}
      {@const offset = goalVisualOffset(goal)}
      {@const status = goalStatus(goal)}
      <g
        class:celebrating={celebrationGoalId === goal.id}
        class={`goal goal-${status}`}
        transform={`translate(${anchor.x + offset.x} ${anchor.y + offset.y})`}
        aria-label={`${goal.label}: ${status}`}
      >
        {#if goal.type === 'star'}
          <path class="goal-star" d="M0,-2.4 L.7,-.78 L2.45,-.7 L1.08,.48 L1.62,2.25 L0,1.3 L-1.62,2.25 L-1.08,.48 L-2.45,-.7 L-.7,-.78 Z" />
        {:else if goal.type === 'number'}
          <circle class="goal-badge" r="3.1" />
          <text class="goal-number" y=".2">{goalNumber(goal)}</text>
        {:else}
          <rect class="poi-building" x="-4.2" y="-3.1" width="8.4" height="6.2" rx=".8" />
          <path class="poi-roof" d="M-4.8,-2.5 L0,-5 L4.8,-2.5 Z" />
          <rect class="poi-door" x="-1" y=".25" width="2" height="2.8" rx=".25" />
          <text class="poi-label" y="5.2">{iconLabel(goal)}</text>
        {/if}
      </g>
    {/each}
  </g>

  <g class="bridge-layer" aria-label="Overpasses">
    {#each map.overpasses as crossing (crossing.id)}
      {@const horizontal = crossing.upper === 'horizontal'}
      <line
        class="bridge-road"
        stroke={`url(#${bridgeGradientId('surface', crossing.id)})`}
        x1={crossing.x - (horizontal ? bridgeHalfSpan : 0)}
        y1={crossing.y - (horizontal ? 0 : bridgeHalfSpan)}
        x2={crossing.x + (horizontal ? bridgeHalfSpan : 0)}
        y2={crossing.y + (horizontal ? 0 : bridgeHalfSpan)}
      />
      {#if horizontal}
        <line
          class="bridge-edge-shadow"
          stroke={`url(#${bridgeGradientId('edge', crossing.id)})`}
          x1={crossing.x - bridgeHalfSpan} y1={crossing.y - bridgeHalfWidth}
          x2={crossing.x + bridgeHalfSpan} y2={crossing.y - bridgeHalfWidth}
        />
        <line
          class="bridge-edge-shadow"
          stroke={`url(#${bridgeGradientId('edge', crossing.id)})`}
          x1={crossing.x - bridgeHalfSpan} y1={crossing.y + bridgeHalfWidth}
          x2={crossing.x + bridgeHalfSpan} y2={crossing.y + bridgeHalfWidth}
        />
      {:else}
        <line
          class="bridge-edge-shadow"
          stroke={`url(#${bridgeGradientId('edge', crossing.id)})`}
          x1={crossing.x - bridgeHalfWidth} y1={crossing.y - bridgeHalfSpan}
          x2={crossing.x - bridgeHalfWidth} y2={crossing.y + bridgeHalfSpan}
        />
        <line
          class="bridge-edge-shadow"
          stroke={`url(#${bridgeGradientId('edge', crossing.id)})`}
          x1={crossing.x + bridgeHalfWidth} y1={crossing.y - bridgeHalfSpan}
          x2={crossing.x + bridgeHalfWidth} y2={crossing.y + bridgeHalfSpan}
        />
      {/if}
      <line
        class="bridge-center"
        x1={crossing.x - (horizontal ? bridgeHalfSpan : 0)}
        y1={crossing.y - (horizontal ? 0 : bridgeHalfSpan)}
        x2={crossing.x + (horizontal ? bridgeHalfSpan : 0)}
        y2={crossing.y + (horizontal ? 0 : bridgeHalfSpan)}
      />
    {/each}
  </g>

  {#if car && !occluded}
    <g class="car car-top" transform={`translate(${car.x} ${car.y}) rotate(${carAngle ?? headingAngle[car.heading]})`} aria-hidden="true">
      <circle r="2.6" />
      <path d="M0,-2.2 L1.55,1.7 L0,1.12 L-1.55,1.7 Z" />
      <path class="car-window" d="M0,-1.22 L.62,.3 L-.62,.3 Z" />
    </g>
  {/if}

  {#if car && occluded}
    <g class="tunnel-hint" aria-hidden="true">
      {#each map.overpasses.filter((crossing) => Math.abs(car!.x - crossing.x) < 3 && Math.abs(car!.y - crossing.y) < 3) as crossing}
        <circle cx={crossing.x} cy={crossing.y} r="1.2" />
      {/each}
    </g>
  {/if}

  {#if editor}
    <g class="editor-grid" aria-hidden="true">
      {#each Array(19) as _, column}
        {#each Array(12) as __, row}
          <circle class="grid-node" cx={5 + column * 5} cy={5 + row * 5} r=".32" />
        {/each}
      {/each}
    </g>
    {#if roadStart && roadPreview && (roadStart.x !== roadPreview.x || roadStart.y !== roadPreview.y)}
      <g class="road-preview" aria-hidden="true">
        <line class="road-preview-curb" x1={roadStart.x} y1={roadStart.y} x2={roadPreview.x} y2={roadPreview.y} />
        <line class="road-preview-surface" x1={roadStart.x} y1={roadStart.y} x2={roadPreview.x} y2={roadPreview.y} />
        <circle class="road-preview-node" cx={roadPreview.x} cy={roadPreview.y} r="1.15" />
      </g>
    {/if}
    <rect
      class="map-click-hit" x="0" y="0" width="100" height="64"
      role="button" tabindex="0" aria-label="Add an item at an empty map position"
      on:click={handleSvgClick}
      on:keydown={(event) => activateKey(event, () => dispatch('mapclick', { x: 50, y: 30 }))}
    />
    <g class="editor-hits">
      {#each map.edges as edge}
        {@const geometry = edgeGeometry(edge.id)}
        {#if geometry}
          <line
            class:selected={edge.id === selectedEdgeId}
            class="edge-hit"
            role="button"
            tabindex="0"
            aria-label={`Select road ${edge.streetName ?? edge.id}`}
            x1={geometry.from.x} y1={geometry.from.y} x2={geometry.to.x} y2={geometry.to.y}
            on:click|stopPropagation={(event) => dispatch('edgeclick', { edgeId: edge.id, point: { x: snap((event.offsetX / (event.currentTarget.ownerSVGElement?.clientWidth ?? 1)) * 100), y: snap((event.offsetY / (event.currentTarget.ownerSVGElement?.clientHeight ?? 1)) * 64) } })}
            on:contextmenu|preventDefault|stopPropagation={() => dispatch('edgecontext', { edgeId: edge.id, point: { x: (geometry.from.x + geometry.to.x) / 2, y: (geometry.from.y + geometry.to.y) / 2 } })}
            on:keydown={(event) => activateKey(event, () => dispatch('edgeclick', { edgeId: edge.id, point: { x: (geometry.from.x + geometry.to.x) / 2, y: (geometry.from.y + geometry.to.y) / 2 } }))}
          />
        {/if}
      {/each}
      {#each map.nodes as node}
        <g
          class:selected={node.id === selectedNodeId}
          class="node-handle"
          role="button"
          tabindex="0"
          aria-label={`Select navigation point ${node.label ?? node.id}`}
          transform={`translate(${node.x} ${node.y})`}
          on:click|stopPropagation={() => dispatch('nodeclick', { nodeId: node.id, point: { x: node.x, y: node.y } })}
          on:contextmenu|preventDefault|stopPropagation={() => dispatch('nodecontext', { nodeId: node.id, point: { x: node.x, y: node.y } })}
          on:keydown={(event) => activateKey(event, () => dispatch('nodeclick', { nodeId: node.id, point: { x: node.x, y: node.y } }))}
        >
          <circle class="node-hit" r="2.7" />
          <circle class="node-dot" r="1.25" />
        </g>
      {/each}
      {#each map.overpasses as crossing}
        <circle
          class="crossing-hit" cx={crossing.x} cy={crossing.y} r="3.2"
          role="button" tabindex="0" aria-label={`Change overpass at ${crossing.x}, ${crossing.y}`}
          on:click|stopPropagation={() => dispatch('crossingclick', { x: crossing.x, y: crossing.y })}
          on:keydown={(event) => activateKey(event, () => dispatch('crossingclick', { x: crossing.x, y: crossing.y }))}
        />
      {/each}
      {#if roadStart}
        <circle class="road-start" cx={roadStart.x} cy={roadStart.y} r="2" />
      {/if}
    </g>
  {/if}
</svg>
