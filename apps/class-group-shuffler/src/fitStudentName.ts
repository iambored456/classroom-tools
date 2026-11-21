import type { Action } from 'svelte/action'

export const fitStudentName: Action<HTMLSpanElement, string | undefined> = (label) => {
  let availableHeight = 0
  let frame = 0

  function fit() {
    if (availableHeight <= 0 || label.clientWidth === 0) return

    // Use the browser's line wrapping to find the largest size, in half-pixel steps.
    let low = 1
    let high = Math.floor(availableHeight * 2) + 1
    while (high - low > 1) {
      const size = Math.floor((low + high) / 2)
      label.style.fontSize = `${size / 2}px`
      if (label.scrollHeight <= availableHeight && label.scrollWidth <= label.clientWidth) low = size
      else high = size
    }
    label.style.fontSize = `${low / 2}px`
  }

  const observer = new ResizeObserver(([entry]) => {
    availableHeight = Math.floor(entry.contentRect.height)
    fit()
  })
  observer.observe(label.parentElement!)

  return {
    update() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    },
    destroy() {
      cancelAnimationFrame(frame)
      observer.disconnect()
    },
  }
}
