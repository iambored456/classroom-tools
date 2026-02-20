import './style.css'

// Namespaced localStorage keys to avoid collisions with other apps
const STORAGE = {
  lastText: 'readAlong:lastText',
  textColor: 'readAlong:textColor',
  backgroundColor: 'readAlong:backgroundColor',
  highlightBgColor: 'readAlong:highlightBgColor',
  highlightTextColor: 'readAlong:highlightTextColor',
  fontSize: 'readAlong:fontSize',
} as const

const DEFAULT_TEXT = `This is an example text.

Use the arrow keys to move the highlight through the words,
and adjust settings using the sidebar!

Click any word to jump to that word. The first word starts in the middle of the window and remains centered as you progress.`

let words: HTMLSpanElement[] = []
let currentWordIndex = 0
let animationFrameId: number | null = null

const textContainer = document.getElementById('text-container') as HTMLDivElement
const chevron = document.getElementById('chevron') as HTMLDivElement
const sidebar = document.getElementById('sidebar') as HTMLDivElement
const applyBtn = document.getElementById('apply-btn') as HTMLButtonElement

function loadPreferences(): void {
  const textInput = document.getElementById('text-input') as HTMLTextAreaElement
  const savedText = localStorage.getItem(STORAGE.lastText)
  textInput.value = savedText !== null ? savedText : DEFAULT_TEXT

  const savedTextColor = localStorage.getItem(STORAGE.textColor)
  if (savedTextColor !== null) {
    ;(document.getElementById('text-color') as HTMLInputElement).value = savedTextColor
    document.documentElement.style.setProperty('--text-color', savedTextColor)
  }

  const savedBg = localStorage.getItem(STORAGE.backgroundColor)
  if (savedBg !== null) {
    ;(document.getElementById('background-color') as HTMLInputElement).value = savedBg
    document.documentElement.style.setProperty('--background-color', savedBg)
  }

  const savedHighlightBg = localStorage.getItem(STORAGE.highlightBgColor)
  if (savedHighlightBg !== null) {
    ;(document.getElementById('highlight-bg-color') as HTMLInputElement).value = savedHighlightBg
    document.documentElement.style.setProperty('--highlight-bg-color', savedHighlightBg)
  }

  const savedHighlightText = localStorage.getItem(STORAGE.highlightTextColor)
  if (savedHighlightText !== null) {
    ;(document.getElementById('highlight-text-color') as HTMLInputElement).value = savedHighlightText
    document.documentElement.style.setProperty('--highlight-text-color', savedHighlightText)
  }

  const savedFontSize = localStorage.getItem(STORAGE.fontSize)
  if (savedFontSize !== null) {
    textContainer.style.fontSize = savedFontSize
  }
}

chevron.addEventListener('click', () => {
  sidebar.classList.toggle('open')
})

applyBtn.addEventListener('click', () => {
  const text = (document.getElementById('text-input') as HTMLTextAreaElement).value
  const textColor = (document.getElementById('text-color') as HTMLInputElement).value
  const backgroundColor = (document.getElementById('background-color') as HTMLInputElement).value
  const highlightBgColor = (document.getElementById('highlight-bg-color') as HTMLInputElement).value
  const highlightTextColor = (document.getElementById('highlight-text-color') as HTMLInputElement).value

  localStorage.setItem(STORAGE.lastText, text)
  localStorage.setItem(STORAGE.textColor, textColor)
  localStorage.setItem(STORAGE.backgroundColor, backgroundColor)
  localStorage.setItem(STORAGE.highlightBgColor, highlightBgColor)
  localStorage.setItem(STORAGE.highlightTextColor, highlightTextColor)

  document.documentElement.style.setProperty('--text-color', textColor)
  document.documentElement.style.setProperty('--background-color', backgroundColor)
  document.documentElement.style.setProperty('--highlight-bg-color', highlightBgColor)
  document.documentElement.style.setProperty('--highlight-text-color', highlightTextColor)

  processText(text)
  sidebar.classList.remove('open')
})

document.querySelectorAll<HTMLButtonElement>('.text-size-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    const fontSize = this.getAttribute('data-size')! + 'px'
    textContainer.style.fontSize = fontSize
    localStorage.setItem(STORAGE.fontSize, fontSize)
    centerActiveWord()
  })
})

function processText(text: string): void {
  textContainer.innerHTML = ''
  words = []
  if (!text) return

  text.split(/\n+/).forEach((para) => {
    const pElem = document.createElement('p')
    const tokens = para.split(/\s+/)
    tokens.forEach((token, index) => {
      if (token === '') return
      const span = document.createElement('span')
      span.className = 'word'
      span.textContent = token + (index !== tokens.length - 1 ? ' ' : '')
      span.dataset.index = String(words.length)
      span.addEventListener('click', function () {
        currentWordIndex = parseInt(this.dataset.index!)
        updateHighlighting()
        centerActiveWord()
      })
      pElem.appendChild(span)
      words.push(span)
    })
    textContainer.appendChild(pElem)
  })

  currentWordIndex = 0
  updateHighlighting()
  centerActiveWord()
}

function isPunctuation(str: string): boolean {
  return /^[.,;:!?]+$/.test(str)
}

function updateHighlighting(): void {
  words.forEach((span, index) => {
    span.classList.toggle('highlighted', index <= currentWordIndex)
  })
}

function smoothScrollTo(element: HTMLElement, target: number, duration: number): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  const start = element.scrollTop
  const change = target - start
  let startTime: number | null = null

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  function animateScroll(timestamp: number): void {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime
    element.scrollTop = start + change * easeInOutQuad(Math.min(elapsed / duration, 1))
    if (elapsed < duration) {
      animationFrameId = window.requestAnimationFrame(animateScroll)
    } else {
      animationFrameId = null
    }
  }

  animationFrameId = window.requestAnimationFrame(animateScroll)
}

function centerActiveWord(): void {
  const activeSpan = words[currentWordIndex]
  if (!activeSpan) return
  const newScrollTop =
    activeSpan.offsetTop - textContainer.clientHeight / 2 + activeSpan.offsetHeight / 2
  smoothScrollTo(textContainer, newScrollTop, 400)
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

  if (e.key === 'ArrowRight') {
    let next = currentWordIndex + 1
    while (next < words.length && isPunctuation(words[next].textContent?.trim() ?? '')) next++
    if (next < words.length) {
      currentWordIndex = next
      updateHighlighting()
      centerActiveWord()
    }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft') {
    let prev = currentWordIndex - 1
    while (prev >= 0 && isPunctuation(words[prev].textContent?.trim() ?? '')) prev--
    if (prev >= 0) {
      currentWordIndex = prev
      updateHighlighting()
      centerActiveWord()
    }
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    const activeTop = words[currentWordIndex].offsetTop
    let candidate: number | null = null
    for (let i = currentWordIndex - 1; i >= 0; i--) {
      if (words[i].offsetTop < activeTop) { candidate = i; break }
    }
    if (candidate !== null) {
      currentWordIndex = candidate
      updateHighlighting()
      centerActiveWord()
    }
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    const activeTop = words[currentWordIndex].offsetTop
    let candidate: number | null = null
    for (let i = currentWordIndex + 1; i < words.length; i++) {
      if (words[i].offsetTop > activeTop) { candidate = i; break }
    }
    if (candidate !== null) {
      currentWordIndex = candidate
      updateHighlighting()
      centerActiveWord()
    }
    e.preventDefault()
  }
})

window.addEventListener('load', () => {
  loadPreferences()
  processText((document.getElementById('text-input') as HTMLTextAreaElement).value)
})
