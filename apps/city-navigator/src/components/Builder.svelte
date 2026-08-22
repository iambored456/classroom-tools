<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DirectionSymbol from './DirectionSymbol.svelte'
  import { addOrthogonalRoad, cycleCrossing, generateLevel } from '../lib/maps'
  import {
    CARDINAL_COMMANDS,
    clone,
    commandName,
    commandText,
    isReachableSequence,
    nodeById,
    RELATIVE_COMMANDS,
    uid,
  } from '../lib/domain'
  import MapView from './MapView.svelte'
  import type {
    Command,
    Complexity,
    DirectionMode,
    GenerationOptions,
    Goal,
    GoalType,
    Heading,
    Level,
    LevelGroup,
    Point,
    RepresentationMode,
    RouteDifficulty,
  } from '../lib/types'

  export let source: Level
  export let groups: LevelGroup[]
  export let representation: RepresentationMode
  export let globalMode: DirectionMode

  const dispatch = createEventDispatcher<{ cancel: void; save: Level; preview: Level }>()
  let draft = clone(source)
  let tool: 'select' | 'road' | 'start' | 'goal' | 'crossing' = 'select'
  let roadStart: Point | null = null
  let roadPreview: Point | null = null
  let selectedNodeId: string | null = null
  let selectedEdgeId: string | null = null
  let selectedGoalId: string | null = null
  let notice = 'Choose a tool, then work directly on the map. Right-click a road or point to erase it.'
  let generatorOpen = false
  let generation: GenerationOptions = { complexity: 'intermediate', difficulty: 'medium', goalCount: 1 }

  const headings: Heading[] = ['north', 'east', 'south', 'west']
  const goalTypes: GoalType[] = ['star', 'number', 'library', 'grocery', 'school', 'custom']
  const snapPoint = (point: Point): Point => ({
    x: Math.max(5, Math.min(95, Math.round(point.x / 5) * 5)),
    y: Math.max(5, Math.min(60, Math.round(point.y / 5) * 5)),
  })
  const selectedNode = () => draft.map.nodes.find((item) => item.id === selectedNodeId)
  const selectedEdge = () => draft.map.edges.find((item) => item.id === selectedEdgeId)
  const selectedGoal = () => draft.goals.find((item) => item.id === selectedGoalId)
  const storedMode = () => draft.requiredMode ?? 'cardinal'
  const storedCommands = () => storedMode() === 'relative' ? RELATIVE_COMMANDS : CARDINAL_COMMANDS
  const startCar = () => {
    const start = nodeById(draft.map, draft.startNodeId) ?? { x: 0, y: 0 }
    return { x: start.x, y: start.y, heading: draft.initialHeading }
  }

  $: errors = validate()

  function validate(): string[] {
    const messages: string[] = []
    if (!draft.name.trim()) messages.push('Give the level a name.')
    if (!draft.map.nodes.some((item) => item.id === draft.startNodeId)) messages.push('Choose a start position.')
    if (!draft.map.edges.length) messages.push('Draw at least one road.')
    if (draft.activityType === 'plan-route' && !draft.goals.length) messages.push('Place at least one destination.')
    if (draft.activityType === 'where-end' && !draft.storedRecipe?.length) messages.push('Add a prediction recipe.')
    if (!isReachableSequence(draft.map, draft.startNodeId, draft.goals)) messages.push('Every destination must be reachable in order.')
    return messages
  }

  function chooseTool(next: typeof tool): void {
    tool = next
    roadStart = null
    roadPreview = null
    notice = {
      select: 'Select a node or road to edit its name.',
      road: 'Choose a grid point, then choose a second point to place the road.',
      start: 'Choose a navigation point for the car.',
      goal: 'Choose a navigation point to add a destination.',
      crossing: 'Choose a four-way intersection or overpass to cycle its type.',
    }[next]
  }

  function alignedRoadEnd(pointValue: Point): Point {
    const point = snapPoint(pointValue)
    if (!roadStart) return point
    return Math.abs(point.x - roadStart.x) >= Math.abs(point.y - roadStart.y)
      ? { x: point.x, y: roadStart.y }
      : { x: roadStart.x, y: point.y }
  }

  function roadPoint(pointValue: Point, preserveExisting = false): void {
    if (!roadStart) {
      roadStart = preserveExisting ? pointValue : snapPoint(pointValue)
      roadPreview = roadStart
      notice = 'Move across the grid to preview the road, then click its endpoint.'
      return
    }
    const point = preserveExisting && (roadStart.x === pointValue.x || roadStart.y === pointValue.y)
      ? pointValue
      : alignedRoadEnd(pointValue)
    if (roadStart.x === point.x && roadStart.y === point.y) return
    draft.map = addOrthogonalRoad(draft.map, roadStart, point)
    draft = clone(draft)
    roadStart = null
    roadPreview = null
    notice = 'Road added. Choose another grid point to draw the next road.'
  }

  function handleMapPointer(event: CustomEvent<Point | null>): void {
    if (tool !== 'road' || !roadStart || !event.detail) {
      roadPreview = null
      return
    }
    roadPreview = alignedRoadEnd(event.detail)
  }

  function handleMapClick(event: CustomEvent<Point>): void {
    if (tool === 'road') roadPoint(event.detail)
    else notice = 'Choose an existing navigation point for this tool.'
  }

  function handleNodeClick(event: CustomEvent<{ nodeId: string; point: Point }>): void {
    const { nodeId, point } = event.detail
    if (tool === 'road') return roadPoint(point, true)
    if (tool === 'select') {
      selectedNodeId = nodeId
      selectedEdgeId = null
      selectedGoalId = draft.goals.find((item) => item.nodeId === nodeId)?.id ?? null
      notice = 'Node selected. Edit its intersection name in the inspector.'
    } else if (tool === 'start') {
      draft.startNodeId = nodeId
      draft = clone(draft)
      notice = 'Starting position updated.'
    } else if (tool === 'goal') {
      const existing = draft.goals.find((item) => item.nodeId === nodeId)
      if (existing) {
        selectedGoalId = existing.id
        notice = 'That destination is selected in the inspector.'
        return
      }
      const order = draft.goals.length
      const created: Goal = {
        id: uid('goal'), nodeId, order,
        type: order === 0 ? 'star' : 'number',
        label: order === 0 ? 'Yellow Star' : `Goal ${order + 1}`,
        offset: { x: order % 2 ? -4 : 4, y: -4 },
      }
      draft.goals = [...draft.goals, created]
      selectedGoalId = created.id
      draft = clone(draft)
      notice = 'Destination added. Customize it in the inspector.'
    } else if (tool === 'crossing') {
      changeCrossing(point)
    }
  }

  function handleEdgeClick(event: CustomEvent<{ edgeId: string; point: Point }>): void {
    const { edgeId } = event.detail
    if (tool === 'select') {
      selectedEdgeId = edgeId
      selectedNodeId = null
      notice = 'Road selected. Edit its street name in the inspector.'
    }
  }

  function eraseNode(nodeId: string): void {
    if (nodeId === draft.startNodeId || draft.goals.some((item) => item.nodeId === nodeId)) {
      notice = 'Move the start or destination before deleting this point.'
      return
    }
    const removedEdges = draft.map.edges.filter((item) => item.from === nodeId || item.to === nodeId).map((item) => item.id)
    draft.map.nodes = draft.map.nodes.filter((item) => item.id !== nodeId)
    draft.map.edges = draft.map.edges.filter((item) => !removedEdges.includes(item.id))
    draft.map.overpasses = draft.map.overpasses.filter((item) => !removedEdges.includes(item.horizontalEdgeId) && !removedEdges.includes(item.verticalEdgeId))
    if (selectedNodeId === nodeId) selectedNodeId = null
    if (removedEdges.includes(selectedEdgeId ?? '')) selectedEdgeId = null
    roadStart = null
    roadPreview = null
    draft = clone(draft)
    notice = 'Navigation point and its connected roads removed.'
  }

  function eraseEdge(edgeId: string): void {
    draft.map.edges = draft.map.edges.filter((item) => item.id !== edgeId)
    draft.map.overpasses = draft.map.overpasses.filter((item) => item.horizontalEdgeId !== edgeId && item.verticalEdgeId !== edgeId)
    if (selectedEdgeId === edgeId) selectedEdgeId = null
    draft = clone(draft)
    notice = 'Road removed.'
  }

  function changeCrossing(point: Point): void {
    const protectedIds = [draft.startNodeId, ...draft.goals.map((item) => item.nodeId)]
    const result = cycleCrossing(draft.map, point.x, point.y, protectedIds)
    draft.map = result.map
    draft = clone(draft)
    notice = result.message
  }

  function updateNodeLabel(value: string): void {
    const item = selectedNode()
    if (!item) return
    item.label = value
    draft = clone(draft)
  }

  function updateStreetName(value: string): void {
    const item = selectedEdge()
    if (!item) return
    item.streetName = value
    draft = clone(draft)
  }

  function autoNameStreets(): void {
    const horizontal = ['Oak Street', 'Maple Street', 'King Street', 'Garden Street', 'Lake Street', 'Cedar Street']
    const vertical = ['1st Avenue', '2nd Avenue', '3rd Avenue', 'Park Avenue', 'Bridge Avenue', 'Central Avenue']
    const yValues = [...new Set(draft.map.edges.map((item) => {
      const from = nodeById(draft.map, item.from)!
      const to = nodeById(draft.map, item.to)!
      return from.y === to.y ? Math.round(from.y) : null
    }).filter((item): item is number => item !== null))].sort((a, b) => a - b)
    const xValues = [...new Set(draft.map.edges.map((item) => {
      const from = nodeById(draft.map, item.from)!
      const to = nodeById(draft.map, item.to)!
      return from.x === to.x ? Math.round(from.x) : null
    }).filter((item): item is number => item !== null))].sort((a, b) => a - b)
    draft.map.edges.forEach((item) => {
      const from = nodeById(draft.map, item.from)!
      const to = nodeById(draft.map, item.to)!
      item.streetName = from.y === to.y
        ? horizontal[yValues.indexOf(Math.round(from.y)) % horizontal.length]
        : vertical[xValues.indexOf(Math.round(from.x)) % vertical.length]
    })
    draft = clone(draft)
    notice = 'Street names generated. Select any road to customize it.'
  }

  function updateGoal(goalId: string, field: 'label' | 'type', value: string): void {
    const item = draft.goals.find((goal) => goal.id === goalId)
    if (!item) return
    if (field === 'label') item.label = value
    else item.type = value as GoalType
    draft = clone(draft)
  }

  function moveGoal(goalId: string, amount: number): void {
    const ordered = [...draft.goals].sort((a, b) => a.order - b.order)
    const index = ordered.findIndex((item) => item.id === goalId)
    const target = index + amount
    if (target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    ordered.forEach((item, order) => item.order = order)
    draft.goals = ordered
    draft = clone(draft)
  }

  function removeGoal(goalId: string): void {
    draft.goals = draft.goals.filter((item) => item.id !== goalId).map((item, order) => ({ ...item, order }))
    selectedGoalId = null
    draft = clone(draft)
  }

  function setActivity(value: Level['activityType']): void {
    draft.activityType = value
    if (value === 'where-end') {
      draft.requiredMode = globalMode
      draft.storedRecipe = draft.storedRecipe?.length ? draft.storedRecipe : []
    }
    draft = clone(draft)
  }

  function setStoredMode(value: DirectionMode): void {
    if (value === draft.requiredMode) return
    draft.requiredMode = value
    draft.storedRecipe = []
    draft = clone(draft)
    notice = 'The stored recipe was cleared because its semantic direction mode changed.'
  }

  function addStoredCommand(command: Command): void {
    draft.storedRecipe = [...(draft.storedRecipe ?? []), command]
    draft = clone(draft)
  }

  function generate(): void {
    const generated = generateLevel(draft.groupId, generation)
    generated.id = draft.id
    generated.name = draft.name || generated.name
    generated.activityType = draft.activityType
    generated.requiredMode = draft.requiredMode
    generated.storedRecipe = draft.storedRecipe
    draft = generated
    selectedNodeId = null
    selectedEdgeId = null
    selectedGoalId = null
    roadStart = null
    roadPreview = null
    notice = 'Generated city loaded. It is fully editable—adjust anything before saving.'
  }

  function save(): void {
    if (errors.length) return
    draft.updatedAt = new Date().toISOString()
    dispatch('save', clone(draft))
  }
</script>

<main class="builder-screen">
  <header class="builder-topbar">
    <button class="round-button" type="button" aria-label="Leave builder" on:click={() => dispatch('cancel')}>←</button>
    <div><p class="eyebrow">Teacher workspace</p><h1>Level Builder</h1></div>
    <label class="builder-title-field"><span>Level name</span><input value={draft.name} on:input={(event) => { draft.name = event.currentTarget.value; draft = clone(draft) }} /></label>
    <button type="button" disabled={errors.length > 0} on:click={() => dispatch('preview', clone(draft))}>▶ Preview</button>
    <button class="primary-button" type="button" disabled={errors.length > 0} on:click={save}>Save level</button>
  </header>

  <div class="builder-layout">
    <aside class="tool-rail" aria-label="Map tools">
      {#each [
        ['select', '↖', 'Select'], ['road', '━', 'Road'],
        ['start', '▲', 'Start'], ['goal', '★', 'Goal'], ['crossing', '⌘', 'Crossing'],
      ] as item}
        <button class:active={tool === item[0]} type="button" on:click={() => chooseTool(item[0] as typeof tool)}><b>{item[1]}</b><span>{item[2]}</span></button>
      {/each}
    </aside>

    <section class="builder-canvas-panel">
      <div class="editor-status"><span class:warning={notice.includes('must') || notice.includes('before')}>●</span>{notice}</div>
      <MapView
        map={draft.map}
        goals={draft.goals}
        startNodeId={draft.startNodeId}
        car={startCar()}
        {representation}
        editor
        {tool}
        {selectedNodeId}
        {selectedEdgeId}
        {roadStart}
        {roadPreview}
        on:mapclick={handleMapClick}
        on:mappointer={handleMapPointer}
        on:nodeclick={handleNodeClick}
        on:edgeclick={handleEdgeClick}
        on:nodecontext={(event) => eraseNode(event.detail.nodeId)}
        on:edgecontext={(event) => eraseEdge(event.detail.edgeId)}
        on:crossingclick={(event) => changeCrossing(event.detail)}
      />
      <div class="canvas-legend"><span><i class="legend-node"></i> Grid point</span><span><i class="legend-road"></i> Road</span><span><i class="legend-over"></i> Overpass</span><span>Right-click a road or point to erase</span></div>
    </section>

    <aside class="inspector-panel">
      <section>
        <div class="inspector-heading"><p class="eyebrow">Level setup</p><h2>Activity</h2></div>
        <label class="stacked-field"><span>Level group</span><select value={draft.groupId} on:change={(event) => { draft.groupId = event.currentTarget.value; draft = clone(draft) }}>{#each [...groups].sort((a, b) => a.order - b.order) as group}<option value={group.id}>{group.name}</option>{/each}</select></label>
        <div class="segmented"><button class:active={draft.activityType === 'plan-route'} type="button" on:click={() => setActivity('plan-route')}>Plan a Route</button><button class:active={draft.activityType === 'where-end'} type="button" on:click={() => setActivity('where-end')}>Where Will It End?</button></div>
        <label class="stacked-field"><span>Initial heading</span><select value={draft.initialHeading} on:change={(event) => { draft.initialHeading = event.currentTarget.value as Heading; draft = clone(draft) }}>{#each headings as heading}<option value={heading}>{heading}</option>{/each}</select></label>
      </section>

      {#if selectedNode() || selectedEdge()}
        <section class="selection-inspector">
          <div class="inspector-heading"><p class="eyebrow">Selected map item</p><h2>{selectedNode() ? 'Navigation point' : 'Road'}</h2></div>
          {#if selectedNode()}<label class="stacked-field"><span>Intersection / location name</span><input value={selectedNode()?.label ?? ''} placeholder="e.g. Town Square" on:input={(event) => updateNodeLabel(event.currentTarget.value)} /></label>{/if}
          {#if selectedEdge()}<label class="stacked-field"><span>Street name</span><input value={selectedEdge()?.streetName ?? ''} placeholder="e.g. Oak Street" on:input={(event) => updateStreetName(event.currentTarget.value)} /></label>{/if}
        </section>
      {/if}

      <section>
        <div class="section-title-row"><div class="inspector-heading"><p class="eyebrow">Map labels</p><h2>Street names</h2></div><button type="button" on:click={autoNameStreets}>Auto-name</button></div>
        <p class="inspector-note">Use Select, then choose a road or intersection to edit its name.</p>
      </section>

      <section>
        <div class="inspector-heading"><p class="eyebrow">Ordered route</p><h2>Destinations</h2></div>
        <div class="goal-editor-list">
          {#each [...draft.goals].sort((a, b) => a.order - b.order) as goal, index}
            <article class:selected={goal.id === selectedGoalId}>
              <span>{index + 1}</span>
              <div>
                <input aria-label="Destination name" value={goal.label} on:focus={() => selectedGoalId = goal.id} on:input={(event) => updateGoal(goal.id, 'label', event.currentTarget.value)} />
                <select aria-label="Destination type" value={goal.type} on:focus={() => selectedGoalId = goal.id} on:change={(event) => updateGoal(goal.id, 'type', event.currentTarget.value)}>{#each goalTypes as type}<option value={type}>{type}</option>{/each}</select>
              </div>
              <div><button type="button" disabled={index === 0} on:click|stopPropagation={() => moveGoal(goal.id, -1)}>↑</button><button type="button" disabled={index === draft.goals.length - 1} on:click|stopPropagation={() => moveGoal(goal.id, 1)}>↓</button><button class="danger-text" type="button" on:click|stopPropagation={() => removeGoal(goal.id)}>×</button></div>
            </article>
          {/each}
          {#if !draft.goals.length}<p class="empty-inspector">Choose the Goal tool, then select a navigation point.</p>{/if}
        </div>
      </section>

      {#if draft.activityType === 'where-end'}
        <section>
          <div class="inspector-heading"><p class="eyebrow">Prediction recipe</p><h2>Stored directions</h2></div>
          <div class="segmented"><button class:active={storedMode() === 'cardinal'} type="button" on:click={() => setStoredMode('cardinal')}>Cardinal</button><button class:active={storedMode() === 'relative'} type="button" on:click={() => setStoredMode('relative')}>Relative</button></div>
          <div class="mini-recipe">
            {#each draft.storedRecipe ?? [] as command}
              <span>
                {#if representation === 'letters-arrows'}<DirectionSymbol {command} />{:else}{commandText(command, representation)}{/if}
              </span>
            {/each}
            {#if !draft.storedRecipe?.length}<small>No directions yet</small>{/if}
          </div>
          <div class="mini-palette">
            {#each storedCommands() as command}
              <button type="button" on:click={() => addStoredCommand(command)}>
                <b>{#if representation === 'letters-arrows'}<DirectionSymbol {command} />{:else}{commandText(command, representation)}{/if}</b>
                <small>{commandName(command)}</small>
              </button>
            {/each}
          </div>
          <button type="button" disabled={!draft.storedRecipe?.length} on:click={() => { draft.storedRecipe = draft.storedRecipe?.slice(0, -1); draft = clone(draft) }}>Delete last</button>
        </section>
      {/if}

      <section class="generator-card">
        <button class="generator-toggle" type="button" on:click={() => generatorOpen = !generatorOpen}><span>✦</span><div><strong>Procedural generator</strong><small>Create an editable starting city</small></div><b>{generatorOpen ? '−' : '+'}</b></button>
        {#if generatorOpen}
          <div class="generator-fields">
            <label class="stacked-field"><span>Map complexity</span><select bind:value={generation.complexity}>{#each ['basic', 'intermediate', 'advanced'] as value}<option value={value}>{value}</option>{/each}</select></label>
            <label class="stacked-field"><span>Route difficulty</span><select bind:value={generation.difficulty}>{#each ['short', 'medium', 'long'] as value}<option value={value}>{value}</option>{/each}</select></label>
            <label class="stacked-field"><span>Ordered destinations</span><input type="number" min="1" max="5" bind:value={generation.goalCount} /></label>
            <button class="primary-button" type="button" on:click={generate}>Generate editable city</button>
          </div>
        {/if}
      </section>

      {#if errors.length}
        <section class="validation-card"><strong>Before previewing or saving</strong>{#each errors as error}<p>• {error}</p>{/each}</section>
      {/if}
    </aside>
  </div>
</main>
