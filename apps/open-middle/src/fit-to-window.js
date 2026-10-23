/** Enlarge an activity uniformly within the space below its header. */
export function fitToWindow(element, {allowVerticalScroll = false} = {}) {
 let frame = 0, disposed = false
 function fit() {
  if (disposed || !element.isConnected) return
  const workspace = element.parentElement
  const availableWidth = workspace.clientWidth - parseFloat(getComputedStyle(workspace).paddingLeft) - parseFloat(getComputedStyle(workspace).paddingRight)
  // Keep the existing wrapped phone layout and readable minimum sizes.
  const wide = availableWidth >= 700
  const naturalWidth = wide ? Math.min(1000, availableWidth) : availableWidth
  element.style.width = `${naturalWidth}px`
  const currentScale = parseFloat(element.style.zoom) || 1
  const naturalHeight = element.getBoundingClientRect().height / currentScale
  const availableHeight = window.innerHeight - (workspace.getBoundingClientRect().top + window.scrollY) - parseFloat(getComputedStyle(workspace).paddingTop) - 24
  const widthScale = availableWidth / naturalWidth
  const heightScale = availableHeight / naturalHeight
  // Long investigations remain readable and scroll, rather than shrinking a worksheet.
  const scale = wide ? Math.max(1, allowVerticalScroll && heightScale < 1 ? widthScale : Math.min(widthScale, heightScale)) : 1
  element.style.zoom = String(Math.floor(scale * 1000) / 1000)
 }
 function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(fit)
 }
 const observer = new ResizeObserver(schedule)
 observer.observe(element)
 observer.observe(element.parentElement)
 window.addEventListener('resize', schedule)
 document.addEventListener('fullscreenchange', schedule)
 document.fonts.ready.then(() => { if (!disposed) schedule() })
 fit()
 return {
  fit,
  cleanup() {
   disposed = true
   cancelAnimationFrame(frame)
   observer.disconnect()
   window.removeEventListener('resize', schedule)
   document.removeEventListener('fullscreenchange', schedule)
  },
 }
}
