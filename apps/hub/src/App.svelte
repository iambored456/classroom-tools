<script lang="ts">
  import { hubEntries } from './lib/apps'

  import { onMount } from 'svelte'
  import { getMotionState, setMotionPreference, watchMotionPreference, type MotionPreference } from '../../../packages/motion-preference/index'

  let settingsDialog: HTMLDialogElement
  let motion = getMotionState()
  let preferenceSaved = true
  const motionOptions: { value: MotionPreference; label: string; description: string }[] = [
    { value: 'full', label: 'Always play animations', description: 'Play teaching animations even when this device requests reduced motion.' },
    { value: 'system', label: 'Use device setting', description: 'Follow this device’s animation preference.' },
    { value: 'reduced', label: 'Reduce animations', description: 'Use the tools’ reduced-motion behavior.' },
  ]
  onMount(() => watchMotionPreference(state => { motion = state }))
  function chooseMotion(preference: MotionPreference) {
    preferenceSaved = setMotionPreference(preference)
  }

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
    <button type="button" class="hub-settings-button" aria-label="Classroom Tools settings" title="Settings" on:click={() => settingsDialog.showModal()}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9.5 3-.6 2.2-1.7 1-2.2-.6-2.5 4.3L4.1 11v2l-1.6 1.1L5 18.4l2.2-.6 1.7 1 .6 2.2h5l.6-2.2 1.7-1 2.2.6 2.5-4.3L19.9 13v-2l1.6-1.1L19 5.6l-2.2.6-1.7-1-.6-2.2Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>

    <p class="eyebrow">Quinn Fleming's</p>
    <h1>Classroom Tools</h1>
  </header>

  <section class="cards" aria-label="Apps">
    {#each hubEntries as entry, index (entry.id)}
      <article class="card" style={`--card-accent: ${entry.accent}; --card-delay: ${index * 90}ms;`}>
        <div class="card-header">
          <h2><a class="tool-text-link" href={entry.href} on:pointerenter={() => prefetchApp(entry.href)} on:focus={() => prefetchApp(entry.href)} on:pointerdown={() => prefetchApp(entry.href)}>{entry.name}</a></h2>
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

<dialog class="hub-settings" bind:this={settingsDialog} aria-labelledby="hub-settings-title">
  <div class="settings-heading">
    <h2 id="hub-settings-title">Classroom Tools settings</h2>
    <button type="button" class="settings-close" aria-label="Close settings" on:click={() => settingsDialog.close()}>×</button>
  </div>
  <p class="settings-intro">Applies across Classroom Tools in this browser. Your choice is remembered for future visits.</p>
  <fieldset>
    <legend>Animations</legend>
    {#each motionOptions as option}
      <label class="motion-option" class:selected={motion.preference === option.value}>
        <input type="radio" name="hub-motion" value={option.value} checked={motion.preference === option.value} on:change={() => chooseMotion(option.value)} />
        <span><strong>{option.label}</strong><small>{option.description}</small></span>
      </label>
    {/each}
  </fieldset>
  <p class="device-motion">Device preference: {motion.systemReducedMotion ? 'Reduced motion' : 'Animations enabled'}.</p>
  <p class="motion-status" class:settings-error={!preferenceSaved} role="status">
    {#if !preferenceSaved}
      This browser could not save your choice. It applies to this page only.
    {:else if motion.preference === 'full'}
      Animations are enabled for Classroom Tools, regardless of the device setting.
    {:else if motion.preference === 'reduced'}
      Reduced animations are enabled for Classroom Tools.
    {:else}
      Classroom Tools will follow the device setting.
    {/if}
  </p>
</dialog>
