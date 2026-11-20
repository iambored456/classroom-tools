<script lang="ts">
  import { colours } from './math'
  let { board, paint = 1, editable = true, onpaint }: {
    board: number[]; paint?: number; editable?: boolean
    onpaint?: (index: number, colour: number) => void
  } = $props()
  let grid: HTMLDivElement
  let activePointer: number | null = null
  let brush = 1
  let last = -1
  let focus = $state(0)
  function indexAt(e: PointerEvent) {
    const r = grid.getBoundingClientRect()
    const x = Math.floor((e.clientX - r.left) / r.width * 10)
    const y = Math.floor((e.clientY - r.top) / r.height * 10)
    return x >= 0 && x < 10 && y >= 0 && y < 10 ? y * 10 + x : -1
  }
  function move(e: PointerEvent) {
    if (activePointer !== e.pointerId) return
    const end = indexAt(e)
    if (end < 0) { last = -1; return }
    // Interpolate crossed cells when a quick stroke skips pointer events.
    const start = last < 0 ? end : last
    const dx = end % 10 - start % 10, dy = Math.floor(end / 10) - Math.floor(start / 10)
    const steps = Math.max(1, Math.abs(dx), Math.abs(dy))
    for (let i = 1; i <= steps; i++) {
      onpaint?.((Math.floor(start / 10) + Math.round(dy * i / steps)) * 10 + start % 10 + Math.round(dx * i / steps), brush)
    }
    last = end
  }
  function down(e: PointerEvent) {
    if (!editable || !e.isPrimary || e.button !== 0) return
    const index = indexAt(e)
    if (index < 0) return
    e.preventDefault()
    activePointer = e.pointerId
    brush = board[index] === paint ? 0 : paint
    last = -1
    focus = index
    grid.setPointerCapture(e.pointerId)
    move(e)
  }
  function keyboard(e: KeyboardEvent) {
    const change: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -10, ArrowDown: 10 }
    if (!(e.key in change)) return
    e.preventDefault()
    focus = Math.max(0, Math.min(99, focus + change[e.key]))
    grid.querySelectorAll('button')[focus]?.focus()
  }
</script>
<div class="tile-board" class:editable bind:this={grid} role="group" aria-label={editable ? 'Hundred-square board' : 'Hundred-square board, ' + board.filter(Boolean).length + ' of 100 tiles shaded'} onpointerdown={down} onpointermove={move} onlostpointercapture={() => activePointer = null}>
  {#each board as tile, i}
    {#if editable}
      <button class={'tile t' + tile} tabindex={focus === i ? 0 : -1} aria-label={'Row ' + (Math.floor(i / 10) + 1) + ', column ' + (i % 10 + 1) + ', ' + colours[tile].name}
        onfocus={() => focus = i} onkeydown={keyboard} onclick={(e) => { if (e.detail === 0) { onpaint?.(i, board[i] === paint ? 0 : paint) } }}></button>
    {:else}
      <span class={'tile t' + tile}></span>
    {/if}
  {/each}
</div>
