<script lang="ts">
  import { onDestroy } from 'svelte'
  import { hubEntries, type FolderApp, type FolderEntry } from './lib/apps'

  const prefetchedApps = new Map<string, Promise<void>>()
  const prefetchedAssets = new Set<string>()
  const EMPTY_FOLDER_SLOTS = 4

  let openFolderId: string | null = null
  let folderDialog: HTMLDivElement | null = null

  $: openFolder =
    hubEntries.find(
      (entry): entry is FolderEntry => entry.kind === 'folder' && entry.id === openFolderId,
    ) ?? null

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = openFolder ? 'hidden' : ''
  }

  $: if (openFolder && folderDialog) {
    folderDialog.focus()
  }

  const appendPrefetchLink = (href: string, rel: 'modulepreload' | 'prefetch', as?: 'style') => {
    if (prefetchedAssets.has(href)) return
    prefetchedAssets.add(href)

    const link = document.createElement('link')
    link.rel = rel
    link.href = href
    if (as) link.as = as
    document.head.appendChild(link)
  }

  const prefetchApp = (href: string) => {
    const targetUrl = new URL(href, window.location.href).toString()
    const existingRequest = prefetchedApps.get(targetUrl)
    if (existingRequest) return existingRequest

    const prefetchRequest = fetch(targetUrl, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) return

        const html = await response.text()
        const page = new DOMParser().parseFromString(html, 'text/html')

        page.querySelectorAll<HTMLScriptElement>('script[type="module"][src]').forEach((script) => {
          const source = script.getAttribute('src')
          if (!source) return
          appendPrefetchLink(new URL(source, targetUrl).toString(), 'modulepreload')
        })

        page.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((stylesheet) => {
          const source = stylesheet.getAttribute('href')
          if (!source) return
          appendPrefetchLink(new URL(source, targetUrl).toString(), 'prefetch', 'style')
        })
      })
      .catch(() => {
        prefetchedApps.delete(targetUrl)
      })

    prefetchedApps.set(targetUrl, prefetchRequest)
    return prefetchRequest
  }

  const openFolderCard = (folderId: string) => {
    openFolderId = folderId
  }

  const closeFolder = () => {
    openFolderId = null
  }

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeFolder()
    }
  }

  const buildFolderPreview = (apps: FolderApp[]) => {
    const slots: Array<FolderApp | null> = [...apps]
    while (slots.length < EMPTY_FOLDER_SLOTS) {
      slots.push(null)
    }
    return slots.slice(0, EMPTY_FOLDER_SLOTS)
  }

  onDestroy(() => {
    document.body.style.removeProperty('overflow')
  })
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<main class="hub">
  <header class="hero">
    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Classroom Tools</h1>
    <p class="subhead">
      Interactive apps for reading, timing, and hands-on learning, now with folder-style launchers
      for grouped activities.
    </p>
  </header>

  <section class="cards" aria-label="Apps">
    {#each hubEntries as entry, index}
      <article class="card" style={`--card-accent: ${entry.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2>{entry.name}</h2>
        </div>

        {#if entry.kind === 'app'}
          <a
            class="preview-link"
            href={entry.href}
            aria-label={`Open ${entry.name}`}
            on:pointerenter={() => prefetchApp(entry.href)}
            on:focus={() => prefetchApp(entry.href)}
            on:pointerdown={() => prefetchApp(entry.href)}
          >
            <div class="preview">
              <img src={entry.preview} alt={`${entry.name} preview`} loading="lazy" decoding="async" />
            </div>
          </a>
        {:else}
          <button
            type="button"
            class="folder-button"
            aria-haspopup="dialog"
            aria-expanded={openFolderId === entry.id}
            aria-label={`Open ${entry.name}`}
            on:click={() => openFolderCard(entry.id)}
          >
            <div class="folder-preview" aria-hidden="true">
              {#each buildFolderPreview(entry.apps) as app}
                <div
                  class={`folder-slot ${app ? 'filled' : 'empty'}`}
                  style={app ? `--slot-accent: ${app.accent};` : undefined}
                >
                  {#if app}
                    <span>{app.glyph}</span>
                  {/if}
                </div>
              {/each}
            </div>
            <span class="folder-cta">Open folder</span>
          </button>
        {/if}

        <p class="description">{entry.description}</p>
        <div class="tags">
          {#each entry.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
          <span class="status" aria-hidden="true"></span>
        </div>
      </article>
    {/each}
  </section>
</main>

{#if openFolder}
  <div class="folder-backdrop" role="presentation" on:pointerdown={closeFolder}>
    <div
      bind:this={folderDialog}
      class="folder-modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="folder-title"
      on:pointerdown|stopPropagation
    >
      <div class="folder-modal-header">
        <div>
          <p class="eyebrow">Folder</p>
          <h2 id="folder-title">{openFolder.name}</h2>
          <p class="folder-description">{openFolder.description}</p>
        </div>
        <button type="button" class="folder-close" aria-label="Close folder" on:click={closeFolder}>
          Close
        </button>
      </div>

      <div class="bubble-grid">
        {#each openFolder.apps as app, index}
          <a
            class="bubble-link"
            href={app.href}
            style={`--bubble-accent: ${app.accent}; --bubble-delay: ${index * 70}ms;`}
            on:pointerenter={() => prefetchApp(app.href)}
            on:focus={() => prefetchApp(app.href)}
            on:pointerdown={() => prefetchApp(app.href)}
          >
            <span class="bubble-icon" aria-hidden="true">{app.glyph}</span>
            <span class="bubble-name">{app.name}</span>
            <span class="bubble-description">{app.description}</span>
          </a>
        {/each}
      </div>
    </div>
  </div>
{/if}
