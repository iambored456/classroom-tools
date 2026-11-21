<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import zoomInIcon from './assets/zoomIn.svg'
  import zoomOutIcon from './assets/zoomOut.svg'
  import Icon from '../fraction-studio/Icon.svelte'
  import { clamp, decimalPlaces, display, formatTick, snap, spans, wheelSpans, zoomStep, type LabelStyle } from './scale'

  let {
    value, colour, onchange, onbegin, bar = false, markerLabel, showNumbers = true,
    showTicks = true, labelStyle = 'decimal', markerEditable = true, onpick, onmove,
  }: {
    value: number | null; colour: { name: string; hex: string }
    onchange: (value: number) => void; onbegin?: () => void
    bar?: boolean; markerLabel?: string; showNumbers?: boolean; showTicks?: boolean
    labelStyle?: LabelStyle; markerEditable?: boolean
    onpick?: (value: number, unitsPerPixel: number) => void
    onmove?: () => void
  } = $props()

  const homeSpan = $derived(bar ? 1 : 15)
  const homeCentre = $derived(bar ? .5 : 2.5)
  const narrowest = spans[spans.length - 1]
  let span = $state(untrack(() => homeSpan))
  let centre = $state(untrack(() => homeCentre))
  let zoomTarget = $state<number | undefined>()
  let zoomFrame = 0
  let width = $state(0)
  let digitWidth = $state(14)
  let plot: HTMLDivElement
  type Gesture = {
    id: number; x: number; y: number; centre: number; marker: boolean; moved: boolean; zoomed: boolean
  }
  let gesture: Gesture | undefined
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let holdFrame = 0
  let dragging = $state(false)

  const left = $derived(centre - span / 2)
  const position = $derived(value === null ? -1 : (value - left) / span * 100)
  const fillStart = $derived(clamp(-left / span * 100, 0, 100))
  const fillWidth = $derived(clamp(position, 0, 100) - fillStart)
  const inView = $derived(value !== null && position >= -1e-6 && position <= 100 + 1e-6)
  const markerBounds = $derived(bar ? [0, 1] : [left, left + span])
  const markerText = $derived(value === null ? '' : display(value))
  const viewLabel = $derived('Visible range ' + display(left) + ' to ' + display(left + span))

  const step = $derived.by(() => {
    if (bar || span === 15) return span / (span === 15 ? 150 : 100)
    // Keep the grid on familiar 1, 2, and 5 multiples while the view zooms smoothly.
    const ideal = span / 100
    const decade = 10 ** Math.floor(Math.log10(ideal * (1 + 1e-9)))
    return ideal >= 5 * decade ? 5 * decade : ideal >= 2 * decade ? 2 * decade : decade
  })
  const scale = $derived.by(() => {
    const first = Math.floor(left / step)
    const marks = Array.from({ length: Math.ceil(span / step) + 2 }, (_, offset) => {
      const i = first + offset
      const x = (i * step - left) / span * 100
      return { i, x, value: snap(i * step, step), long: i % 10 === 0, middle: i % 5 === 0 }
    }).filter(t => t.x >= -1e-6 && t.x <= 100 + 1e-6)

    const strides = span === 15 ? [10, 50, 100, 200] : [10, 20, 50, 100, 200, 500]
    const labelFor = (i: number, stride: number) => bar
      ? display(i * step)
      : formatTick(i * step, decimalPlaces(stride * step), labelStyle)
    const stride = strides.find(n => {
      let lastRight = -Infinity
      for (const mark of marks) {
        if (mark.i % n !== 0) continue
        const textWidth = labelFor(mark.i, n).length * (digitWidth + 1)
        const start = clamp(width * mark.x / 100 - textWidth / 2, 0, Math.max(0, width - textWidth))
        if (start < lastRight + 8) return false
        lastRight = start + textWidth
      }
      return true
    }) ?? strides[strides.length - 1]
    const fallback = marks.some(mark => mark.i % stride === 0)
      ? undefined
      : marks.filter(mark => mark.long).reduce<typeof marks[number] | undefined>((nearest, mark) =>
        !nearest || Math.abs(mark.x - 50) < Math.abs(nearest.x - 50) ? mark : nearest, undefined)
    return {
      ticks: marks.map(mark => ({
        ...mark, zero: !bar && mark.i === 0,
        label: mark.i % stride === 0 ? labelFor(mark.i, stride) : mark === fallback ? labelFor(mark.i, 10) : '',
      })),
      labelStep: stride * step,
    }
  })
  const spacing = $derived(formatTick(scale.labelStep, decimalPlaces(scale.labelStep), labelStyle))

  function setZoom(next: number, anchor: number) {
    if (next === span) return false
    // Keep the point under the pointer in the same place as the scale changes.
    centre = anchor + (centre - anchor) * next / span
    span = next
    return true
  }
  function fadeZoomLabel(node: Element) {
    const zooming = zoomTarget !== undefined || gesture?.zoomed
    return fade(node, { duration: zooming && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 0 })
  }

  function stopZoom() {
    cancelAnimationFrame(zoomFrame)
    zoomTarget = undefined
  }
  function zoom(direction: number, anchor = inView && value !== null ? value : centre, countMove = true, levels = spans) {
    const from = zoomTarget ?? span
    const next = zoomStep(from, direction, narrowest, levels)
    if (next === from) return
    stopZoom()
    if (countMove) onmove?.()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setZoom(next, anchor)
      return
    }

    const start = span
    const started = performance.now()
    zoomTarget = next
    function animate(now: number) {
      const progress = clamp((now - started) / 180, 0, 1)
      if (progress === 1) {
        setZoom(next, anchor)
        zoomFrame = requestAnimationFrame(() => { zoomTarget = undefined })
        return
      }
      const eased = 1 - (1 - progress) ** 3
      setZoom(start * (next / start) ** eased, anchor)
      zoomFrame = requestAnimationFrame(animate)
    }
    zoomFrame = requestAnimationFrame(animate)
  }
  function reset() {
    stopZoom()
    if (span !== homeSpan || centre !== homeCentre) onmove?.()
    span = homeSpan
    centre = homeCentre
  }
  function pan(direction: number, countMove = true) {
    stopZoom()
    centre += direction * span / 4
    if (countMove) onmove?.()
  }
  function pointValue(x: number) {
    const box = plot.getBoundingClientRect()
    return left + (x - box.left) / box.width * span
  }
  function wheelZoom(node: HTMLElement) {
    if (bar) return
    let previousTime = -Infinity
    let previousDirection = 0
    let accumulated = 0
    function wheel(event: WheelEvent) {
      if (gesture || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      const direction = -Math.sign(event.deltaY)
      const now = event.timeStamp
      const fresh = direction !== previousDirection || now - previousTime > 180
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1
      accumulated = (fresh ? 0 : accumulated) + Math.abs(event.deltaY) * units
      previousDirection = direction
      previousTime = now
      if (!fresh && accumulated < 70) return
      accumulated = 0
      const box = plot.getBoundingClientRect()
      zoom(direction, pointValue(clamp(event.clientX, box.left, box.right)), true, wheelSpans)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return { destroy() { node.removeEventListener('wheel', wheel) } }
  }

  function stopHold() {
    clearTimeout(holdTimer)
    cancelAnimationFrame(holdFrame)
    holdTimer = undefined
    holdFrame = 0
  }
  function holdZoom(drag: Gesture, direction: number) {
    stopZoom()
    const anchor = pointValue(drag.x)
    let previousTime = performance.now()
    function animate(now: number) {
      if (now <= previousTime) { holdFrame = requestAnimationFrame(animate); return }
      if (gesture !== drag || drag.moved) return
      const next = clamp(span * 2 ** (-direction * Math.min(40, now - previousTime) / 350), narrowest, spans[0])
      previousTime = now
      if (!setZoom(next, anchor)) return
      if (!drag.zoomed) onmove?.()
      drag.zoomed = true
      holdFrame = requestAnimationFrame(animate)
    }
    holdFrame = requestAnimationFrame(animate)
  }
  function down(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || gesture) return
    const marker = markerEditable && e.target instanceof Element && !!e.target.closest('.line-marker')
    const drag = {id:e.pointerId, x:e.clientX, y:e.clientY, centre, marker, moved:false, zoomed:false}
    gesture = drag
    if (!bar && !marker) plot.focus({ preventScroll: true })
    plot.setPointerCapture(e.pointerId)
    if (!bar && !marker && !onpick) holdTimer = setTimeout(() => holdZoom(drag, e.shiftKey ? -1 : 1), 275)
  }
  function markerAt(point: number) {
    if (bar) return snap(clamp(point, 0, 1), .01)
    const first = Math.ceil(left / step - 1e-7) * step
    const last = Math.floor((left + span) / step + 1e-7) * step
    return snap(clamp(point, first, last), step)
  }
  function move(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId || gesture.zoomed) return
    const dx = e.clientX - gesture.x
    if (!gesture.moved) {
      if (Math.abs(e.clientY - gesture.y) >= 4) stopHold()
      if (Math.abs(dx) < 4) return
      stopHold()
      stopZoom()
      gesture.centre = centre
      gesture.moved = true
      dragging = !bar || gesture.marker
      if (gesture.marker) onbegin?.()
      else if (!bar) onmove?.()
    }
    if (gesture.marker) {
      const box = plot.getBoundingClientRect()
      onchange(markerAt(pointValue(clamp(e.clientX, box.left, box.right))))
    } else if (!bar) {
      centre = gesture.centre - dx / plot.getBoundingClientRect().width * span
    }
  }
  function up(e: PointerEvent) {
    if (!gesture || gesture.id !== e.pointerId) return
    if (!gesture.moved && !gesture.zoomed) {
      const picked = pointValue(e.clientX)
      if (!bar && onpick && !gesture.marker) onpick(markerEditable ? markerAt(picked) : picked, span / width)
      else if (!bar) zoom(e.shiftKey ? -1 : 1, picked)
      else if (!gesture.marker && picked >= 0 && picked <= 1 && markerAt(picked) !== value) {
        onbegin?.()
        onchange(markerAt(picked))
      }
    }
    finish()
  }
  function finish() {
    stopHold()
    gesture = undefined
    dragging = false
  }
  onDestroy(() => { finish(); stopZoom() })

  export function focusLine() { plot.focus() }

  function navigate(e: KeyboardEvent) {
    if (bar || e.target !== plot || e.altKey || e.ctrlKey || e.metaKey) return
    switch (e.key) {
      case 'ArrowUp': zoom(1, centre, !e.repeat); break
      case 'ArrowDown': zoom(-1, centre, !e.repeat); break
      case 'ArrowLeft': pan(-1, !e.repeat); break
      case 'ArrowRight': pan(1, !e.repeat); break
      case 'Home': reset(); break
      case 'Enter': case ' ':
        if (!onpick || e.repeat) return
        onpick(markerEditable ? markerAt(centre) : centre, span / width)
        break
      default: return
    }
    e.preventDefault()
  }
  function adjust(e: KeyboardEvent) {
    if (value === null) return
    let next = value
    const increment = bar ? .01 : step
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': next -= increment; break
      case 'ArrowRight': case 'ArrowUp': next += increment; break
      case 'Home': next = markerBounds[0]; break
      case 'End': next = markerBounds[1]; break
      default: return
    }
    e.preventDefault()
    stopZoom()
    const [min, max] = markerBounds
    next = clamp(snap(next, increment), min, max)
    if (next !== value) { onbegin?.(); onchange(next) }
    if (next < left || next > left + span) centre = next
  }
</script>

<div class="ruler" class:fixed-range={bar} role="group" aria-label="Number line">
  {#if !bar}
    <div class="ruler-controls">
      {#if showNumbers}<span class="spacing">Label spacing <strong>{spacing}</strong></span>{/if}
      <button aria-label="Reset number line" title="Reset to −5 to 10" onclick={reset}>−5 to 10</button>
      <button aria-label="Zoom out" title="Zoom out" disabled={(zoomTarget ?? span) >= spans[0]} onclick={() => zoom(-1)}><i style={'mask-image:url(' + zoomOutIcon + ')'}></i></button>
      <button aria-label="Zoom in" title="Zoom in" disabled={(zoomTarget ?? span) <= narrowest} onclick={() => zoom(1)}><i style={'mask-image:url(' + zoomInIcon + ')'}></i></button>
    </div>
  {/if}
  <div class="ruler-track" use:wheelZoom>
    {#if !bar}<button class="ruler-end left" aria-label="Pan left" title="Pan left" onclick={() => pan(-1)}><Icon name="arrow"/></button>{/if}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The labelled plot is a keyboard pan and zoom surface containing a separate marker control.) -->
    <div class="ruler-window" title={bar || onpick ? 'Select a point on the line' : 'Click to zoom in, Shift-click to zoom out, or drag to pan'}
      role="group" tabindex={bar ? undefined : 0} aria-label={viewLabel}
      aria-keyshortcuts={bar ? undefined : 'ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter'}
      onkeydown={navigate}
      bind:this={plot} bind:clientWidth={width} class:dragging class:bar class:picking={!!onpick} style:--marker-colour={colour.hex}
      style:--marker-x={width * position / 100 + 'px'} style:--marker-room={width * (1 - position / 100) + 'px'}
      style:--marker-size={Math.max(1, width - 10) * 1.55 / Math.max(1, markerText.length) + 'px'}
      onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={finish} onlostpointercapture={finish}>
      <span class="digit-probe" aria-hidden="true" bind:clientWidth={digitWidth}>0</span>
      <div class="ruler-axis"></div>
      {#if bar && fillWidth > 0}
        <div class="ruler-fill" aria-hidden="true" style:left={fillStart + '%'} style:width={fillWidth + '%'}></div>
      {/if}
      {#each scale.ticks as tick (tick.value)}
        {#if showTicks}<i class="ruler-tick" class:long={tick.long} class:middle={tick.middle} class:zero={tick.zero} style:left={tick.x + '%'} aria-hidden="true"></i>{/if}
      {/each}
      {#if showNumbers}
        {#each scale.ticks.filter(tick => tick.label) as tick (tick.value)}
          <span class="ruler-label" class:zero={tick.zero} style:left={tick.x + '%'} style:--x={width * tick.x / 100 + 'px'} style:--room={width * (1 - tick.x / 100) + 'px'} transition:fadeZoomLabel>{tick.label}</span>
        {/each}
      {/if}
      {#if onpick}<i class="centre-guide" aria-hidden="true"></i>{/if}
      {#if inView && value !== null && markerEditable}
        <div class="line-marker" role="slider" tabindex="0" aria-label={markerLabel ?? colour.name + ' board amount'}
          aria-valuemin={markerBounds[0]} aria-valuemax={markerBounds[1]} aria-valuenow={value} aria-valuetext={markerText}
          onkeydown={adjust} style:left={position + '%'}
          title="Drag to change the value">
          <span>{markerText}</span>
        </div>
      {:else if inView && value !== null}
        <div class="line-marker fixed" style:left={position + '%'} aria-hidden="true"><span>{markerText}</span></div>
      {/if}
    </div>
    {#if !bar}<button class="ruler-end" aria-label="Pan right" title="Pan right" onclick={() => pan(1)}><Icon name="arrow"/></button>{/if}
  </div>
</div>

<style>
  .ruler { margin:1rem 0 .85rem; }
  .ruler-controls,.ruler-track { display:flex; align-items:center; }
  .ruler-controls { justify-content:flex-end; flex-wrap:wrap; gap:.3rem; }
  .spacing { margin-inline-end:auto; color:var(--sub); font-size:.9rem; }
  .spacing strong { color:var(--text); margin-inline-start:.2em; }
  .ruler button { display:grid; place-items:center; min-width:2.25rem; height:2.25rem; padding:.12rem .4rem; border-radius:.5rem; color:var(--text); border:1px solid var(--border); background:var(--surface); font-size:clamp(1.05rem,3.4cqi,1.5rem); font-weight:700; }
  .ruler-controls i { width:1.12rem; height:1.12rem; background:currentColor; mask-size:contain; mask-position:center; mask-repeat:no-repeat; }
  .ruler-track { padding:.3rem 0 .1rem; position:relative; }
  .ruler.fixed-range { margin-top:0; }
  .fixed-range .ruler-track { padding-top:0; padding-inline:.45rem; }
  .ruler button.ruler-end { background:transparent; border:0; min-width:2.4rem; align-self:center; }
  .ruler-end.left :global(svg) { transform:rotate(180deg); }
  .ruler-window { flex:1; position:relative; height:clamp(5.5rem,18cqi,7.6rem); min-width:0; touch-action:pan-y; cursor:grab; user-select:none; }
  .ruler-window.dragging,.ruler-window.dragging .line-marker { cursor:grabbing; }
  .ruler-window:focus-visible { outline:2px solid var(--brand); outline-offset:3px; border-radius:.3rem; }
  .ruler-window.picking,.ruler-window.bar { cursor:crosshair; }
  .centre-guide { position:absolute; left:50%; top:33%; height:21%; border-left:2px dashed var(--brand); pointer-events:none; }
  .ruler-axis,.ruler-tick { position:absolute; top:50%; background:var(--sub); pointer-events:none; }
  .ruler-axis { height:2px; left:-.4rem; right:-.4rem; }
  .ruler-fill { position:absolute; top:50%; height:.6rem; transform:translateY(-50%); background:var(--marker-colour); pointer-events:none; }
  .ruler-tick { width:1px; height:.22rem; }.ruler-tick.middle { height:.35rem; }.ruler-tick.long { height:.55rem; }
  .ruler-label,.digit-probe { position:absolute; font-size:clamp(1.1rem,3.6cqi,1.85rem); font-weight:700; line-height:1.1; font-variant-numeric:tabular-nums; pointer-events:none; }
  .digit-probe { visibility:hidden; }
  .ruler-label { top:calc(50% + .67rem); transform:translateX(clamp(calc(0px - var(--x)), -50%, calc(var(--room) - 100%))); color:var(--text); }
  .ruler-tick.zero { background:var(--brand); height:.75rem; width:2px; }
  .ruler-label.zero { color:var(--brand); }
  .line-marker { position:absolute; top:calc(50% + 1px); transform:translateY(-100%); width:0; padding-bottom:.5rem; display:grid; grid-template-columns:minmax(0,1fr); justify-items:start; color:#152922; cursor:ew-resize; }
  .line-marker span {
    display:block; width:max-content; font-size:min(clamp(1.35rem,4.6cqi,2.25rem),var(--marker-size));
    transform:translateX(clamp(calc(0px - var(--marker-x)), -50%, calc(var(--marker-room) - 100%)));
  }
  .line-marker::after { left:0; transform:translateX(-50%); }
  .line-marker.fixed { pointer-events:none; }
  .bar .line-marker { top:calc(50% - .3rem); }
  .line-marker span { padding:.08rem .3rem; background:var(--marker-colour); font-size:clamp(1.35rem,4.6cqi,2.25rem); line-height:1.05; font-weight:700; border-radius:.3rem; }
  .line-marker::after { content:''; position:absolute; bottom:0; border:.32rem solid transparent; border-top:.52rem solid var(--marker-colour); border-bottom:0; }
  .line-marker:focus-visible span { outline:2px solid var(--brand); outline-offset:2px; }
  .line-marker:focus-visible { outline:none; }
</style>
