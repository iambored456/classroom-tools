<script lang="ts">
  import SetupIcon, { type Pair } from './SetupIcon.svelte'
  import Icon from './Icon.svelte'
  import { kinds, type Kind } from './rounds'
  let { kind = $bindable(), difficulty = $bindable(), pair = $bindable(), total = $bindable(), onstart }: {
    kind: Kind; difficulty: string; pair: string; total: number; onstart: () => void
  } = $props()
  const modes = Object.keys(kinds) as Kind[]
  const values = { benchmarks: 'Familiar amounts', hundredths: 'Any hundredth' } as const
  const valueKeys = Object.keys(values) as (keyof typeof values)[]
  const pairs: Record<Pair,string> = {
    all: 'All four forms', 'fraction-decimal': 'Fractions & decimals', 'decimal-percent': 'Decimals & percents',
    'fraction-percent': 'Fractions & percents', 'decimal-money': 'Decimals & money',
  }
  const pairKeys = Object.keys(pairs) as Pair[]
  const id = $props.id()
</script>

{#snippet tile(label: string, graphic: import('svelte').Snippet)}
  <span class="tile-face"><span class="graphic">{@render graphic()}</span><span>{label}</span></span>
{/snippet}

<section class="game-setup panel">
  <h2>Set up a game</h2>
  <fieldset>
    <legend>Challenge</legend>
    <div class="choices five challenges">
      {#each modes as mode}
        <label><input type="radio" name={id + '-kind'} value={mode} bind:group={kind}/>
          {#snippet image()}<SetupIcon mode={mode}/>{/snippet}
          {@render tile(kinds[mode],image)}
        </label>
      {/each}
    </div>
  </fieldset>
  <div class="short-groups">
    <fieldset><legend>Values</legend>
      <div class="choices two">
        {#each valueKeys as key}
          <label><input type="radio" name={id + '-values'} value={key} bind:group={difficulty}/>
            {#snippet image()}<SetupIcon values={key}/>{/snippet}
            {@render tile(values[key],image)}
          </label>
        {/each}
      </div>
    </fieldset>
    <fieldset><legend>Rounds</legend>
      <div class="choices three">
        {#each [3,5,10] as n}
          <label><input type="radio" name={id + '-rounds'} value={n} bind:group={total}/>
            {#snippet image()}<SetupIcon rounds={n}/>{/snippet}
            {@render tile(n + ' rounds',image)}
          </label>
        {/each}
      </div>
    </fieldset>
  </div>
  {#if kind !== 'money'}
    <fieldset><legend>{kind === 'mixed' ? 'Conversion rounds' : 'Representations'}</legend>
      <div class="choices five">
        {#each pairKeys as key}
          <label><input type="radio" name={id + '-pair'} value={key} bind:group={pair}/>
            {#snippet image()}<SetupIcon pair={key}/>{/snippet}
            {@render tile(pairs[key],image)}
          </label>
        {/each}
      </div>
    </fieldset>
  {/if}
  <button class="primary" onclick={onstart}>Start game <Icon name="arrow"/></button>
</section>

<style>
  .game-setup { width:min(100%,55rem); margin-inline:auto; display:grid; gap:1rem; }
  .game-setup > button { justify-self:start; }
  fieldset { margin:0; padding:0; min-width:0; border:0; }
  legend { margin:0 0 .35rem; padding:0; font-size:.92rem; font-weight:700; }
  .choices,.short-groups { display:grid; gap:.45rem; }
  .short-groups { grid-template-columns:2fr 3fr; gap:1rem; }
  .two { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .three { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .five { grid-template-columns:repeat(5,minmax(0,1fr)); }
  label { position:relative; display:flex; min-width:0; cursor:pointer; }
  input { position:absolute; width:1px; height:1px; margin:0; padding:0; opacity:0; }
  .tile-face { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.32rem; width:100%;
    text-align:center; padding:.48rem .32rem; border:1px solid var(--border); border-radius:.7rem; color:var(--text); background:var(--surface); line-height:1.12; font-size:.88rem; font-weight:700; }
  .graphic { display:block; width:min(100%,4.6rem); height:2.2rem; }
  .challenges .graphic { width:min(100%,5.1rem); height:2.85rem; }
  label:hover .tile-face { border-color:var(--brand); }
  input:checked + .tile-face { background:var(--touch); border-color:var(--brand); box-shadow:inset 0 0 0 1px var(--brand); }
  input:checked + .tile-face::after { content:''; position:absolute; inset:.28rem .28rem auto auto; width:.45rem; height:.24rem; border-left:2px solid var(--brand); border-bottom:2px solid var(--brand); transform:rotate(-45deg); }
  input:focus-visible + .tile-face { outline:3px solid #ca8123; outline-offset:2px; }
  @media(max-width:40rem) {
    .short-groups { grid-template-columns:1fr; }
    .five { grid-template-columns:repeat(auto-fit,minmax(min(7rem,100%),1fr)); }
  }
</style>
