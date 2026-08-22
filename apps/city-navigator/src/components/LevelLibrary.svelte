<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { clone, nodeById, uid } from '../lib/domain'
  import MapView from './MapView.svelte'
  import type { DirectionMode, Heading, Level, LibraryData, RepresentationMode } from '../lib/types'

  export let data: LibraryData
  export let directionMode: DirectionMode
  export let representation: RepresentationMode

  const dispatch = createEventDispatcher<{
    home: void
    play: string
    edit: string
    change: LibraryData
    create: string
  }>()
  let manage = false

  const groups = () => [...data.groups].sort((a, b) => a.order - b.order)
  const levelsFor = (groupId: string) => data.levels.filter((level) => level.groupId === groupId).sort((a, b) => a.order - b.order)
  const startCar = (level: Level) => {
    const start = nodeById(level.map, level.startNodeId) ?? { x: 0, y: 0 }
    return { x: start.x, y: start.y, heading: level.initialHeading as Heading }
  }
  const commit = (next: LibraryData) => dispatch('change', next)

  function addGroup(): void {
    const name = window.prompt('Name this level group:', 'New Group')?.trim()
    if (!name) return
    const next = clone(data)
    next.groups.push({ id: uid('group'), name, order: next.groups.length })
    commit(next)
  }

  function renameGroup(groupId: string): void {
    const group = data.groups.find((item) => item.id === groupId)
    const name = window.prompt('Rename group:', group?.name)?.trim()
    if (!group || !name) return
    const next = clone(data)
    next.groups.find((item) => item.id === groupId)!.name = name
    commit(next)
  }

  function moveGroup(groupId: string, amount: number): void {
    const ordered = groups()
    const index = ordered.findIndex((group) => group.id === groupId)
    const target = index + amount
    if (target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    const next = clone(data)
    ordered.forEach((group, order) => next.groups.find((item) => item.id === group.id)!.order = order)
    commit(next)
  }

  function removeGroup(groupId: string): void {
    if (data.groups.length <= 1) return
    const group = data.groups.find((item) => item.id === groupId)
    if (!window.confirm(`Delete “${group?.name}” and every level inside it?`)) return
    const next = clone(data)
    next.groups = next.groups.filter((item) => item.id !== groupId)
    next.levels = next.levels.filter((item) => item.groupId !== groupId)
    commit(next)
  }

  function renameLevel(levelId: string): void {
    const level = data.levels.find((item) => item.id === levelId)
    const name = window.prompt('Rename level:', level?.name)?.trim()
    if (!level || !name) return
    const next = clone(data)
    next.levels.find((item) => item.id === levelId)!.name = name
    commit(next)
  }

  function duplicateLevel(levelId: string): void {
    const source = data.levels.find((item) => item.id === levelId)
    if (!source) return
    const copy = clone(source)
    const nodeIds = new Map(copy.map.nodes.map((item) => [item.id, uid('node')]))
    const edgeIds = new Map(copy.map.edges.map((item) => [item.id, uid('road')]))
    copy.id = uid('level')
    copy.name = `${source.name} Copy`
    copy.map.id = uid('map')
    copy.map.nodes.forEach((item) => item.id = nodeIds.get(item.id)!)
    copy.map.edges.forEach((item) => { item.id = edgeIds.get(item.id)!; item.from = nodeIds.get(item.from)!; item.to = nodeIds.get(item.to)! })
    copy.map.overpasses.forEach((item) => {
      item.id = uid('overpass')
      item.horizontalEdgeId = edgeIds.get(item.horizontalEdgeId)!
      item.verticalEdgeId = edgeIds.get(item.verticalEdgeId)!
    })
    copy.startNodeId = nodeIds.get(copy.startNodeId)!
    copy.goals.forEach((item) => { item.id = uid('goal'); item.nodeId = nodeIds.get(item.nodeId)! })
    copy.order = levelsFor(copy.groupId).length
    copy.updatedAt = new Date().toISOString()
    const next = clone(data)
    next.levels.push(copy)
    commit(next)
  }

  function deleteLevel(levelId: string): void {
    const level = data.levels.find((item) => item.id === levelId)
    if (!window.confirm(`Delete “${level?.name}”? This cannot be undone.`)) return
    const next = clone(data)
    next.levels = next.levels.filter((item) => item.id !== levelId)
    commit(next)
  }

  function moveLevel(levelId: string, groupId: string, amount = 0): void {
    const source = data.levels.find((item) => item.id === levelId)
    if (!source) return
    const next = clone(data)
    const item = next.levels.find((level) => level.id === levelId)!
    if (groupId !== source.groupId) {
      item.groupId = groupId
      item.order = levelsFor(groupId).length
    } else {
      const ordered = levelsFor(groupId)
      const index = ordered.findIndex((level) => level.id === levelId)
      const target = index + amount
      if (target < 0 || target >= ordered.length) return
      ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
      ordered.forEach((level, order) => next.levels.find((entry) => entry.id === level.id)!.order = order)
    }
    commit(next)
  }
</script>

<main class="library-screen">
  <header class="page-header">
    <button class="round-button" type="button" aria-label="Back to home" on:click={() => dispatch('home')}>←</button>
    <div><p class="eyebrow">Classroom route library</p><h1>Choose a level</h1><p>Every route stays visible, whichever direction mode you selected.</p></div>
    <div class="header-actions">
      <span class="mode-pill">{directionMode === 'cardinal' ? 'N E S W' : 'L F R U'}</span>
      <button class:active={manage} type="button" on:click={() => manage = !manage}>{manage ? 'Done' : 'Manage'}</button>
      <button class="primary-button" type="button" on:click={() => dispatch('create', data.groups[0]?.id)}>＋ New level</button>
    </div>
  </header>

  <div class="group-list">
    {#each groups() as group, groupIndex}
      <section class="level-group">
        <div class="group-heading">
          <div><span>{String(groupIndex + 1).padStart(2, '0')}</span><h2>{group.name}</h2><small>{levelsFor(group.id).length} {levelsFor(group.id).length === 1 ? 'level' : 'levels'}</small></div>
          {#if manage}
            <div class="management-actions">
              <button type="button" aria-label="Move group up" disabled={groupIndex === 0} on:click={() => moveGroup(group.id, -1)}>↑</button>
              <button type="button" aria-label="Move group down" disabled={groupIndex === groups().length - 1} on:click={() => moveGroup(group.id, 1)}>↓</button>
              <button type="button" on:click={() => renameGroup(group.id)}>Rename</button>
              <button class="danger-text" type="button" disabled={data.groups.length <= 1} on:click={() => removeGroup(group.id)}>Delete</button>
            </div>
          {/if}
        </div>
        <div class="level-grid">
          {#each levelsFor(group.id) as level, levelIndex}
            <article class="level-card">
              <button class="level-preview" type="button" aria-label={`Play ${level.name}`} on:click={() => dispatch('play', level.id)}>
                <MapView map={level.map} goals={level.goals} startNodeId={level.startNodeId} car={startCar(level)} {representation} />
                <span class="play-chip">▶ Play</span>
              </button>
              <div class="level-card-body">
                <div class="level-title-row"><h3>{level.name}</h3><span>{level.goals.length || '—'} stop{level.goals.length === 1 ? '' : 's'}</span></div>
                <p>{level.activityType === 'where-end' ? 'Where Will It End?' : 'Plan a Route'} · {level.complexity}</p>
                {#if level.activityType === 'where-end'}<span class="required-badge">Uses {level.requiredMode}</span>{/if}
              </div>
              {#if manage}
                <div class="level-management">
                  <button type="button" on:click={() => dispatch('edit', level.id)}>Edit</button>
                  <button type="button" on:click={() => duplicateLevel(level.id)}>Duplicate</button>
                  <button type="button" on:click={() => renameLevel(level.id)}>Rename</button>
                  <button type="button" disabled={levelIndex === 0} on:click={() => moveLevel(level.id, group.id, -1)}>↑</button>
                  <button type="button" disabled={levelIndex === levelsFor(group.id).length - 1} on:click={() => moveLevel(level.id, group.id, 1)}>↓</button>
                  <select aria-label="Move to group" value={group.id} on:change={(event) => moveLevel(level.id, event.currentTarget.value)}>
                    {#each groups() as destination}<option value={destination.id}>{destination.name}</option>{/each}
                  </select>
                  <button class="danger-text" type="button" on:click={() => deleteLevel(level.id)}>Delete</button>
                </div>
              {/if}
            </article>
          {/each}
          <button class="new-level-card" type="button" on:click={() => dispatch('create', group.id)}><b>＋</b><span>Create a level in {group.name}</span></button>
        </div>
      </section>
    {/each}
  </div>
  <button class="add-group-button" type="button" on:click={addGroup}>＋ Add level group</button>
</main>
