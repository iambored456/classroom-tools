<script lang="ts">
  import type { PassEvent, PlayVariation } from '../../types'
  import { clampTime, snapTime } from '../timelineMath'

  export let variation: PlayVariation
  export let currentTime: number
  export let selectedPassId: string | null
  export let onScrub: (time: number) => void
  export let onSelectPass: (passId: string) => void
  export let onBeginPassEdit: () => void
  export let onUpdatePass: (pass: PassEvent) => void

  let timelineElement: HTMLDivElement | null = null

  function timeToPercent(time: number): number {
    return (time / Math.max(variation.duration, 0.1)) * 100
  }

  function eventToTime(event: PointerEvent): number {
    if (!timelineElement) return 0
    const rect = timelineElement.getBoundingClientRect()
    const progress = (event.clientX - rect.left) / rect.width
    return snapTime(clampTime(progress * variation.duration, 0, variation.duration))
  }

  function startScrub(event: PointerEvent): void {
    if (!(event.target instanceof HTMLElement)) return
    if (event.target.closest('.pass-chip')) return
    event.preventDefault()
    onScrub(eventToTime(event))

    const move = (moveEvent: PointerEvent) => {
      onScrub(eventToTime(moveEvent))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function startPassDrag(event: PointerEvent, pass: PassEvent, mode: 'move' | 'left' | 'right'): void {
    event.preventDefault()
    event.stopPropagation()
    onSelectPass(pass.id)
    onBeginPassEdit()
    const startPointerTime = eventToTime(event)
    const initialStart = pass.startT
    const initialEnd = pass.endT

    const move = (moveEvent: PointerEvent) => {
      const delta = eventToTime(moveEvent) - startPointerTime
      let nextStart = initialStart
      let nextEnd = initialEnd

      if (mode === 'move') {
        const duration = initialEnd - initialStart
        nextStart = clampTime(snapTime(initialStart + delta), 0, variation.duration - duration)
        nextEnd = nextStart + duration
      } else if (mode === 'left') {
        nextStart = clampTime(snapTime(initialStart + delta), 0, initialEnd - 0.1)
      } else {
        nextEnd = clampTime(snapTime(initialEnd + delta), initialStart + 0.1, variation.duration)
      }

      onUpdatePass({ ...pass, startT: nextStart, endT: nextEnd })
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
</script>

<section class="timeline-card" aria-label="Editor timeline">
  <div class="timeline-heading">
    <strong>Timeline</strong>
    <span>{currentTime.toFixed(1)}s / {variation.duration.toFixed(1)}s</span>
  </div>
  <div
    bind:this={timelineElement}
    class="timeline-track"
    role="slider"
    tabindex="0"
    aria-label="Playhead"
    aria-valuemin="0"
    aria-valuemax={variation.duration}
    aria-valuenow={currentTime}
    on:pointerdown={startScrub}
  >
    {#each [0, 1, 2, 3, 4] as tick}
      <span class="timeline-tick" style={`left: ${timeToPercent(tick)}%;`}>
        {tick}s
      </span>
    {/each}
    <span class="playhead" style={`left: ${timeToPercent(currentTime)}%;`}></span>
    {#each variation.passes as pass (pass.id)}
      <button
        type="button"
        class="pass-chip"
        class:is-selected={selectedPassId === pass.id}
        style={`left: ${timeToPercent(pass.startT)}%; width: ${Math.max(timeToPercent(pass.endT - pass.startT), 4)}%;`}
        on:pointerdown={(event) => startPassDrag(event, pass, 'move')}
      >
        <span
          class="chip-edge left"
          role="presentation"
          on:pointerdown={(event) => startPassDrag(event, pass, 'left')}
        ></span>
        {pass.from.replace('p', '')}->{pass.to.replace('p', '')}
        <span
          class="chip-edge right"
          role="presentation"
          on:pointerdown={(event) => startPassDrag(event, pass, 'right')}
        ></span>
      </button>
    {/each}
  </div>
</section>
