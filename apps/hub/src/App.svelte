<script lang="ts">
  import { hubEntries } from './lib/apps'

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
    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Classroom Tools</h1>
  </header>

  <section class="cards" aria-label="Apps">
    {#each hubEntries as entry, index}
      <article class="card" style={`--card-accent: ${entry.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2>{entry.name}</h2>
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

        <p class="description">{entry.description}</p>
        <div class="tags" aria-label={`${entry.name} category`}>
          {#each entry.tags as tag}<span>{tag}</span>{/each}
        </div>
      </article>
    {/each}
  </section>
</main>
