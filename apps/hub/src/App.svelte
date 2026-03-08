<script lang="ts">
  import { appCards } from './lib/apps'

  const prefetchedApps = new Map<string, Promise<void>>()
  const prefetchedAssets = new Set<string>()

  const appendPrefetchLink = (href: string, rel: 'modulepreload' | 'preload', as?: 'style') => {
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
          appendPrefetchLink(new URL(source, targetUrl).toString(), 'preload', 'style')
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
    <p class="subhead">
      Interactive apps for reading, timing, and hands-on learning — no special software required.
    </p>
  </header>

  <section class="cards" aria-label="Apps">
    {#each appCards as app, index}
      <article class="card" style={`--card-accent: ${app.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2>{app.name}</h2>
        </div>
        <a
          class="preview-link"
          href={app.href}
          aria-label={`Open ${app.name}`}
          on:pointerenter={() => prefetchApp(app.href)}
          on:focus={() => prefetchApp(app.href)}
          on:pointerdown={() => prefetchApp(app.href)}
        >
          <div class="preview">
            <img src={app.preview} alt={`${app.name} preview`} loading="lazy" decoding="async" />
          </div>
        </a>
        <p class="description">{app.description}</p>
        <div class="tags">
          {#each app.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
          <span class="status" aria-hidden="true"></span>
        </div>
      </article>
    {/each}
  </section>
</main>
