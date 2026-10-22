export function mountQuestionPreviews(list) {
  const popup = document.createElement('div')
  popup.className = 'question-preview'
  popup.hidden = true
  popup.setAttribute('aria-hidden', 'true')
  const image = document.createElement('img')
  image.alt = ''
  image.draggable = false
  image.width = 1200
  image.height = 840
  popup.append(image)
  document.body.append(popup)
  let active = null
  let request = 0
  let scrollFrame = 0
  let hoveringPointer = false

  function hide() {
    request++
    active = null
    popup.hidden = true
  }

  function position(link) {
    const rect = link.getBoundingClientRect()
    const gap = 16
    const width = Math.min(560, innerWidth - gap * 2, (innerHeight - gap * 2) / .7)
    const height = width * .7
    let left, top
    if (innerWidth - rect.right >= width + gap * 2) {
      left = rect.right + gap
      top = rect.top + (rect.height - height) / 2
    } else if (rect.left >= width + gap * 2) {
      left = rect.left - width - gap
      top = rect.top + (rect.height - height) / 2
    } else {
      left = rect.left
      top = innerHeight - rect.bottom >= height + gap ? rect.bottom + gap : rect.top - height - gap
    }
    popup.style.width = `${width}px`
    popup.style.left = `${Math.max(gap, Math.min(left, innerWidth - width - gap))}px`
    popup.style.top = `${Math.max(gap, Math.min(top, innerHeight - height - gap))}px`
  }

  async function show(link) {
    if (active === link) return
    const current = ++request
    active = link
    popup.hidden = true
    const id = link.hash.slice(1)
    image.src = `${import.meta.env.BASE_URL}question-previews/${encodeURIComponent(id)}.jpg`
    try {
      await image.decode()
      if (request !== current || !link.isConnected || !link.matches(':hover')) return
      position(link)
      popup.hidden = false
    } catch {
      if (request === current) hide()
    }
  }

  const over = event => {
    if (event.pointerType === 'touch') { hoveringPointer = false; hide(); return }
    hoveringPointer = true
    const link = event.target.closest('.problem-link')
    if (link && list.contains(link)) show(link)
  }
  const out = event => {
    if (active && !active.contains(event.relatedTarget)) hide()
  }
  const visibility = () => { if (document.hidden) hide() }
  const scrolled = () => {
    hide()
    cancelAnimationFrame(scrollFrame)
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0
      const link = hoveringPointer ? list.querySelector('.problem-link:hover') : null
      if (link) show(link)
    })
  }
  list.addEventListener('pointerover', over)
  list.addEventListener('pointermove', over)
  list.addEventListener('pointerout', out)
  list.addEventListener('click', hide)
  window.addEventListener('scroll', scrolled, true)
  window.addEventListener('resize', hide)
  window.addEventListener('blur', hide)
  document.addEventListener('visibilitychange', visibility)

  return {
    hide,
    cleanup() {
      hide()
      cancelAnimationFrame(scrollFrame)
      popup.remove()
      list.removeEventListener('pointerover', over)
      list.removeEventListener('pointermove', over)
      list.removeEventListener('pointerout', out)
      list.removeEventListener('click', hide)
      window.removeEventListener('scroll', scrolled, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', visibility)
    },
  }
}
