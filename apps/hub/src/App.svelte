<script lang="ts">
  import { appCards } from './lib/apps'
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
