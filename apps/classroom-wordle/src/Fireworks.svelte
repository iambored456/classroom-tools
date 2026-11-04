<script lang="ts">
  import { onMount } from 'svelte'

  export let scope: 'screen' | 'board' = 'screen'
  export let animated = true
  let canvas: HTMLCanvasElement
  let refresh = () => {}
  $: { scope; animated; refresh() }

  const screenBursts = [
    [12, 26, '#ffd568', 0], [33, 14, '#76dcff', 450],
    [78, 26, '#ff8fc8', 900], [91, 55, '#b3a0ff', 1350],
    [23, 74, '#87efb4', 1800], [70, 79, '#ffd568', 2250],
  ] as const
  const boardBursts = [
    [26, 22, '#76dcff', 200], [70, 35, '#ffd568', 800],
    [48, 62, '#ff8fc8', 1400], [76, 82, '#87efb4', 2000],
  ] as const

  onMount(() => {
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    let width = 0
    let height = 0
    let elapsed = 800 // Show a burst immediately, without a blank opening delay.
    let previousTime: number | null = null

    const draw = () => {
      context.clearRect(0, 0, width, height)
      const radius = scope === 'board'
        ? Math.max(48, Math.min(width * 0.25, 112))
        : Math.max(80, Math.min(width * 0.15, 160))
      for (const [x, y, color, delay] of scope === 'board' ? boardBursts : screenBursts) {
        const phase = animated ? ((elapsed - delay + 3600) % 3600) / 3600 : 0.4
        const centerX = width * x / 100
        const centerY = height * y / 100
        context.fillStyle = color
        context.strokeStyle = color
        context.shadowColor = color
        context.shadowBlur = 7
        if (phase < 0.16) {
          const launch = phase / 0.16
          context.globalAlpha = Math.sin(launch * Math.PI)
          context.lineWidth = 3
          context.beginPath()
          context.moveTo(centerX, centerY + (1 - launch) * radius)
          context.lineTo(centerX, centerY + (1 - launch) * radius + 24)
          context.stroke()
        } else if (phase < 0.76) {
          const age = (phase - 0.16) / 0.6
          const spread = 1 - Math.pow(1 - age, 3)
          context.globalAlpha = Math.min(1, (1 - age) * 2.5)
          for (let index = 0; index < 40; index++) {
            const angle = index / 40 * Math.PI * 2
            const distance = radius * spread * (index % 2 === 0 ? 1 : 0.65)
            context.beginPath()
            context.arc(
              centerX + Math.cos(angle) * distance,
              centerY + Math.sin(angle) * distance + age * age * 28,
              Math.max(1, 3 * (1 - age * 0.65)), 0, Math.PI * 2,
            )
            context.fill()
          }
        }
      }
      context.globalAlpha = 1
      context.shadowBlur = 0
    }

    // Canvas drawing does not depend on CSS animations or reduced-motion rules.
    const tick = (time: number) => {
      frame = 0
      if (document.hidden || !animated) return
      if (previousTime !== null) elapsed += Math.min(time - previousTime, 64)
      previousTime = time
      draw()
      frame = requestAnimationFrame(tick)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = null
      draw()
      if (animated && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      context.setTransform(scale, 0, 0, scale, 0, 0)
      update()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', update)
    refresh = update
    resize()
    return () => {
      refresh = () => {}
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', update)
    }
  })
</script>

<div class={scope === 'board' ? 'board-fireworks' : 'success-fireworks'} aria-hidden="true">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .success-fireworks,
  .board-fireworks {
    position: fixed;
    inset: 0;
    z-index: 8;
    overflow: hidden;
    background: transparent;
    pointer-events: none;
  }
  .board-fireworks { position: absolute; inset: -1rem; z-index: 9; }
  canvas { display: block; width: 100%; height: 100%; pointer-events: none; }
</style>
