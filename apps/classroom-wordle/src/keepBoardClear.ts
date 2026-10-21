import type { Action } from 'svelte/action'

export const keepBoardClear: Action<HTMLElement, boolean> = (area, complete) => {
  const controls = area.closest('.game-screen')?.querySelector<HTMLElement>('.game-controls')
  const grid = area.querySelector<HTMLElement>('.word-grid')
  let frame = 0

  const measure = () => {
    frame = 0
    if (!complete || !controls || !grid) {
      area.style.paddingLeft = '0px'
      return
    }

    // Check the centered layout, independent of any clearance already applied.
    // Restore the current position before animating to the new target.
    const currentPadding = getComputedStyle(area).paddingLeft
    area.classList.add('measuring-board')
    area.style.paddingLeft = '0px'
    const naturalGrid = grid.getBoundingClientRect()
    const controlBounds = controls.getBoundingClientRect()
    const areaBounds = area.getBoundingClientRect()
    const gap = 16
    const overlaps =
      naturalGrid.left < controlBounds.right + gap &&
      naturalGrid.right > controlBounds.left - gap &&
      naturalGrid.top < controlBounds.bottom + gap &&
      naturalGrid.bottom > controlBounds.top - gap
    const clearance = overlaps ? Math.max(0, controlBounds.right + gap - areaBounds.left) : 0
    area.style.paddingLeft = currentPadding
    area.getBoundingClientRect()
    area.classList.remove('measuring-board')
    area.style.paddingLeft = `${clearance}px`
  }

  const schedule = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  // Watch stable outer dimensions so the animated padding cannot retrigger itself.
  const observer = new ResizeObserver(schedule)
  if (area.parentElement) observer.observe(area.parentElement)
  if (controls) observer.observe(controls)
  schedule()

  return {
    update(nextComplete) {
      complete = nextComplete
      schedule()
    },
    destroy() {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    },
  }
}
