<script lang="ts">
  import { hubEntries } from './lib/apps'

  const cityRoutesIndex = hubEntries.findIndex((entry) => entry.id === 'city-navigator')
  const openingApps = hubEntries.slice(0, cityRoutesIndex + 1)
  const remainingApps = hubEntries.slice(cityRoutesIndex + 1)
  const orderedEntries = [
    ...openingApps,
    ...remainingApps.filter((entry) => entry.id.startsWith('launchpad-')),
    ...remainingApps.filter((entry) => !entry.id.startsWith('launchpad-')),
  ]

  const prefetchedApps = new Map<string, Promise<void>>()
  const prefetchedAssets = new Set<string>()

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
          if (source) appendPrefetchLink(new URL(source, targetUrl).toString(), 'modulepreload')
        })
        page.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((stylesheet) => {
          const source = stylesheet.getAttribute('href')
          if (source) appendPrefetchLink(new URL(source, targetUrl).toString(), 'prefetch', 'style')
        })
      })
      .catch(() => {
        prefetchedApps.delete(targetUrl)
      })

    prefetchedApps.set(targetUrl, prefetchRequest)
    return prefetchRequest
  }
</script>

<main class="hub">
  <header class="hero">
    <a
      class="hub-switch"
      href="https://iambored456.github.io/music-learning-tools/"
      aria-label="Amateur Music Learning Tools"
      title="Amateur Music Learning Tools"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13M9 9l12-2" />
        <ellipse cx="6" cy="18" rx="3" ry="3" />
        <ellipse cx="18" cy="16" rx="3" ry="3" />
      </svg>
    </a>
    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Classroom Tools</h1>
  </header>

  <section class="cards" aria-label="Apps">
    {#each orderedEntries as entry, index}
      {#if index > 0 && (orderedEntries[index - 1].id === 'city-navigator' || (orderedEntries[index - 1].id.startsWith('launchpad-') && !entry.id.startsWith('launchpad-')))}
        <div class="row-break" aria-hidden="true"></div>
      {/if}
      <article class="card" style={`--card-accent: ${entry.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2><a class="tool-text-link" href={entry.href} on:pointerenter={() => prefetchApp(entry.href)} on:focus={() => prefetchApp(entry.href)} on:pointerdown={() => prefetchApp(entry.href)}>{#each entry.name.split('\n') as line, lineIndex}{#if lineIndex > 0}<br />{/if}{line}{/each}</a></h2>
        </div>

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

        <p class="description"><a class="tool-text-link" href={entry.href} on:pointerenter={() => prefetchApp(entry.href)} on:focus={() => prefetchApp(entry.href)} on:pointerdown={() => prefetchApp(entry.href)}>{entry.description}</a></p>
        <div class="tags" aria-label={`${entry.name} category`}>
          {#each entry.tags as tag}<span>{tag}</span>{/each}
        </div>
      </article>
    {/each}
  </section>
</main>
