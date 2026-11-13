<script lang="ts">
  import TransformValue from './TransformValue.svelte'
  import MathSvg from './MathSvg.svelte'
  import { mathWidth } from './math/layout'
  import { quadraticPath } from './transformations'

  let a = $state(1)
  let h = $state(0)
  let k = $state(0)
  let visualAid = $state(false)
  let { settingsOpen = $bindable(false) }: { settingsOpen?: boolean } = $props()
  let settingsDialog: HTMLDialogElement
  export function openSettings() {
    settingsOpen = true
    settingsDialog.showModal()
  }
  let width = $state(1000)
  let height = $state(650)
  const scale = $derived(Math.min(width, height) / 24)
  const xTicks = $derived(Array.from({ length: Math.floor(width / (2 * scale)) * 2 + 1 }, (_, i) => i - Math.floor(width / (2 * scale))))
  const yTicks = $derived(Array.from({ length: Math.floor(height / (2 * scale)) * 2 + 1 }, (_, i) => i - Math.floor(height / (2 * scale))))
  const path = $derived(quadraticPath(a, h, k, width, height))
  const original = $derived(quadraticPath(1, 0, 0, width, height))
  function sizeGraph(node: HTMLDivElement) {
    const observer = new ResizeObserver(([entry]) => {
      width = Math.max(1, entry.contentRect.width)
      height = Math.max(1, entry.contentRect.height)
    })
    observer.observe(node)
    return { destroy: () => observer.disconnect() }
  }
</script>

{#snippet math(tex: string, parameter?: 'h' | 'k')}
  <svg class="math-part" style:width={`${mathWidth(tex, 1)}em`} style:--sign-color={parameter ? `var(--${parameter}-color)` : undefined} viewBox={`0 0 ${mathWidth(tex, 42)} 64`} aria-hidden="true"><MathSvg {tex} x={0} y={45} size={42} anchor="start" /></svg>
{/snippet}

<main class="transformations" aria-label="Transformations Visualization">
  <dialog class="settings-dialog" bind:this={settingsDialog} aria-labelledby="transformation-settings-title" onclose={() => { settingsOpen = false }}>
    <div class="settings-heading">
      <h2 id="transformation-settings-title">Transformation settings</h2>
      <button class="close-settings" onclick={() => settingsDialog.close()} aria-label="Close settings">×</button>
    </div>
    <button class="aid-toggle" role="switch" aria-checked={visualAid} onclick={() => visualAid = !visualAid}><span class="switch-track" aria-hidden="true"></span>Visual aid</button>
  </dialog>
  <div class="equation-toolbar" class:with-aids={visualAid} aria-label="y equals a times x minus h squared plus k">
    {@render math('y =')}
    <TransformValue name="a" description="Vertical stretch and reflection" bind:value={a} min={-5} max={5} step={0.1} dragAxis="both" {visualAid} />
    {@render math(h < 0 ? '(x +' : '(x -', 'h')}
    <TransformValue name="h" description="Horizontal translation" bind:value={h} min={-10} max={10} step={0.25} showMagnitude reverseDrag {visualAid} />
    {@render math(k < 0 ? ')^2 -' : ')^2 +', 'k')}
    <TransformValue name="k" description="Vertical translation" bind:value={k} min={-10} max={10} step={0.25} dragAxis="vertical" showMagnitude {visualAid} />
  </div>
  <div class="graph" use:sizeGraph>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="transform-graph-title transform-graph-description">
      <title id="transform-graph-title">Quadratic transformations</title>
      <desc id="transform-graph-description">y = {a}(x {h < 0 ? '+' : '−'} {Math.abs(h)})² {k < 0 ? '−' : '+'} {Math.abs(k)}. {a === 0 ? `A horizontal line at y = ${k}.` : `Vertex at (${h}, ${k}), opening ${a > 0 ? 'upward' : 'downward'}.`} The dashed reference curve is y = x².</desc>
      <defs><clipPath id="transform-graph-clip"><rect width={width} height={height} /></clipPath></defs>
      <g clip-path="url(#transform-graph-clip)">
        {#each xTicks as x}<line class:axis={x === 0} class="grid-line" x1={width / 2 + x * scale} x2={width / 2 + x * scale} y1={0} y2={height} />{/each}
        {#each yTicks as y}<line class:axis={y === 0} class="grid-line" y1={height / 2 - y * scale} y2={height / 2 - y * scale} x1={0} x2={width} />{/each}
        <path class="reference-curve" d={original} />
        <path class="transformed-curve" d={path} />
        {#if a !== 0}<circle class="vertex" cx={width / 2 + h * scale} cy={height / 2 - k * scale} r={4.5} />{/if}
        {#each xTicks.filter(x => x !== 0 && x % 2 === 0 && Math.abs(x * scale) < width / 2 - 18) as x}
          <text class="tick-label" x={width / 2 + x * scale} y={height / 2 + 18} text-anchor="middle">{x}</text>
        {/each}
        {#each yTicks.filter(y => y !== 0 && y % 2 === 0 && Math.abs(y * scale) < height / 2 - 18) as y}
          <text class="tick-label" x={width / 2 - 10} y={height / 2 - y * scale + 4} text-anchor="end">{y}</text>
        {/each}
        <text class="tick-label" x={width / 2 - 10} y={height / 2 + 18} text-anchor="end">0</text>
        <text class="axis-name" x={width - 15} y={height / 2 - 10}>x</text>
        <text class="axis-name" x={width / 2 + 12} y={20}>y</text>
      </g>
    </svg>
    <span class="reference-key"><span aria-hidden="true"></span>y = x²</span>
  </div>
</main>

<style>
  .transformations { --a-color: #7050b0; --h-color: #176f91; --k-color: #a05224; --curve-color: #7050b0; display: flex; flex-direction: column; height: calc(100dvh - 3rem - clamp(.4rem, 1.6dvh, .8rem)); min-height: 26rem; padding: 0 clamp(.5rem, 2vw, 1.5rem) .8rem; }
  :global(.dark-mode) .transformations { --a-color: #c8b0ff; --h-color: #7ccbe8; --k-color: #f1b681; --curve-color: #c8b0ff; }
  .equation-toolbar { display: flex; align-items: center; justify-content: center; gap: .16em; font-size: clamp(1.25rem, 4.3vw, 2.6rem); padding: .65em 0 0; }
  .equation-toolbar.with-aids { padding-top: .86em; padding-bottom: 1.2em; }
  .math-part { height: 1.52em; flex: none; overflow: visible; }
  .math-part :global([data-mml-node='mo']:is([data-latex='-'], [data-latex='+'])) { fill: var(--sign-color, currentColor); }
  .settings-dialog { width: min(28rem, calc(100vw - 1.5rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 1.25rem; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); color: var(--ink); }
  .settings-dialog::backdrop { background: #0008; }
  .settings-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .settings-heading h2 { margin: 0; font-size: 1.2rem; }
  .close-settings { border: 1px solid var(--line); border-radius: .4rem; background: var(--paper); color: var(--ink); font-size: 1.5rem; padding: .15rem .65rem; }
  .aid-toggle { display: inline-flex; align-items: center; gap: .6rem; min-height: 2.5rem; padding: .3rem .5rem; border: 0; border-radius: .3rem; color: var(--muted); background: transparent; font-size: 1rem; }
  .aid-toggle:hover { background: var(--soft); }
  .switch-track { width: 1.7rem; height: 1rem; padding: .13rem; border-radius: 1rem; background: var(--line); }
  .switch-track::after { content: ''; display: block; width: .74rem; height: .74rem; border-radius: 50%; background: var(--paper); }
  .aid-toggle[aria-checked='true'] { color: var(--ink); }
  .aid-toggle[aria-checked='true'] .switch-track { background: var(--a-color); }
  .aid-toggle[aria-checked='true'] .switch-track::after { transform: translateX(.7rem); }
  .graph { position: relative; flex: 1; min-height: 0; margin-top: 1rem; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--paper); }
  .graph > svg { display: block; width: 100%; height: 100%; }
  .grid-line { stroke: var(--line); stroke-width: .6; opacity: .48; }
  .axis { stroke: var(--muted); stroke-width: 1.3; opacity: 1; }
  .reference-curve { fill: none; stroke: var(--muted); stroke-width: 2; stroke-dasharray: 6 6; opacity: .55; }
  .transformed-curve { fill: none; stroke: var(--curve-color); stroke-width: 3; stroke-linejoin: round; }
  .vertex { fill: var(--curve-color); stroke: var(--paper); stroke-width: 1.5; }
  .tick-label, .axis-name { fill: var(--muted); font-size: 12px; paint-order: stroke; stroke: var(--paper); stroke-width: 3px; }
  .axis-name { font-size: 16px; font-style: italic; }
  .reference-key { position: absolute; top: .7rem; right: .8rem; display: flex; align-items: center; gap: .4rem; font-size: .8rem; color: var(--muted); background: var(--paper); padding: .15rem .3rem; }
  .reference-key > span { width: 1.4rem; border-top: 2px dashed var(--muted); opacity: .6; }
</style>
