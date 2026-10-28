import './style.css'
import { ufliTexts } from './ufli-texts'

const STORAGE = {
  lastText: 'readAlong:lastText',
  textColor: 'readAlong:textColor',
  backgroundColor: 'readAlong:backgroundColor',
  highlightBgColor: 'readAlong:highlightBgColor',
  highlightTextColor: 'readAlong:highlightTextColor',
  fontSize: 'readAlong:fontSize',
  wordSpacing: 'readAlong:wordSpacing',
  characterSpacing: 'readAlong:characterSpacing',
  lineSpacing: 'readAlong:lineSpacing',
  minimapVisible: 'readAlong:minimapVisible',
  minimapSide: 'readAlong:minimapSide',
  minimapDefaultsVersion: 'readAlong:minimapDefaults:v2',
  showLeadingWord: 'readAlong:showLeadingWord',
} as const

const DEFAULT_TEXT = `This is an example text.

Use the arrow keys to move the highlight through the words. Hold Shift with the left or right arrow to move letter by letter, and adjust settings using the sidebar.

Click any word to jump to it. The active word remains centred as you progress.`

const defaults = {
  textColor: '#ffffff',
  backgroundColor: '#000000',
  highlightBgColor: '#003366',
  highlightTextColor: '#ffffff',
  fontSize: 36,
  wordSpacing: 0,
  characterSpacing: 0,
  lineSpacing: 1.6,
  minimapVisible: true,
  minimapSide: 'left' as 'left' | 'right',
  showLeadingWord: true,
}

const colourPreferences = [
  { inputId: 'text-color', cssProperty: '--text-color', storageKey: STORAGE.textColor, fallback: defaults.textColor },
  { inputId: 'background-color', cssProperty: '--background-color', storageKey: STORAGE.backgroundColor, fallback: defaults.backgroundColor },
  { inputId: 'highlight-bg-color', cssProperty: '--highlight-bg-color', storageKey: STORAGE.highlightBgColor, fallback: defaults.highlightBgColor },
  { inputId: 'highlight-text-color', cssProperty: '--highlight-text-color', storageKey: STORAGE.highlightTextColor, fallback: defaults.highlightTextColor },
] as const

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

const textContainer = byId<HTMLDivElement>('text-container')
const sidebar = byId<HTMLElement>('sidebar')
const sidebarToggle = byId<HTMLButtonElement>('sidebar-toggle')
const sidebarClose = byId<HTMLButtonElement>('sidebar-close')
const fullscreenToggle = byId<HTMLButtonElement>('fullscreen-toggle')
const fullscreenStatus = byId<HTMLParagraphElement>('fullscreen-status')
const textInput = byId<HTMLTextAreaElement>('text-input')
const ufliOpen = byId<HTMLButtonElement>('ufli-open')
const ufliDialog = byId<HTMLDialogElement>('ufli-dialog')
const ufliGrid = byId<HTMLDivElement>('ufli-grid')
const textStatus = byId<HTMLParagraphElement>('text-status')
const fontSizeRange = byId<HTMLInputElement>('font-size-range')
const fontSizeNumber = byId<HTMLInputElement>('font-size-number')
const wordSpacingRange = byId<HTMLInputElement>('word-spacing-range')
const wordSpacingValue = byId<HTMLOutputElement>('word-spacing-value')
const characterSpacingRange = byId<HTMLInputElement>('character-spacing-range')
const characterSpacingValue = byId<HTMLOutputElement>('character-spacing-value')
const lineSpacingRange = byId<HTMLInputElement>('line-spacing-range')
const lineSpacingValue = byId<HTMLOutputElement>('line-spacing-value')
const minimap = byId<HTMLElement>('minimap')
const minimapContent = byId<HTMLDivElement>('minimap-content')
const minimapViewport = byId<HTMLDivElement>('minimap-viewport')
const minimapVisibleInput = byId<HTMLInputElement>('minimap-visible')
const minimapSideInput = byId<HTMLSelectElement>('minimap-side')
const showLeadingWordInput = byId<HTMLInputElement>('show-leading-word')
const colourPopover = byId<HTMLDivElement>('colour-popover')
const colourPopoverTitle = byId<HTMLElement>('colour-popover-title')
const colourPopoverDone = byId<HTMLButtonElement>('colour-popover-done')
const colourField = byId<HTMLDivElement>('colour-field')
const colourFieldCursor = byId<HTMLSpanElement>('colour-field-cursor')
const colourHue = byId<HTMLInputElement>('colour-hue')
const colourSaturation = byId<HTMLInputElement>('colour-saturation')
const colourBrightness = byId<HTMLInputElement>('colour-brightness')
const colourHex = byId<HTMLInputElement>('colour-hex')
const colourTriggers = Array.from(document.querySelectorAll<HTMLButtonElement>('.colour-trigger'))

let words: HTMLSpanElement[] = []
let wordTexts: string[] = []
let paragraphs: ParagraphLayout[] = []
let highlightedThrough = -1
let renderedActiveWord = -1
let renderedCharacterCount = -1
let renderedLeadingWord = -1
let textBuildVersion = 0
let processingText = false
let textProcessTimer: number | null = null
let textSaveTimer: number | null = null
let textSaveError = ''
let minimapTimer: number | null = null
let minimapEntries: MinimapEntry[] = []
let paragraphEstimateKey = ''
let activeParagraph: HTMLElement | null = null
let typographyTimer: number | null = null
const LARGE_DOCUMENT_WORDS = 5000
const MAX_MINIMAP_LINES = 512
let currentWordIndex = 0
let currentCharacterCount = 0
let animationFrameId: number | null = null
let scrollTargetProvider: (() => number) | null = null
let minimapFrameId: number | null = null
let minimapDragging = false
let activeColourInput: HTMLInputElement | null = null
let activeColourTrigger: HTMLButtonElement | null = null
let colourFieldPointerId: number | null = null
let pickerHue = 0
let pickerSaturation = 0
let pickerBrightness = 1

type MinimapLineLayout = {
  leftRatio: number
  widthRatio: number
  densityRatio: number
  documentTop: number
  startWordIndex: number
  endWordIndex: number
}

type ParagraphLayout = {
  element: HTMLParagraphElement
  startWordIndex: number
  endWordIndex: number
  characters: number
}

type MinimapEntry = {
  element: HTMLElement
  start: number
  end: number
  progress: number
}

function updateTextStatus(): void {
  textStatus.textContent = processingText ? 'Preparing text…' : textSaveError
  textStatus.hidden = !textStatus.textContent
}

function saveText(): void {
  if (textSaveTimer !== null) clearTimeout(textSaveTimer)
  textSaveTimer = null
  try {
    localStorage.setItem(STORAGE.lastText, textInput.value)
    textSaveError = ''
  } catch {
    textSaveError = 'This text could not be saved in your browser. Keep a copy before closing the page.'
  }
  updateTextStatus()
}

function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Full or restricted storage must not prevent changing the current view.
  }
}

const storedNumber = (key: string, fallback: number, minimum: number, maximum: number) => {
  const value = Number.parseFloat(localStorage.getItem(key) ?? '')
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
}

const formatSpacing = (value: number) => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))

const normalizeHex = (value: string) => {
  const candidate = value.trim().replace(/^#/, '')
  return /^[0-9a-f]{6}$/i.test(candidate) ? `#${candidate.toUpperCase()}` : null
}

const hexToHsv = (hex: string) => {
  const value = normalizeHex(hex) ?? '#000000'
  const red = Number.parseInt(value.slice(1, 3), 16) / 255
  const green = Number.parseInt(value.slice(3, 5), 16) / 255
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  let hue = 0

  if (delta > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }
  if (hue < 0) hue += 360

  return {
    hue,
    saturation: maximum === 0 ? 0 : delta / maximum,
    brightness: maximum,
  }
}

const hsvToHex = (hue: number, saturation: number, brightness: number) => {
  const normalizedHue = ((hue % 360) + 360) % 360
  const chroma = brightness * saturation
  const intermediate = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1))
  const offset = brightness - chroma
  let red = 0
  let green = 0
  let blue = 0

  if (normalizedHue < 60) [red, green] = [chroma, intermediate]
  else if (normalizedHue < 120) [red, green] = [intermediate, chroma]
  else if (normalizedHue < 180) [green, blue] = [chroma, intermediate]
  else if (normalizedHue < 240) [green, blue] = [intermediate, chroma]
  else if (normalizedHue < 300) [red, blue] = [intermediate, chroma]
  else [red, blue] = [chroma, intermediate]

  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()
}

const updateColourTrigger = (inputId: string, value: string) => {
  const trigger = colourTriggers.find((item) => item.dataset.colourFor === inputId)
  if (!trigger) return
  trigger.querySelector<HTMLElement>('.colour-trigger-swatch')?.style.setProperty('--swatch-colour', value)
  const output = trigger.querySelector<HTMLOutputElement>('output')
  if (output) output.value = value
  trigger.setAttribute('aria-label', `Choose ${trigger.dataset.colourLabel ?? 'colour'}, currently ${value}`)
}

const setColour = (inputId: string, value: string) => {
  const normalized = normalizeHex(value)
  const preference = colourPreferences.find((item) => item.inputId === inputId)
  if (!normalized || !preference) return false
  const input = byId<HTMLInputElement>(inputId)
  input.value = normalized
  document.documentElement.style.setProperty(preference.cssProperty, normalized)
  savePreference(preference.storageKey, normalized)
  updateColourTrigger(inputId, normalized)
  return true
}

const renderColourPicker = () => {
  colourPopover.style.setProperty('--picker-hue', String(pickerHue))
  colourHue.value = String(Math.round(pickerHue))
  colourSaturation.value = String(Math.round(pickerSaturation * 100))
  colourBrightness.value = String(Math.round(pickerBrightness * 100))
  colourFieldCursor.style.left = `${pickerSaturation * 100}%`
  colourFieldCursor.style.top = `${(1 - pickerBrightness) * 100}%`
}

const applyPickerColour = () => {
  if (!activeColourInput) return
  const value = hsvToHex(pickerHue, pickerSaturation, pickerBrightness)
  setColour(activeColourInput.id, value)
  colourHex.value = value
  colourHex.removeAttribute('aria-invalid')
  renderColourPicker()
}

const positionColourPopover = () => {
  if (!activeColourTrigger || !colourPopover.matches(':popover-open')) return
  const triggerBounds = activeColourTrigger.getBoundingClientRect()
  const popoverBounds = colourPopover.getBoundingClientRect()
  const viewportPadding = 8
  const gap = 7
  const left = clamp(
    triggerBounds.right - popoverBounds.width,
    viewportPadding,
    Math.max(viewportPadding, window.innerWidth - popoverBounds.width - viewportPadding),
  )
  const below = triggerBounds.bottom + gap
  const preferredTop = below + popoverBounds.height <= window.innerHeight - viewportPadding
    ? below
    : triggerBounds.top - popoverBounds.height - gap
  const top = clamp(
    preferredTop,
    viewportPadding,
    Math.max(viewportPadding, window.innerHeight - popoverBounds.height - viewportPadding),
  )
  colourPopover.style.left = `${left}px`
  colourPopover.style.top = `${top}px`
}

const openColourPopover = (trigger: HTMLButtonElement) => {
  const inputId = trigger.dataset.colourFor
  if (!inputId) return
  const input = byId<HTMLInputElement>(inputId)
  const hsv = hexToHsv(input.value)
  activeColourInput = input
  activeColourTrigger = trigger
  pickerHue = hsv.hue
  pickerSaturation = hsv.saturation
  pickerBrightness = hsv.brightness
  colourPopoverTitle.textContent = trigger.dataset.colourLabel ?? 'Choose colour'
  colourHex.value = normalizeHex(input.value) ?? '#000000'
  colourHex.removeAttribute('aria-invalid')
  colourTriggers.forEach((item) => item.setAttribute('aria-expanded', String(item === trigger)))
  renderColourPicker()
  if (!colourPopover.matches(':popover-open')) {
    colourPopover.style.visibility = 'hidden'
    colourPopover.showPopover()
    requestAnimationFrame(() => {
      positionColourPopover()
      colourPopover.style.visibility = 'visible'
      colourSaturation.focus({ preventScroll: true })
    })
  } else {
    positionColourPopover()
    colourSaturation.focus({ preventScroll: true })
  }
}

const updatePickerFromPointer = (event: PointerEvent) => {
  const bounds = colourField.getBoundingClientRect()
  pickerSaturation = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width))
  pickerBrightness = 1 - clamp((event.clientY - bounds.top) / Math.max(1, bounds.height))
  applyPickerColour()
}

const setSidebarOpen = (open: boolean) => {
  sidebar.classList.toggle('open', open)
  sidebar.setAttribute('aria-hidden', String(!open))
  sidebarToggle.setAttribute('aria-expanded', String(open))
  sidebarToggle.setAttribute('aria-label', open ? 'Close settings' : 'Open settings')
  if (!open && colourPopover.matches(':popover-open')) colourPopover.hidePopover()
}

const applyMinimapSettings = () => {
  const visible = minimapVisibleInput.checked
  const side = minimapSideInput.value === 'left' ? 'left' : 'right'
  minimap.hidden = !visible
  minimap.className = side
  textContainer.classList.toggle('minimap-visible', visible)
  textContainer.classList.toggle('minimap-left', visible && side === 'left')
  textContainer.classList.toggle('minimap-right', visible && side === 'right')
  savePreference(STORAGE.minimapVisible, String(visible))
  savePreference(STORAGE.minimapSide, side)
  scheduleMinimapRender()
}

const applyLeadingWordSetting = () => {
  savePreference(STORAGE.showLeadingWord, String(showLeadingWordInput.checked))
  updateHighlighting()
}

const applyTypography = () => {
  if (typographyTimer !== null) clearTimeout(typographyTimer)
  typographyTimer = null
  const fontSize = Math.min(120, Math.max(12, Number.parseFloat(fontSizeRange.value) || defaults.fontSize))
  const wordSpacing = Number.parseFloat(wordSpacingRange.value) || 0
  const characterSpacing = Number.parseFloat(characterSpacingRange.value) || 0
  const lineSpacing = Number.parseFloat(lineSpacingRange.value) || defaults.lineSpacing

  fontSizeRange.value = String(fontSize)
  fontSizeNumber.value = String(fontSize)
  wordSpacingValue.value = `${formatSpacing(wordSpacing)} em`
  characterSpacingValue.value = `${formatSpacing(characterSpacing)} em`
  lineSpacingValue.value = `${formatSpacing(lineSpacing)}×`

  textContainer.style.fontSize = `${fontSize}px`
  textContainer.style.wordSpacing = `${wordSpacing}em`
  textContainer.style.letterSpacing = `${characterSpacing}em`
  textContainer.style.lineHeight = String(lineSpacing)

  savePreference(STORAGE.fontSize, String(fontSize))
  savePreference(STORAGE.wordSpacing, String(wordSpacing))
  savePreference(STORAGE.characterSpacing, String(characterSpacing))
  savePreference(STORAGE.lineSpacing, String(lineSpacing))
  scheduleMinimapRender()
  requestAnimationFrame(centerActiveWord)
}

const scheduleTypography = () => {
  if (typographyTimer !== null) clearTimeout(typographyTimer)
  if (words.length > LARGE_DOCUMENT_WORDS) {
    typographyTimer = window.setTimeout(applyTypography, 120)
  } else {
    applyTypography()
  }
}

function loadPreferences(): void {
  textInput.value = localStorage.getItem(STORAGE.lastText) ?? DEFAULT_TEXT

  colourPreferences.forEach(({ inputId, storageKey, fallback }) => {
    setColour(inputId, localStorage.getItem(storageKey) ?? fallback)
  })

  fontSizeRange.value = String(storedNumber(STORAGE.fontSize, defaults.fontSize, 12, 120))
  wordSpacingRange.value = String(storedNumber(STORAGE.wordSpacing, defaults.wordSpacing, 0, 2))
  characterSpacingRange.value = String(storedNumber(STORAGE.characterSpacing, defaults.characterSpacing, 0, 0.25))
  lineSpacingRange.value = String(storedNumber(STORAGE.lineSpacing, defaults.lineSpacing, 1, 3))
  if (localStorage.getItem(STORAGE.minimapDefaultsVersion) !== '2') {
    minimapVisibleInput.checked = defaults.minimapVisible
    minimapSideInput.value = defaults.minimapSide
    savePreference(STORAGE.minimapDefaultsVersion, '2')
  } else {
    minimapVisibleInput.checked = localStorage.getItem(STORAGE.minimapVisible) !== 'false'
    minimapSideInput.value = localStorage.getItem(STORAGE.minimapSide) === 'right' ? 'right' : defaults.minimapSide
  }
  const storedLeadingWord = localStorage.getItem(STORAGE.showLeadingWord)
  showLeadingWordInput.checked = storedLeadingWord === null
    ? defaults.showLeadingWord
    : storedLeadingWord === 'true'

  applyTypography()
  applyMinimapSettings()
  applyLeadingWordSetting()
}

async function processText(text: string): Promise<void> {
  const version = ++textBuildVersion
  processingText = true
  textContainer.setAttribute('aria-busy', 'true')
  updateTextStatus()
  textInput.spellcheck = text.length < 20000
  const nextWords: HTMLSpanElement[] = []
  const nextTexts: string[] = []
  const nextParagraphs: ParagraphLayout[] = []
  const fragment = document.createDocumentFragment()
  let sliceStarted = performance.now()

  if (text) {
    for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
      const paragraphElement = document.createElement('p')
      const startWordIndex = nextWords.length
      if (!paragraph.trim()) {
        paragraphElement.className = 'empty-line'
        paragraphElement.append(document.createElement('br'))
      } else {
        const tokens = paragraph.trim().split(/\s+/)
        for (let index = 0; index < tokens.length; index++) {
          const token = tokens[index]
          const span = document.createElement('span')
          span.className = 'word'
          span.textContent = token
          span.dataset.index = String(nextWords.length)
          paragraphElement.append(span)
          if (index < tokens.length - 1) paragraphElement.append(document.createTextNode(' '))
          nextWords.push(span)
          nextTexts.push(token)
          if (nextWords.length % 128 === 0 && performance.now() - sliceStarted >= 8) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
            if (version !== textBuildVersion) return
            sliceStarted = performance.now()
          }
        }
      }
      fragment.append(paragraphElement)
      nextParagraphs.push({ element: paragraphElement, startWordIndex, endWordIndex: nextWords.length - 1, characters: paragraph.trim().length })
      if (performance.now() - sliceStarted >= 8) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        if (version !== textBuildVersion) return
        sliceStarted = performance.now()
      }
    }
  }

  if (version !== textBuildVersion) return
  stopScrollAnimation()
  words = nextWords
  wordTexts = nextTexts
  paragraphs = nextParagraphs
  textContainer.replaceChildren(fragment)
  textContainer.classList.toggle('large-document', words.length > LARGE_DOCUMENT_WORDS)
  paragraphEstimateKey = ''
  highlightedThrough = renderedActiveWord = renderedLeadingWord = -1
  renderedCharacterCount = -1
  currentWordIndex = Math.min(currentWordIndex, Math.max(0, words.length - 1))
  currentCharacterCount = wordCharacters(currentWordIndex).length
  processingText = false
  textContainer.setAttribute('aria-busy', 'false')
  updateTextStatus()
  updateParagraphEstimates()
  updateHighlighting()
  centerActiveWord()
  scheduleMinimapRender()
}

function wordCharacters(index: number): string[] {
  return Array.from(wordTexts[index] ?? '')
}

function renderWordHighlight(span: HTMLSpanElement, index: number): void {
  const characters = wordCharacters(index)
  const isFullyHighlighted = index < currentWordIndex
    || (index === currentWordIndex && currentCharacterCount >= characters.length)
  span.classList.toggle('highlighted', isFullyHighlighted)

  if (index !== currentWordIndex || currentCharacterCount <= 0 || isFullyHighlighted) {
    if (span.firstElementChild) span.replaceChildren(wordTexts[index] ?? '')
    return
  }

  const highlightedCharacters = document.createElement('span')
  highlightedCharacters.className = 'character-highlighted'
  highlightedCharacters.textContent = characters.slice(0, currentCharacterCount).join('')
  span.replaceChildren(
    highlightedCharacters,
    characters.slice(currentCharacterCount).join(''),
  )
}

function updateHighlighting(): void {
  const currentWordIsPartial = currentCharacterCount < wordCharacters(currentWordIndex).length
  const nextHighlightedThrough = currentWordIndex - (currentWordIsPartial ? 1 : 0)
  // Adjacent navigation touches only the changed words, not the whole document.
  for (let index = Math.min(highlightedThrough, nextHighlightedThrough) + 1;
    index <= Math.max(highlightedThrough, nextHighlightedThrough); index++) {
    words[index]?.classList.toggle('highlighted', index <= nextHighlightedThrough)
  }
  highlightedThrough = nextHighlightedThrough
  if (renderedActiveWord !== currentWordIndex) {
    const previous = words[renderedActiveWord]
    if (previous?.firstElementChild) previous.replaceChildren(wordTexts[renderedActiveWord])
  }
  if (renderedActiveWord !== currentWordIndex || renderedCharacterCount !== currentCharacterCount) {
    const active = words[currentWordIndex]
    if (active) renderWordHighlight(active, currentWordIndex)
    renderedActiveWord = currentWordIndex
    renderedCharacterCount = currentCharacterCount
  }
  let leadingWordIndex = -1
  if (showLeadingWordInput.checked) {
    leadingWordIndex = currentWordIsPartial ? currentWordIndex : currentWordIndex + 1
    while (leadingWordIndex < words.length && isPunctuation(wordTexts[leadingWordIndex])) {
      leadingWordIndex += 1
    }
  }
  if (leadingWordIndex !== renderedLeadingWord) {
    words[renderedLeadingWord]?.classList.remove('leading-word')
    words[leadingWordIndex]?.classList.add('leading-word')
    renderedLeadingWord = leadingWordIndex
  }
  updateMinimapHighlight()
}

function isPunctuation(str: string): boolean {
  return /^[.,;:!?]+$/.test(str)
}

function stopScrollAnimation(): void {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  animationFrameId = null
  scrollTargetProvider = null
}

function smoothScrollTo(element: HTMLElement, target: () => number, duration: number): void {
  scrollTargetProvider = target
  const destination = () => {
    const target = scrollTargetProvider?.() ?? element.scrollTop
    const maximum = Math.max(0, element.scrollHeight - element.clientHeight)
    return Math.min(maximum, Math.max(0, target))
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const target = destination()
    stopScrollAnimation()
    element.scrollTop = target
    return
  }
  // Repeated keys update the destination without restarting the animation.
  if (animationFrameId !== null) return
  let previousTime = performance.now()
  let settledFrames = 0

  const animateScroll = (timestamp: number) => {
    // Offscreen paragraphs may acquire their measured heights while scrolling.
    // Follow the word's current position rather than a stale document offset.
    const scrollTarget = destination()
    const distance = scrollTarget - element.scrollTop
    if (Math.abs(distance) <= 1) {
      element.scrollTop = scrollTarget
      settledFrames++
      animationFrameId = settledFrames < 3 ? requestAnimationFrame(animateScroll) : null
      return
    }
    settledFrames = 0
    const elapsed = Math.max(0, timestamp - previousTime)
    previousTime = timestamp
    const step = Math.abs(distance) * (1 - Math.exp(-elapsed / (duration / 4)))
    // A minimum step avoids stalling on browsers that round scrollTop.
    element.scrollTop += Math.sign(distance) * Math.min(Math.abs(distance), Math.max(1, step))
    animationFrameId = requestAnimationFrame(animateScroll)
  }

  animationFrameId = requestAnimationFrame(animateScroll)
}

function activeWordScrollTarget(): number {
  const activeSpan = words[currentWordIndex]
  if (!activeSpan) return textContainer.scrollTop
  if (words.length > LARGE_DOCUMENT_WORDS && activeSpan.parentElement !== activeParagraph) {
    activeParagraph?.style.removeProperty('content-visibility')
    activeParagraph = activeSpan.parentElement
    // Materialise just the destination paragraph before measuring a distant jump.
    if (activeParagraph) activeParagraph.style.contentVisibility = 'visible'
  }
  const top = activeSpan.offsetTop
  const height = activeSpan.offsetHeight
  const viewportHeight = textContainer.clientHeight
  const inset = Math.min(height, viewportHeight * 0.15, Math.max(0, (viewportHeight - height) / 2))
  // Keep the active word inside the viewport even when navigation outruns easing.
  if (top < textContainer.scrollTop + inset) {
    textContainer.scrollTop = Math.max(0, top - inset)
  } else if (top + height > textContainer.scrollTop + viewportHeight - inset) {
    textContainer.scrollTop = top + height - viewportHeight + inset
  }
  return top - viewportHeight / 2 + height / 2
}

function centerActiveWord(): void {
  if (!words[currentWordIndex]) return
  // Resolve immediately as well as on each frame to guarantee visibility.
  activeWordScrollTarget()
  smoothScrollTo(textContainer, activeWordScrollTarget, 320)
}

function updateParagraphEstimates(): void {
  if (words.length <= LARGE_DOCUMENT_WORDS) return
  const style = getComputedStyle(textContainer)
  const width = Math.max(1, textContainer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight))
  const key = `${width}|${style.font}|${style.letterSpacing}|${style.wordSpacing}|${style.lineHeight}`
  if (key === paragraphEstimateKey) return
  paragraphEstimateKey = key
  const context = document.createElement('canvas').getContext('2d')
  if (context) context.font = style.font
  const sample = 'The reader walked through the quiet village.'
  const characterWidth = (context?.measureText(sample).width ?? sample.length * parseFloat(style.fontSize) * 0.5) / sample.length
  const letterSpacing = parseFloat(style.letterSpacing) || 0
  const wordSpacing = parseFloat(style.wordSpacing) || 0
  const lineHeight = parseFloat(style.lineHeight)
  for (const paragraph of paragraphs) {
    const wordCount = Math.max(0, paragraph.endWordIndex - paragraph.startWordIndex + 1)
    const estimatedWidth = paragraph.characters * (characterWidth + letterSpacing) + wordCount * wordSpacing
    const height = Math.max(1, Math.ceil(estimatedWidth / (width * 0.9))) * lineHeight
    paragraph.element.style.containIntrinsicSize = `auto ${height}px`
  }
}

function scheduleMinimapRender(): void {
  if (minimapTimer !== null) clearTimeout(minimapTimer)
  minimapTimer = window.setTimeout(() => {
    minimapTimer = null
    if (minimapFrameId !== null) cancelAnimationFrame(minimapFrameId)
    minimapFrameId = requestAnimationFrame(() => {
      minimapFrameId = null
      if (processingText) return
      updateParagraphEstimates()
      renderMinimap()
    })
  }, 120)
}

function renderMinimap(): void {
  if (minimap.hidden) return
  const style = getComputedStyle(textContainer)
  const paddingLeft = parseFloat(style.paddingLeft)
  const contentWidth = Math.max(1, textContainer.clientWidth - paddingLeft - parseFloat(style.paddingRight))
  const bounds = textContainer.getBoundingClientRect()
  const contentLeft = bounds.left + paddingLeft
  let layouts: MinimapLineLayout[] = []

  if (words.length > LARGE_DOCUMENT_WORDS) {
    // A novel cannot show every line in a few hundred pixels. Use a bounded
    // overview without measuring every word or waking offscreen paragraphs.
    const sections = paragraphs.filter((paragraph) => paragraph.endWordIndex >= paragraph.startWordIndex).map((paragraph) => ({
      ...paragraph, top: paragraph.element.offsetTop, height: paragraph.element.offsetHeight,
    }))
    const stride = Math.max(1, Math.ceil(words.length / MAX_MINIMAP_LINES))
    let sectionIndex = 0
    for (let start = 0; start < words.length; start += stride) {
      while (sectionIndex + 1 < sections.length && start > sections[sectionIndex].endWordIndex) sectionIndex++
      const section = sections[sectionIndex]
      if (!section) break
      const fraction = (start - section.startWordIndex) / Math.max(1, section.endWordIndex - section.startWordIndex + 1)
      layouts.push({
        leftRatio: 0, widthRatio: 0.9, densityRatio: 0.9,
        documentTop: section.top + fraction * section.height,
        startWordIndex: start, endWordIndex: Math.min(words.length - 1, start + stride - 1),
      })
    }
    minimap.dataset.layoutEngine = 'paragraph-overview'
  } else {
    for (const paragraph of paragraphs) {
      const lines = new Map<number, { left: number; right: number; top: number; start: number; end: number }>()
      for (let index = paragraph.startWordIndex; index <= paragraph.endWordIndex; index++) {
        for (const rect of words[index].getClientRects()) {
          if (rect.width <= 0 || rect.height <= 0) continue
          const top = rect.top - bounds.top + textContainer.scrollTop
          const key = Math.round(top * 2) / 2
          const line = lines.get(key)
          if (line) {
            line.left = Math.min(line.left, rect.left)
            line.right = Math.max(line.right, rect.right)
            line.end = index
          } else {
            lines.set(key, { left: rect.left, right: rect.right, top, start: index, end: index })
          }
        }
      }
      for (const line of lines.values()) {
        const leftRatio = clamp((line.left - contentLeft) / contentWidth)
        const widthRatio = Math.min(1 - leftRatio, (line.right - line.left) / contentWidth)
        layouts.push({ leftRatio, widthRatio, densityRatio: widthRatio, documentTop: line.top, startWordIndex: line.start, endWordIndex: line.end })
      }
    }
    minimap.dataset.layoutEngine = 'dom'
  }

  if (layouts.length > MAX_MINIMAP_LINES) {
    const stride = Math.ceil(layouts.length / MAX_MINIMAP_LINES)
    const grouped: MinimapLineLayout[] = []
    for (let index = 0; index < layouts.length; index += stride) {
      grouped.push({ ...layouts[index], endWordIndex: layouts[Math.min(layouts.length - 1, index + stride - 1)].endWordIndex })
    }
    layouts = grouped
  }
  const fragment = document.createDocumentFragment()
  const height = Math.max(1, minimapContent.clientHeight)
  const documentHeight = Math.max(1, textContainer.scrollHeight)
  const thickness = Math.min(6, Math.max(1, height / Math.max(1, layouts.length) * 0.48))
  minimapEntries = []
  for (const layout of layouts) {
    const line = document.createElement('span')
    line.className = 'minimap-line'
    line.style.top = `${clamp(layout.documentTop / documentHeight * height, 0, height - thickness)}px`
    line.style.left = `${layout.leftRatio * 100}%`
    line.style.width = `${Math.max(5, layout.widthRatio * 100)}%`
    line.style.height = `${thickness}px`
    fragment.append(line)
    minimapEntries.push({ element: line, start: layout.startWordIndex, end: layout.endWordIndex, progress: -1 })
  }
  minimapContent.replaceChildren(fragment)
  updateMinimapHighlight()
  updateMinimapViewport()
}

function updateMinimapHighlight(): void {
  if (minimap.hidden) return
  const activeProgress = currentCharacterCount / Math.max(1, wordCharacters(currentWordIndex).length)
  for (const entry of minimapEntries) {
    const progress = clamp((currentWordIndex - entry.start + activeProgress) / Math.max(1, entry.end - entry.start + 1))
    if (progress === entry.progress) continue
    entry.progress = progress
    entry.element.style.setProperty('--read-progress', `${progress * 100}%`)
    entry.element.classList.toggle('read', progress === 1)
    entry.element.classList.toggle('reading', progress > 0 && progress < 1)
  }
}

function updateMinimapViewport(): void {
  if (minimap.hidden) return
  const minimapHeight = minimap.clientHeight
  const maximumScroll = Math.max(0, textContainer.scrollHeight - textContainer.clientHeight)
  const visibleRatio = Math.min(1, textContainer.clientHeight / Math.max(1, textContainer.scrollHeight))
  const indicatorHeight = Math.min(minimapHeight, Math.max(24, minimapHeight * visibleRatio))
  const top = maximumScroll === 0
    ? 0
    : (textContainer.scrollTop / maximumScroll) * (minimapHeight - indicatorHeight)
  minimapViewport.style.height = `${indicatorHeight}px`
  minimapViewport.style.transform = `translateY(${top}px)`
}

function scrollFromMinimap(event: PointerEvent): void {
  const bounds = minimap.getBoundingClientRect()
  const indicatorHeight = minimapViewport.getBoundingClientRect().height
  const track = Math.max(1, bounds.height - indicatorHeight)
  const position = Math.min(track, Math.max(0, event.clientY - bounds.top - indicatorHeight / 2))
  const maximumScroll = Math.max(0, textContainer.scrollHeight - textContainer.clientHeight)
  textContainer.scrollTop = (position / track) * maximumScroll
}

sidebarToggle.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('open')))
sidebarClose.addEventListener('click', () => setSidebarOpen(false))

for (const lesson of ufliTexts) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = lesson.id
  button.title = `Lesson ${lesson.id}: ${lesson.title}`
  button.addEventListener('click', () => {
    if (textProcessTimer !== null) clearTimeout(textProcessTimer)
    if (textSaveTimer !== null) clearTimeout(textSaveTimer)
    textProcessTimer = null
    textSaveTimer = null
    textInput.value = lesson.text
    currentWordIndex = 0
    currentCharacterCount = 0
    saveText()
    void processText(lesson.text)
    ufliDialog.close()
    setSidebarOpen(false)
    textContainer.focus({ preventScroll: true })
  })
  ufliGrid.append(button)
}
ufliOpen.addEventListener('click', () => {
  if (colourPopover.matches(':popover-open')) colourPopover.hidePopover()
  ufliDialog.showModal()
})
byId<HTMLButtonElement>('ufli-close').addEventListener('click', () => ufliDialog.close())
ufliDialog.addEventListener('click', (event) => {
  if (event.target !== ufliDialog) return
  const bounds = ufliDialog.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) ufliDialog.close()
})

function syncFullscreen(): void {
  const active = Boolean(document.fullscreenElement)
  const label = active ? 'Exit fullscreen' : 'Enter fullscreen'
  fullscreenToggle.setAttribute('aria-label', label)
  fullscreenToggle.setAttribute('aria-pressed', String(active))
  fullscreenToggle.title = label
  fullscreenToggle.querySelector('.fullscreen-enter')?.toggleAttribute('hidden', active)
  fullscreenToggle.querySelector('.fullscreen-exit')?.toggleAttribute('hidden', !active)
}

fullscreenToggle.disabled = !document.fullscreenEnabled
if (fullscreenToggle.disabled) fullscreenToggle.title = 'Fullscreen is not available in this browser'
document.addEventListener('fullscreenchange', syncFullscreen)
fullscreenToggle.addEventListener('click', async () => {
  fullscreenStatus.hidden = true
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    fullscreenStatus.textContent = 'Fullscreen could not be changed. Please try again.'
    fullscreenStatus.hidden = false
  }
})

document.addEventListener('pointerdown', (event) => {
  if (!sidebar.classList.contains('open')) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (sidebar.contains(target) || sidebarToggle.contains(target) || colourPopover.contains(target) || ufliDialog.open) return
  setSidebarOpen(false)
})

textInput.addEventListener('input', () => {
  ++textBuildVersion
  if (textProcessTimer !== null) clearTimeout(textProcessTimer)
  if (textSaveTimer !== null) clearTimeout(textSaveTimer)
  const text = textInput.value
  textInput.spellcheck = text.length < 20000
  textSaveTimer = window.setTimeout(saveText, 700)
  if (text.length >= 20000) {
    processingText = true
    textContainer.setAttribute('aria-busy', 'true')
    updateTextStatus()
    textProcessTimer = window.setTimeout(() => {
      textProcessTimer = null
      void processText(text)
    }, 150)
  } else {
    void processText(text)
  }
})
window.addEventListener('pagehide', () => {
  if (textSaveTimer !== null) saveText()
})

textContainer.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const word = target.closest<HTMLSpanElement>('.word')
  if (!word || !textContainer.contains(word)) return
  currentWordIndex = Number(word.dataset.index)
  currentCharacterCount = wordCharacters(currentWordIndex).length
  updateHighlighting()
  centerActiveWord()
})

fontSizeRange.addEventListener('input', scheduleTypography)
fontSizeNumber.addEventListener('input', () => {
  if (!fontSizeNumber.value) return
  fontSizeRange.value = fontSizeNumber.value
  scheduleTypography()
})
fontSizeNumber.addEventListener('change', applyTypography)
wordSpacingRange.addEventListener('input', scheduleTypography)
characterSpacingRange.addEventListener('input', scheduleTypography)
lineSpacingRange.addEventListener('input', scheduleTypography)
for (const range of [fontSizeRange, wordSpacingRange, characterSpacingRange, lineSpacingRange]) {
  range.addEventListener('change', applyTypography)
}

colourTriggers.forEach((trigger) => {
  trigger.setAttribute('aria-expanded', 'false')
  trigger.addEventListener('click', () => openColourPopover(trigger))
})

colourPopover.addEventListener('toggle', () => {
  if (colourPopover.matches(':popover-open')) return
  colourTriggers.forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'))
  colourFieldPointerId = null
})

colourPopoverDone.addEventListener('click', () => {
  const trigger = activeColourTrigger
  colourPopover.hidePopover()
  trigger?.focus()
})

colourField.addEventListener('pointerdown', (event) => {
  colourFieldPointerId = event.pointerId
  colourField.setPointerCapture(event.pointerId)
  updatePickerFromPointer(event)
})
colourField.addEventListener('pointermove', (event) => {
  if (colourFieldPointerId === event.pointerId) updatePickerFromPointer(event)
})
const finishColourFieldPointer = (event: PointerEvent) => {
  if (colourFieldPointerId !== event.pointerId) return
  if (event.type === 'pointerup') updatePickerFromPointer(event)
  if (colourField.hasPointerCapture(event.pointerId)) colourField.releasePointerCapture(event.pointerId)
  colourFieldPointerId = null
}
colourField.addEventListener('pointerup', finishColourFieldPointer)
colourField.addEventListener('pointercancel', finishColourFieldPointer)

colourHue.addEventListener('input', () => {
  pickerHue = Number.parseFloat(colourHue.value) || 0
  applyPickerColour()
})
colourSaturation.addEventListener('input', () => {
  pickerSaturation = clamp((Number.parseFloat(colourSaturation.value) || 0) / 100)
  applyPickerColour()
})
colourBrightness.addEventListener('input', () => {
  pickerBrightness = clamp((Number.parseFloat(colourBrightness.value) || 0) / 100)
  applyPickerColour()
})

colourHex.addEventListener('input', () => {
  const normalized = normalizeHex(colourHex.value)
  if (!normalized || !activeColourInput) {
    colourHex.setAttribute('aria-invalid', 'true')
    return
  }
  const hsv = hexToHsv(normalized)
  pickerHue = hsv.hue
  pickerSaturation = hsv.saturation
  pickerBrightness = hsv.brightness
  colourHex.value = normalized
  colourHex.removeAttribute('aria-invalid')
  setColour(activeColourInput.id, normalized)
  renderColourPicker()
})
colourHex.addEventListener('change', () => {
  if (!normalizeHex(colourHex.value) && activeColourInput) {
    colourHex.value = activeColourInput.value
    colourHex.removeAttribute('aria-invalid')
  }
})

minimapVisibleInput.addEventListener('change', applyMinimapSettings)
minimapSideInput.addEventListener('change', applyMinimapSettings)
showLeadingWordInput.addEventListener('change', applyLeadingWordSetting)
textContainer.addEventListener('scroll', () => {
  updateMinimapViewport()
  if (words.length > LARGE_DOCUMENT_WORDS && !minimap.hidden) scheduleMinimapRender()
}, { passive: true })
textContainer.addEventListener('wheel', stopScrollAnimation, { passive: true })
textContainer.addEventListener('pointerdown', stopScrollAnimation, { passive: true })
minimap.addEventListener('pointerdown', (event) => {
  stopScrollAnimation()
  minimapDragging = true
  minimap.setPointerCapture(event.pointerId)
  scrollFromMinimap(event)
})
minimap.addEventListener('pointermove', (event) => {
  if (minimapDragging) scrollFromMinimap(event)
})
minimap.addEventListener('pointerup', (event) => {
  minimapDragging = false
  minimap.releasePointerCapture(event.pointerId)
})

function moveHighlightByCharacter(direction: -1 | 1): void {
  const characterCount = wordCharacters(currentWordIndex).length

  if (direction > 0) {
    if (currentCharacterCount < characterCount) {
      currentCharacterCount += 1
    } else if (currentWordIndex < words.length - 1) {
      currentWordIndex += 1
      currentCharacterCount = Math.min(1, wordCharacters(currentWordIndex).length)
    }
    return
  }

  if (currentCharacterCount > 0) {
    currentCharacterCount -= 1
  } else if (currentWordIndex > 0) {
    currentWordIndex -= 1
    currentCharacterCount = Math.max(0, wordCharacters(currentWordIndex).length - 1)
  }
}

document.addEventListener('keydown', (event) => {
  if (ufliDialog.open) return
  const target = event.target as HTMLElement
  if (target.matches('input, textarea, select, button')) return
  if (!words[currentWordIndex]) return

  if (event.key === 'ArrowRight') {
    if (event.shiftKey) {
      moveHighlightByCharacter(1)
    } else {
      let next = currentWordIndex + 1
      while (next < words.length && isPunctuation(wordTexts[next])) next += 1
      if (next < words.length) {
        currentWordIndex = next
        currentCharacterCount = wordCharacters(currentWordIndex).length
      }
    }
  } else if (event.key === 'ArrowLeft') {
    if (event.shiftKey) {
      moveHighlightByCharacter(-1)
    } else {
      let previous = currentWordIndex - 1
      while (previous >= 0 && isPunctuation(wordTexts[previous])) previous -= 1
      if (previous >= 0) {
        currentWordIndex = previous
        currentCharacterCount = wordCharacters(currentWordIndex).length
      }
    }
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const activeTop = words[currentWordIndex].offsetTop
    const direction = event.key === 'ArrowUp' ? -1 : 1
    for (let index = currentWordIndex + direction; index >= 0 && index < words.length; index += direction) {
      if ((direction < 0 && words[index].offsetTop < activeTop) || (direction > 0 && words[index].offsetTop > activeTop)) {
        currentWordIndex = index
        currentCharacterCount = wordCharacters(currentWordIndex).length
        break
      }
    }
  } else {
    return
  }

  updateHighlighting()
  centerActiveWord()
  event.preventDefault()
})

window.addEventListener('resize', () => {
  scheduleMinimapRender()
  positionColourPopover()
})
sidebar.addEventListener('scroll', positionColourPopover, { passive: true })
const textLayoutObserver = new ResizeObserver(scheduleMinimapRender)
textLayoutObserver.observe(textContainer)
window.addEventListener('load', () => {
  loadPreferences()
  void processText(textInput.value)
  void document.fonts.ready.then(() => {
    paragraphEstimateKey = ''
    scheduleMinimapRender()
  })
})
