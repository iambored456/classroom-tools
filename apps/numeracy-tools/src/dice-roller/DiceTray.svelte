<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { arrange, drawTray, throwDuration } from './tray'
  import { dieCaption, faceLabel, physicalDice, type Roll } from './roll'

  let { record, moving, settle }: { record: Roll | null; moving: boolean; settle: (id: number) => void } = $props()
  let board: HTMLDivElement, canvas: HTMLCanvasElement
  let context = $state.raw<CanvasRenderingContext2D | null>(null)
  let width = $state(0), height = $state(0)
  let dice = $derived(record ? physicalDice(record) : [])
  let compact = $derived(!context || (dice.length > 0 && arrange(width, height, dice.length).radius < 23))
  let start = 0, lastId = -1

  onMount(() => {
    function connect() {
      try { context = canvas.getContext('2d') } catch { context = null }
    }
    function measure() {
      width = board.clientWidth
      height = board.clientHeight
    }
    function lost(event: Event) { event.preventDefault(); context = null }
    connect()
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(board)
    canvas.addEventListener('contextlost', lost)
    canvas.addEventListener('contextrestored', connect)
    return () => {
      observer.disconnect()
      canvas.removeEventListener('contextlost', lost)
      canvas.removeEventListener('contextrestored', connect)
    }
  })

  $effect(() => {
    const roll = record, ctx = context, w = width, h = height, pieces = dice, animate = moving
    if (!roll || !w || !h) return
    if (compact || !ctx) {
      if (animate) untrack(() => settle(roll.id))
      return
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * pixelRatio)
    canvas.height = Math.round(h * pixelRatio)
    if (roll.id !== lastId) { lastId = roll.id; start = performance.now() }
    let frame = 0
    function paint(now: number) {
      if (!ctx || !roll) return
      const t = animate ? Math.min(1, (now-start)/throwDuration) : 1
      try {
        ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0)
        drawTray(ctx, w, h, pieces, roll.id, t)
      } catch {
        context = null
        settle(roll.id)
        return
      }
      if (t < 1) frame = requestAnimationFrame(paint)
      else if (animate) settle(roll.id)
    }
    untrack(() => paint(performance.now()))
    return () => cancelAnimationFrame(frame)
  })
</script>

<div class="felt" class:compact={record && compact}>
  <div class="board" bind:this={board}>
    <canvas bind:this={canvas} hidden={!record || compact} aria-hidden="true"></canvas>
    {#if !record}
      <div class="empty-tray">
        <svg viewBox="0 0 52 52" width="48" height="48" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"><path d="m26 3 20 11v24L26 49 6 38V14Z M6 14l20 12 20-12 M26 26v23" /></g>
          <g fill="currentColor"><ellipse cx="26" cy="15" rx="2.6" ry="1.6"/><ellipse cx="13" cy="25" rx="1.5" ry="2.3"/><ellipse cx="20" cy="36" rx="1.5" ry="2.3"/><ellipse cx="33" cy="35" rx="1.5" ry="2.3"/><ellipse cx="39" cy="25" rx="1.5" ry="2.3"/></g>
        </svg>
        <strong>Your tray is empty</strong><span>Choose dice, then roll.</span>
      </div>
    {/if}
  </div>
  {#if record && compact}
      <div class="static-faces">
        {#each dice as die}
          <span><b>{faceLabel(die)}</b><small>{dieCaption(die)}</small></span>
        {/each}
      </div>
  {/if}
</div>
