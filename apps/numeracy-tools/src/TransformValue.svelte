<script lang="ts">
  import { tick } from 'svelte'
  let { name, description, value = $bindable(), min, max, step, showMagnitude = false, visualAid = false, dragAxis = 'horizontal', reverseDrag = false }: {
    name: string; description: string; value: number; min: number; max: number; step: number; showMagnitude?: boolean; visualAid?: boolean; dragAxis?: 'horizontal' | 'vertical' | 'both'; reverseDrag?: boolean
  } = $props()
  let editing = $state(false)
  let draft = $state('')
  let input = $state<HTMLInputElement>()
  let button = $state<HTMLButtonElement>()
  let editStart = 0
  let gesture: { x: number; y: number; value: number; moved: boolean } | null = null
  let suppressClick = false
  const display = $derived(String(showMagnitude ? Math.abs(value) : value).replace('-', '−'))
  const dragHint = $derived(reverseDrag ? 'Drag right to shift left or left to shift right' : dragAxis === 'vertical' ? 'Drag up to increase or down to decrease' : dragAxis === 'both' ? 'Drag right or up to increase; left or down to decrease' : 'Drag right to increase or left to decrease')
  const constrain = (next: number) => Math.max(min, Math.min(max, Math.round(next * 100) / 100))

  async function edit() {
    if (suppressClick) { suppressClick = false; return }
    editStart = value
    draft = String(value)
    editing = true
    await tick()
    input?.focus()
    input?.select()
  }
  function start(event: PointerEvent) {
    if (event.button !== 0) return
    gesture = { x: event.clientX, y: event.clientY, value, moved: false }
    suppressClick = false
    button?.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent) {
    if (!gesture) return
    const dx = event.clientX - gesture.x
    const dy = gesture.y - event.clientY
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 4) gesture.moved = true
    let delta = dx
    if (dragAxis === 'vertical') delta = dy
    if (dragAxis === 'both') delta = dx + dy
    if (reverseDrag) delta = -delta
    if (gesture.moved) value = constrain(gesture.value + Math.round(delta / 8) * step)
  }
  function finish() { suppressClick = gesture?.moved ?? false; gesture = null }
  function keys(event: KeyboardEvent) {
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 0
    if (direction) { event.preventDefault(); value = constrain(value + direction * step * (event.shiftKey ? 10 : 1)) }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); value = event.key === 'Home' ? min : max }
  }
  function typed(event: Event) {
    draft = (event.target as HTMLInputElement).value
    const next = Number(draft)
    if (draft.trim() && Number.isFinite(next) && next >= min && next <= max) value = constrain(next)
  }
  function commit() {
    if (!editing) return
    const next = Number(draft)
    if (draft.trim() && Number.isFinite(next)) value = constrain(next)
    editing = false
  }
  async function inputKey(event: KeyboardEvent) {
    if (!['Enter', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') { value = editStart; editing = false } else commit()
    await tick()
    button?.focus()
  }
</script>

<span class="parameter" class:machine={visualAid} style={`--parameter-color: var(--${name}-color)`}>
  <span class="parameter-name" aria-hidden="true">{name}</span>
  {#if editing}
    <input bind:this={input} type="number" value={draft} {min} {max} step="any" aria-label={`${name}: ${description}`} oninput={typed} onblur={commit} onkeydown={inputKey} />
  {:else}
    <button bind:this={button} type="button" role="slider" aria-label={`${name}: ${description}`} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-orientation={dragAxis === 'vertical' ? 'vertical' : 'horizontal'} style:cursor={dragAxis === 'vertical' ? 'ns-resize' : dragAxis === 'both' ? 'move' : 'ew-resize'} title={`${description}. ${dragHint}, click to type, or use arrow keys.`} onpointerdown={start} onpointermove={move} onpointerup={finish} onpointercancel={finish} onlostpointercapture={() => { gesture = null }} onkeydown={keys} onclick={edit}><span style={`font-size: ${Math.min(1, 4 / display.length)}em`}>{display}</span></button>
  {/if}
  {#if visualAid}
    <span class="machine-symbol" title={name === 'a' ? 'Positive opens upward; negative opens downward. Magnitude controls stretch and compression.' : name === 'h' ? 'Horizontal movement: subtract h inside the brackets.' : 'Vertical movement: up or down.'}>
      <svg viewBox="0 0 100 40" aria-hidden="true">
        {#if name === 'a'}
          <!-- Positive below the up arrow; negative above the down arrow. -->
          <path d="M17 23V5m-6 6 6-6 6 6M12 32h10m-5-5v10M43 6h10M48 17v19m-6-6 6 6 6-6M70 9q12 11 0 22M91 9q-12 11 0 22" />
        {:else if name === 'h'}
          <path d="M16 20h14M43 20h41m-8-8 8 8-8 8M51 12l-8 8 8 8" />
        {:else}
          <path d="M50 5v30m-8-22 8-8 8 8M42 27l8 8 8-8" />
        {/if}
      </svg>
    </span>
  {/if}
</span>

<style>
  .parameter { position: relative; display: inline-flex; width: 2.6em; flex: none; color: var(--parameter-color); }
  .parameter-name { position: absolute; bottom: calc(100% + .08em); left: 0; right: 0; text-align: center; font-size: .56em; line-height: 1; font-weight: 700; }
  .machine::before { content: ''; position: absolute; inset: -.82em -.1em -1.12em; border: 2px solid currentColor; border-radius: .18em; box-shadow: 0 .07em 0 currentColor; pointer-events: none; background: radial-gradient(circle, currentColor 0 1px, transparent 1.5px) .13em .13em / .12em .12em no-repeat, radial-gradient(circle, currentColor 0 1px, transparent 1.5px) calc(100% - .13em) .13em / .12em .12em no-repeat; }
  .machine .parameter-name { font-size: .64em; }
  .machine button, .machine input { border-radius: .08em; background: var(--soft); }
  .machine-symbol { position: absolute; top: calc(100% + .06em); left: 0; width: 100%; height: 1em; }
  .machine-symbol svg { display: block; width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  button, input { width: 100%; height: 1.55em; font: inherit; color: inherit; border: 1px solid var(--parameter-color); border-radius: .2em; background: var(--paper); padding: 0 .1em; text-align: center; font-variant-numeric: tabular-nums; }
  button { touch-action: none; user-select: none; }
  button:hover { background: var(--soft); }
  input { appearance: textfield; }
  input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { appearance: none; margin: 0; }
</style>
