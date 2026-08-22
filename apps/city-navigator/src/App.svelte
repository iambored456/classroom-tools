<script lang="ts">
  import { onMount } from 'svelte'
  import Builder from './components/Builder.svelte'
  import Game from './components/Game.svelte'
  import Home from './components/Home.svelte'
  import LevelLibrary from './components/LevelLibrary.svelte'
  import { clone, validateLibrary } from './lib/domain'
  import { createSeedLibrary, emptyLevel } from './lib/maps'
  import {
    downloadLibrary,
    loadLibrary,
    loadPreferences,
    saveLibrary,
    savePreferences,
  } from './lib/persistence'
  import type { DirectionMode, Level, LibraryData, RepresentationMode } from './lib/types'

  type Screen = 'home' | 'levels' | 'builder' | 'game' | 'preview'

  let screen: Screen = 'home'
  let data: LibraryData = createSeedLibrary()
  let directionMode: DirectionMode = 'cardinal'
  let representation: RepresentationMode = 'letters'
  let currentLevel: Level | null = null
  let builderSource: Level | null = null
  let loaded = false
  let appNotice = ''

  onMount(async () => {
    const preferences = loadPreferences()
    directionMode = preferences.directionMode
    representation = preferences.representation
    const stored = await loadLibrary()
    if (stored) data = stored
    else await saveLibrary(data)
    loaded = true
  })

  function setMode(value: DirectionMode): void {
    directionMode = value
    savePreferences(directionMode, representation)
  }

  function setRepresentation(value: RepresentationMode): void {
    representation = value
    savePreferences(directionMode, representation)
  }

  async function commit(next: LibraryData): Promise<void> {
    data = clone(next)
    await saveLibrary(data)
  }

  function play(levelId: string): void {
    const level = data.levels.find((item) => item.id === levelId)
    if (!level) return
    currentLevel = clone(level)
    if (level.activityType === 'where-end' && level.requiredMode && level.requiredMode !== directionMode) {
      setMode(level.requiredMode)
      appNotice = `Switched to ${level.requiredMode === 'cardinal' ? 'Cardinal' : 'Relative'} directions for this prediction activity.`
      setTimeout(() => appNotice = '', 3200)
    }
    screen = 'game'
  }

  function edit(levelId: string): void {
    const level = data.levels.find((item) => item.id === levelId)
    if (!level) return
    builderSource = clone(level)
    screen = 'builder'
  }

  function create(groupId?: string): void {
    const targetGroup = groupId ?? data.groups.sort((a, b) => a.order - b.order)[0]?.id
    if (!targetGroup) return
    builderSource = emptyLevel(targetGroup)
    screen = 'builder'
  }

  async function saveLevel(event: CustomEvent<Level>): Promise<void> {
    const saved = event.detail
    const next = clone(data)
    const index = next.levels.findIndex((item) => item.id === saved.id)
    if (index >= 0) next.levels[index] = saved
    else {
      saved.order = next.levels.filter((item) => item.groupId === saved.groupId).length
      next.levels.push(saved)
    }
    await commit(next)
    screen = 'levels'
    builderSource = null
    appNotice = 'Level saved to this browser.'
    setTimeout(() => appNotice = '', 2400)
  }

  function previewLevel(event: CustomEvent<Level>): void {
    builderSource = clone(event.detail)
    currentLevel = clone(event.detail)
    screen = 'preview'
  }

  async function importData(event: CustomEvent<{ file: File; mode: 'merge' | 'replace' }>): Promise<void> {
    try {
      const raw = await event.detail.file.text()
      const imported: unknown = JSON.parse(raw)
      if (!validateLibrary(imported)) {
        appNotice = 'That file is not a supported City Routes backup.'
        return
      }
      if (event.detail.mode === 'replace') {
        if (!window.confirm('Replace every saved group and level with this backup?')) return
        await commit(clone(imported))
      } else {
        const next = clone(data)
        for (const group of imported.groups) {
          if (!next.groups.some((item) => item.id === group.id)) next.groups.push(clone(group))
        }
        for (const level of imported.levels) {
          if (!next.levels.some((item) => item.id === level.id)) next.levels.push(clone(level))
        }
        await commit(next)
      }
      appNotice = `Backup ${event.detail.mode === 'replace' ? 'restored' : 'merged'} successfully.`
    } catch {
      appNotice = 'The backup could not be read. Check that it is valid JSON.'
    }
    setTimeout(() => appNotice = '', 3600)
  }
</script>

{#if !loaded}
  <main class="loading-screen"><div class="loading-mark">▲</div><strong>Opening City Routes…</strong></main>
{:else if screen === 'home'}
  <Home
    {directionMode}
    {representation}
    on:levels={() => screen = 'levels'}
    on:builder={() => create()}
    on:mode={(event) => setMode(event.detail)}
    on:representation={(event) => setRepresentation(event.detail)}
    on:export={() => downloadLibrary(data)}
    on:import={importData}
  />
{:else if screen === 'levels'}
  <LevelLibrary
    {data}
    {directionMode}
    {representation}
    on:home={() => screen = 'home'}
    on:play={(event) => play(event.detail)}
    on:edit={(event) => edit(event.detail)}
    on:create={(event) => create(event.detail)}
    on:change={(event) => commit(event.detail)}
  />
{:else if screen === 'builder' && builderSource}
  <Builder
    source={builderSource}
    groups={data.groups}
    {representation}
    globalMode={directionMode}
    on:cancel={() => { builderSource = null; screen = 'levels' }}
    on:save={saveLevel}
    on:preview={previewLevel}
  />
{:else if (screen === 'game' || screen === 'preview') && currentLevel}
  {#key `${currentLevel.id}-${screen}`}
    <Game
      level={currentLevel}
      globalMode={directionMode}
      {representation}
      preview={screen === 'preview'}
      on:exit={() => { currentLevel = null; screen = screen === 'preview' ? 'builder' : 'levels' }}
    />
  {/key}
{/if}

{#if appNotice}<div class="app-toast" role="status">{appNotice}</div>{/if}
