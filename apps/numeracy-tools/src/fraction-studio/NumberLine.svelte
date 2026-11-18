<script lang="ts">
  import zoomInIcon from './assets/zoomIn.svg'
  import zoomOutIcon from './assets/zoomOut.svg'
  import Icon from './Icon.svelte'

  let { count, colour, onchange, onbegin }: {
    count: number; colour: { name: string; hex: string }
    onchange: (tiles: number) => void; onbegin: () => void
  } = $props()

  // Each window has ten major intervals. The 1–2–5 sequence keeps tick values readable.
  const spans = [10, 5, 2, 1, .5, .2, .1, .05, .02, .01, .005, .002, .001]
  const home = spans.indexOf(1)
  let level = $state(home), centre = $state(.5), width = $state(0)
  let plot: HTMLDivElement
  let gesture: { id: number; x: number; centre: number; marker: boolean; moved: boolean } | undefined
  let dragging = $state(false)
  const span = $derived(spans[level])
  const left = $derived(centre - span / 2)
  const value = $derived(count / 100)
  const position = $derived((value - left) / span * 100)
  const inView = $derived(position >= -1e-6 && position <= 100 + 1e-6)
  const display = (v: number) => String(Number(v.toFixed(7)))
  const ticks = $derived.by(() => {
    const step = span / 100
    // Start with a globally aligned tick so that labels stay attached to their values while panning.
    const first = Math.ceil(left / step - 1e-7)
    const labelWidth = Math.max(32, 9 * Math.max(display(left).length, display(left + span).length) + 12)
    const every = [10, 20, 50, 100].find(n => width * n / 100 >= labelWidth) ?? 100
    return Array.from({length:101}, (_, offset) => {
      const i = first + offset, number = i * step
      return { x: (number - left) / span * 100, long: i % 10 === 0, middle: i % 5 === 0,
        label: i % every === 0 ? display(number) : '' }
    }).filter(t => t.x >= -1e-6 && t.x <= 100 + 1e-6)
  })
  function zoom(delta: number, anchor = inView ? value : centre) {
    const next = Math.max(0, Math.min(spans.length - 1, level + delta))
    if (next === level) return
    // Scale the distance to the anchor so its position on the screen stays fixed.
    centre = anchor + (centre - anchor) * spans[next] / span
    level = next
  }
  function wheelZoom(node: HTMLElement) {
    let previousTime = -Infinity
    let previousDirection = 0
    let accumulated = 0
    function wheel(event: WheelEvent) {
      if (gesture || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      const direction = -Math.sign(event.deltaY)
      // Wheel notches move immediately. Group small trackpad deltas into readable steps.
      const now = event.timeStamp
      const fresh = direction !== previousDirection || now - previousTime > 180
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1
      accumulated = (fresh ? 0 : accumulated) + Math.abs(event.deltaY) * units
      previousDirection = direction
      previousTime = now
      if (!fresh && accumulated < 70) return
      accumulated = 0
      const box = plot.getBoundingClientRect()
      const x = Math.max(box.left, Math.min(box.right, event.clientX))
      zoom(direction, pointValue(x))
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return { destroy() { node.removeEventListener('wheel', wheel) } }
  }
  function reset() { level = home; centre = .5 }
  function pan(direction: number) { centre += direction * span / 4 }
  function pointValue(x: number) {
    const box = plot.getBoundingClientRect()
    return left + (x - box.left) / box.width * span
  }
  function down(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || gesture) return
    const marker = e.target instanceof Element && !!e.target.closest('.line-marker')
    gesture = {id:e.pointerId, x:e.clientX, centre, marker, moved:false}
    plot.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId) return
    const dx = e.clientX - gesture.x
    if (!gesture.moved) {
      if (Math.abs(dx) < 4) return
      gesture.moved = true
      dragging = true
      if (gesture.marker) onbegin()
    }
    if (gesture.marker) onchange(Math.max(0, Math.min(100, Math.round(pointValue(e.clientX) * 100))))
    else centre = gesture.centre - dx / plot.getBoundingClientRect().width * span
  }
  function up(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId) return
    if (!gesture.moved && e.pointerType === 'mouse') {
      zoom(e.shiftKey ? -1 : 1, pointValue(e.clientX))
    } else if (!gesture.moved && !gesture.marker) {
      const picked = pointValue(e.clientX)
      if (picked >= 0 && picked <= 1 && Math.round(picked * 100) !== count) {
        onbegin()
        onchange(Math.round(picked * 100))
      }
    }
    finish()
  }
  function finish() { gesture = undefined; dragging = false }
  function adjust(e: KeyboardEvent) {
    let next = count
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': next--; break
      case 'ArrowRight': case 'ArrowUp': next++; break
      case 'Home': next = 0; break
      case 'End': next = 100; break
      default: return
    }
    e.preventDefault()
    next = Math.max(0, Math.min(100, next))
    if (next !== count) { onbegin(); onchange(next) }
    if (next / 100 < left || next / 100 > left + span) centre = next / 100
  }
</script>

<div class="ruler" role="group" aria-label="Number line">
  <div class="ruler-head">
    <strong>Number line</strong>
    <div class="ruler-controls">
      <button aria-label="Reset number line" title="Show 0 to 1" onclick={reset}>0–1</button>
      <button aria-label="Zoom out" title="Zoom out" disabled={level === 0} onclick={() => zoom(-1)}><i style={'mask-image:url(' + zoomOutIcon + ')'}></i></button>
      <button aria-label="Zoom in" title="Zoom in" disabled={level === spans.length - 1} onclick={() => zoom(1)}><i style={'mask-image:url(' + zoomInIcon + ')'}></i></button>
    </div>
  </div>
  <div class="ruler-track" use:wheelZoom>
    <button class="ruler-end left" aria-label="Pan left" title="Pan left" onclick={() => pan(-1)}><Icon name="arrow"/></button>
    <div class="ruler-window" title="Click to zoom in, Shift-click to zoom out, or drag to pan" role="group" aria-label={'Visible range ' + display(left) + ' to ' + display(left + span)}
      bind:this={plot} bind:clientWidth={width} class:dragging
      onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={finish} onlostpointercapture={finish}>
      <div class="ruler-axis"></div>
      {#each ticks as tick}
        <i class="ruler-tick" class:long={tick.long} class:middle={tick.middle} style:left={tick.x + '%'} aria-hidden="true"></i>
        {#if tick.label}
          <span class="ruler-label" style:left={tick.x + '%'}>{tick.label}</span>
        {/if}
      {/each}
      {#if inView}
        <div class="line-marker" role="slider" tabindex="0" aria-label={colour.name + ' board amount'}
          aria-valuemin="0" aria-valuemax="1" aria-valuenow={value} aria-valuetext={display(value)}
          onkeydown={adjust} style:left={position + '%'} style:--marker-colour={colour.hex}
          title={'Drag to change ' + colour.name.toLowerCase() + ' tiles'}>
          <span>{display(value)}</span>
        </div>
      {/if}
    </div>
    <button class="ruler-end" aria-label="Pan right" title="Pan right" onclick={() => pan(1)}><Icon name="arrow"/></button>
  </div>
</div>

<style>
  .ruler { margin:1rem 0 .85rem; }
  .ruler-head,.ruler-controls,.ruler-track { display:flex; align-items:center; }
  .ruler-head { justify-content:space-between; gap:.5rem; }
  .ruler-head strong { font-size:.94rem; }
  .ruler-controls { gap:.25rem; }
  .ruler button { display:grid; place-items:center; min-width:2.25rem; height:2.25rem; padding:.25rem; border-radius:.5rem; color:var(--text); border:1px solid var(--border); background:var(--surface); font-size:.85rem; font-weight:700; }
  .ruler-controls i { width:1.12rem; height:1.12rem; background:currentColor; mask-size:contain; mask-position:center; mask-repeat:no-repeat; }
  .ruler-track { padding:.3rem 0 .1rem; position:relative; }
  .ruler button.ruler-end { background:transparent; border:0; min-width:2.4rem; align-self:center; }
  .ruler-end.left :global(svg) { transform:rotate(180deg); }
  .ruler-window { flex:1; position:relative; height:5.1rem; min-width:0; touch-action:pan-y; cursor:grab; user-select:none; }
  .ruler-window.dragging,.ruler-window.dragging .line-marker { cursor:grabbing; }
  .ruler-axis,.ruler-tick { position:absolute; top:50%; background:var(--sub); pointer-events:none; }
  .ruler-axis { height:2px; left:-.4rem; right:-.4rem; }
  .ruler-tick { width:1px; height:.22rem; }.ruler-tick.middle { height:.35rem; }.ruler-tick.long { height:.55rem; }
  .ruler-label { position:absolute; top:calc(50% + .67rem); transform:translateX(-50%); font-size:.72rem; color:var(--sub); pointer-events:none; }
  .line-marker { position:absolute; top:calc(50% + 1px); transform:translate(-50%,-100%); min-width:1.6rem; height:2.1rem; display:grid; place-items:start center; color:#152922; cursor:ew-resize; }
  .line-marker span { padding:.08rem .3rem; background:var(--marker-colour); font-size:.82rem; font-weight:700; border-radius:.3rem; }
  .line-marker::after { content:''; position:absolute; bottom:0; border:.32rem solid transparent; border-top:.52rem solid var(--marker-colour); border-bottom:0; }
  .line-marker:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
</style>
