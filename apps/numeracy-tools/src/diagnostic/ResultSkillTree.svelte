<script lang="ts">
  import { tick } from 'svelte'
  import { resultLabels } from './presentation'
  import { treeBranches } from './resultTree'
  import SkillDetails from './SkillDetails.svelte'
  import type { Skill, SkillResult } from './types'

  let { report, map, finished, oncheck }: {
    report: SkillResult[]; map: Skill[]; finished: boolean; oncheck: (id: string, trigger?: HTMLElement) => void
  } = $props()
  const symbols = { demonstrated: '✓', practise: '!', mixed: '?', unassessed: '–' }
  const statuses = ['demonstrated', 'practise', 'mixed', 'unassessed'] as const
  const byId = $derived(new Map(report.map(row => [row.skill.id, row])))
  let branch = $state(0)
  let selectedId = $state('')
  let detailTitle: HTMLHeadingElement | undefined = $state()
  let treeTitle: HTMLHeadingElement | undefined = $state()
  let opener: HTMLElement | undefined
  const selected = $derived(byId.get(selectedId))

  export function inspect(id: string, trigger?: HTMLElement) {
    if (!byId.has(id)) return
    if (trigger) opener = trigger
    selectedId = id
    void tick().then(() => detailTitle?.focus())
  }

  function close() {
    selectedId = ''
    void tick().then(() => (opener?.getClientRects().length ? opener : treeTitle)?.focus())
  }
</script>

<section class="result-tree" aria-labelledby="result-tree-title">
  <h2 id="result-tree-title" bind:this={treeTitle} tabindex="-1">Cycle 4 skill tree</h2>
  <p class="diag-muted">Follow each branch down to its foundations. Select a skill to open its questions.</p>
  <ul class="tree-legend" aria-label="Result key">
    {#each statuses as result}
      <li class="diag-result-text" data-result={result}><span aria-hidden="true">{symbols[result]}</span> {resultLabels[result]}</li>
    {/each}
  </ul>
  <label class="tree-branch">Course branch
    <select bind:value={branch}>
      {#each treeBranches as path, index (path.name)}<option value={index}>{path.name}</option>{/each}
    </select>
  </label>
  <div class="tree-paths">
    {#each treeBranches as path, index (path.name)}
      <section class="tree-path" class:other-branch={index !== branch} aria-labelledby={`result-path-${index}`}>
        <h3 id={`result-path-${index}`}>{path.name}</h3>
        <ol class="tree-levels">
          {#each path.levels as level, position (level.name)}
            <li>
              <div class="tree-step">
                <h4>{level.name}</h4>
                <ul class="tree-skills">
                  {#each level.skills as id (id)}
                    {@const row = byId.get(id)}
                    {#if row}
                      <li>
                        <span class="diag-result-text" data-result={row.result} aria-hidden="true">{symbols[row.result]}</span>
                        <button
                          type="button"
                          class="diag-link diag-result-text tree-skill"
                          data-result={row.result}
                          aria-label={`${row.skill.name} · ${resultLabels[row.result]}`}
                          aria-expanded={selectedId === id}
                          onclick={event => oncheck(id, event.currentTarget)}
                        >{row.skill.name}</button>
                      </li>
                    {/if}
                  {/each}
                </ul>
              </div>
              {#if position < path.levels.length - 1}
                <svg class="tree-arrow" viewBox="0 0 16 24" aria-hidden="true">
                  <path d="M8 2v18m-5-5 5 5 5-5" />
                </svg>
              {/if}
            </li>
          {/each}
        </ol>
      </section>
    {/each}
  </div>
  {#if selected}
    <section class="diag-panel tree-detail" aria-labelledby="tree-detail-title">
      <div class="tree-detail-head">
        <h3 id="tree-detail-title" bind:this={detailTitle} tabindex="-1">{selected.skill.name} <small>{selected.skill.id}</small></h3>
        <button type="button" class="diag-secondary" onclick={close}>Close skill details</button>
      </div>
      <SkillDetails
        skill={selected.skill}
        {map}
        result={selected}
        showExample={finished || selected.result === 'demonstrated' || selected.result === 'practise'}
        onselect={oncheck}
      />
    </section>
  {/if}
</section>

<style>
  .result-tree { margin: 1.5rem 0; }
  .result-tree > p { margin: .4rem 0 0; }
  .tree-legend { display: flex; flex-wrap: wrap; gap: .3rem 1.2rem; list-style: none; margin: .85rem 0 1.25rem; padding: 0; font-size: .88rem; }
  .tree-legend li { font-weight: 700; }
  .tree-paths { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: clamp(.65rem, 1.45vw, 1.35rem); align-items: start; }
  .tree-path h3 { border-top: 3px solid var(--diag-accent); padding-top: .65rem; min-height: 3.35em; }
  .tree-levels, .tree-skills { list-style: none; padding: 0; margin: 0; }
  .tree-step { background: var(--diag-panel); border: 1px solid var(--line); border-radius: .55rem; padding: .65rem .7rem; }
  .tree-step h4 { margin: 0 0 .45rem; font-size: .84rem; }
  .tree-skills { display: grid; gap: .37rem; }
  .tree-skills li { display: grid; grid-template-columns: .85em minmax(0, 1fr); gap: .25rem; align-items: baseline; font-size: .86rem; line-height: 1.35; }
  .tree-skills li > span { text-align: center; }
  .tree-skill:hover, .tree-skill[aria-expanded="true"] { text-decoration-thickness: .12em; }
  .tree-arrow { display: block; width: 1rem; height: 1.4rem; margin: .28rem auto; stroke: var(--diag-accent); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; fill: none; }
  .tree-branch { display: none; }
  .tree-detail { margin-top: .8rem; }
  .tree-detail-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .65rem; }
  .tree-detail-head small { font-weight: 400; color: var(--muted); }
  @media (max-width: 62rem) {
    .tree-branch { display: block; margin-bottom: .7rem; }
    .tree-branch select { max-width: 22rem; }
    .tree-paths { grid-template-columns: minmax(0, 1fr); }
    .other-branch { display: none; }
    .tree-path h3 { min-height: auto; margin-bottom: .65rem; }
    .tree-skills li { font-size: .96rem; }
    .tree-skill { padding-block: .24rem; }
  }
  @media print { .result-tree { display: none; } }
</style>
