// Numeracy activities share the surrounding app header and theme in full screen.
export async function setAppFullscreen(activity: HTMLElement, enabled: boolean) {
  const app = activity.closest<HTMLElement>('.app')
  if (enabled) await app?.requestFullscreen?.()
  else if (app && document.fullscreenElement === app) await document.exitFullscreen()
}
