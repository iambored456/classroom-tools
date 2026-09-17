import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext'
import './style.css'

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
const textInput = byId<HTMLTextAreaElement>('text-input')
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
let currentWordIndex = 0
let currentCharacterCount = 0
let animationFrameId: number | null = null
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
  localStorage.setItem(preference.storageKey, normalized)
  updateColourTrigger(inputId, normalized)
  scheduleMinimapRender()
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
  localStorage.setItem(STORAGE.minimapVisible, String(visible))
  localStorage.setItem(STORAGE.minimapSide, side)
  scheduleMinimapRender()
}

const applyLeadingWordSetting = () => {
  localStorage.setItem(STORAGE.showLeadingWord, String(showLeadingWordInput.checked))
  updateHighlighting()
}

const applyTypography = () => {
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

  localStorage.setItem(STORAGE.fontSize, String(fontSize))
  localStorage.setItem(STORAGE.wordSpacing, String(wordSpacing))
  localStorage.setItem(STORAGE.characterSpacing, String(characterSpacing))
  localStorage.setItem(STORAGE.lineSpacing, String(lineSpacing))
  scheduleMinimapRender()
  requestAnimationFrame(centerActiveWord)
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
    localStorage.setItem(STORAGE.minimapDefaultsVersion, '2')
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

function processText(text: string): void {
  const previousIndex = currentWordIndex
  textContainer.replaceChildren()
  words = []

  if (text) {
    text.replace(/\r\n?/g, '\n').split('\n').forEach((paragraph) => {
      const paragraphElement = document.createElement('p')
      if (!paragraph.trim()) {
        paragraphElement.className = 'empty-line'
        paragraphElement.append(document.createElement('br'))
      } else {
        const tokens = paragraph.trim().split(/\s+/)
        tokens.forEach((token, index) => {
          const span = document.createElement('span')
          span.className = 'word'
          span.textContent = token
          span.dataset.index = String(words.length)
          span.dataset.text = token
          span.addEventListener('click', () => {
            currentWordIndex = Number(span.dataset.index)
            currentCharacterCount = wordCharacters(currentWordIndex).length
            updateHighlighting()
            centerActiveWord()
          })
          paragraphElement.append(span)
          if (index < tokens.length - 1) paragraphElement.append(document.createTextNode(' '))
          words.push(span)
        })
      }
      textContainer.append(paragraphElement)
    })
  }

  currentWordIndex = Math.min(previousIndex, Math.max(0, words.length - 1))
  currentCharacterCount = wordCharacters(currentWordIndex).length
  updateHighlighting()
  scheduleMinimapRender()
}

function wordCharacters(index: number): string[] {
  return Array.from(words[index]?.dataset.text ?? '')
}

function renderWordHighlight(span: HTMLSpanElement, index: number): void {
  const characters = wordCharacters(index)
  const isFullyHighlighted = index < currentWordIndex
    || (index === currentWordIndex && currentCharacterCount >= characters.length)
  span.classList.toggle('highlighted', isFullyHighlighted)

  if (index !== currentWordIndex || currentCharacterCount <= 0 || isFullyHighlighted) {
    span.replaceChildren(span.dataset.text ?? '')
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
  let leadingWordIndex = -1
  if (showLeadingWordInput.checked) {
    const currentWordIsPartial = currentCharacterCount < wordCharacters(currentWordIndex).length
    leadingWordIndex = currentWordIsPartial ? currentWordIndex : currentWordIndex + 1
    while (leadingWordIndex < words.length && isPunctuation(words[leadingWordIndex].textContent?.trim() ?? '')) {
      leadingWordIndex += 1
    }
  }
  words.forEach((span, index) => {
    renderWordHighlight(span, index)
    span.classList.toggle('leading-word', index === leadingWordIndex)
  })
  updateMinimapHighlight()
}

function isPunctuation(str: string): boolean {
  return /^[.,;:!?]+$/.test(str)
}

function smoothScrollTo(element: HTMLElement, target: number, duration: number): void {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  const start = element.scrollTop
  const maximum = Math.max(0, element.scrollHeight - element.clientHeight)
  const change = Math.min(maximum, Math.max(0, target)) - start
  let startTime: number | null = null

  const animateScroll = (timestamp: number) => {
    if (startTime === null) startTime = timestamp
    const progress = Math.min((timestamp - startTime) / duration, 1)
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
    element.scrollTop = start + change * eased
    animationFrameId = progress < 1 ? requestAnimationFrame(animateScroll) : null
  }

  animationFrameId = requestAnimationFrame(animateScroll)
}

function centerActiveWord(): void {
  const activeSpan = words[currentWordIndex]
  if (!activeSpan) return
  const target = activeSpan.offsetTop - textContainer.clientHeight / 2 + activeSpan.offsetHeight / 2
  smoothScrollTo(textContainer, target, 320)
}

function scheduleMinimapRender(): void {
  if (minimapFrameId !== null) cancelAnimationFrame(minimapFrameId)
  minimapFrameId = requestAnimationFrame(() => {
    minimapFrameId = null
    renderMinimap()
  })
}

function renderMinimap(): void {
  if (minimap.hidden) return
  const style = getComputedStyle(textContainer)
  const fontSize = Number.parseFloat(style.fontSize)
  const lineHeight = Number.parseFloat(style.lineHeight)
  const paddingLeft = Number.parseFloat(style.paddingLeft)
  const contentWidth = Math.max(
    1,
    textContainer.clientWidth - paddingLeft - Number.parseFloat(style.paddingRight),
  )
  const containerBounds = textContainer.getBoundingClientRect()
  const contentLeft = containerBounds.left + paddingLeft
  const paragraphElements = Array.from(textContainer.querySelectorAll<HTMLParagraphElement>(':scope > p'))
  const minimapLines: MinimapLineLayout[] = []
  let usedPretext = false
  let pretextMismatchCount = 0
  let pretextLineCount = 0

  paragraphElements.forEach((paragraphElement) => {
    const paragraphWords = Array.from(paragraphElement.querySelectorAll<HTMLSpanElement>('.word'))
    if (paragraphWords.length === 0) return

    const renderedLineMap = new Map<number, {
      documentTop: number
      left: number
      right: number
      startWordIndex: number
      endWordIndex: number
    }>()
    paragraphWords.forEach((word) => {
      const wordIndex = Number(word.dataset.index ?? 0)
      Array.from(word.getClientRects()).forEach((bounds) => {
        if (bounds.width <= 0 || bounds.height <= 0) return
        const documentTop = bounds.top - containerBounds.top + textContainer.scrollTop
        const lineKey = Math.round(documentTop * 2) / 2
        const renderedLine = renderedLineMap.get(lineKey)
        if (renderedLine) {
          renderedLine.left = Math.min(renderedLine.left, bounds.left)
          renderedLine.right = Math.max(renderedLine.right, bounds.right)
          renderedLine.startWordIndex = Math.min(renderedLine.startWordIndex, wordIndex)
          renderedLine.endWordIndex = Math.max(renderedLine.endWordIndex, wordIndex)
        } else {
          renderedLineMap.set(lineKey, {
            documentTop,
            left: bounds.left,
            right: bounds.right,
            startWordIndex: wordIndex,
            endWordIndex: wordIndex,
          })
        }
      })
    })
    const renderedLines = [...renderedLineMap.values()].sort((first, second) => first.documentTop - second.documentTop)

    let pretextLines: Array<{ text: string; widthRatio: number }> = []
    try {
      const prepared = prepareWithSegments(
        paragraphElement.textContent?.trim() ?? '',
        `${style.fontWeight} ${fontSize}px ${style.fontFamily}`,
        {
          whiteSpace: 'pre-wrap',
          letterSpacing: Number.parseFloat(style.letterSpacing) || 0,
        },
      )
      pretextLines = layoutWithLines(prepared, contentWidth, lineHeight).lines.map((line) => ({
        text: line.text,
        widthRatio: Math.min(1, line.width / contentWidth),
      }))
      pretextLineCount += pretextLines.length
      usedPretext = true
    } catch {
      pretextLines = []
    }
    const normalizeLineText = (value: string) => value.trim().replace(/\s+/g, ' ')
    const pretextAgreesWithBrowser = pretextLines.length === renderedLines.length && pretextLines.every(
      (pretextLine, index) => {
        const renderedLine = renderedLines[index]
        const renderedText = paragraphWords
          .filter((word) => {
            const wordIndex = Number(word.dataset.index ?? 0)
            return wordIndex >= renderedLine.startWordIndex && wordIndex <= renderedLine.endWordIndex
          })
          .map((word) => word.textContent ?? '')
          .join(' ')
        return normalizeLineText(pretextLine.text) === normalizeLineText(renderedText)
      },
    )
    if (pretextLines.length > 0 && !pretextAgreesWithBrowser) pretextMismatchCount += 1

    renderedLines.forEach((renderedLine, lineIndex) => {
      const leftRatio = Math.min(1, Math.max(0, renderedLine.left - contentLeft) / contentWidth)
      const renderedWidthRatio = Math.min(1 - leftRatio, Math.max(0, renderedLine.right - renderedLine.left) / contentWidth)
      const predictedWidthRatio = pretextAgreesWithBrowser ? pretextLines[lineIndex]?.widthRatio : undefined
      minimapLines.push({
        leftRatio,
        widthRatio: renderedWidthRatio,
        densityRatio: predictedWidthRatio === undefined
          ? renderedWidthRatio
          : (renderedWidthRatio * 2 + predictedWidthRatio) / 3,
        documentTop: renderedLine.documentTop,
        startWordIndex: renderedLine.startWordIndex,
        endWordIndex: renderedLine.endWordIndex,
      })
    })
  })

  minimap.dataset.layoutEngine = usedPretext ? 'pretext-verified-dom' : 'dom-fallback'
  minimap.dataset.pretextMismatches = String(pretextMismatchCount)
  minimap.dataset.pretextLineCount = String(pretextLineCount)
  minimap.dataset.renderedLineCount = String(minimapLines.length)

  const fragment = document.createDocumentFragment()
  const minimapHeight = Math.max(1, minimapContent.clientHeight)
  const documentHeight = Math.max(1, textContainer.scrollHeight)
  const baseThickness = Math.min(6, Math.max(1, (minimapHeight / Math.max(1, minimapLines.length)) * 0.48))

  minimapLines.forEach((layout) => {
    const line = document.createElement('span')
    const densityScale = 0.64 + Math.min(1, Math.max(0, layout.densityRatio)) * 0.36
    const thickness = Math.max(1, baseThickness * densityScale)
    const top = Math.min(minimapHeight - thickness, Math.max(0, (layout.documentTop / documentHeight) * minimapHeight))
    line.className = 'minimap-line'
    line.dataset.startWordIndex = String(layout.startWordIndex)
    line.dataset.endWordIndex = String(layout.endWordIndex)
    line.style.top = `${top}px`
    line.style.left = `${layout.leftRatio * 100}%`
    line.style.width = `${Math.max(5, layout.widthRatio * 100)}%`
    line.style.height = `${thickness}px`
    fragment.append(line)
  })
  minimapContent.replaceChildren(fragment)
  updateMinimapHighlight()
  updateMinimapViewport()
}

function updateMinimapHighlight(): void {
  const lines = minimapContent.querySelectorAll<HTMLElement>('.minimap-line')
  lines.forEach((line) => {
    const startWordIndex = Number(line.dataset.startWordIndex ?? 0)
    const endWordIndex = Number(line.dataset.endWordIndex ?? startWordIndex)
    const wordCount = Math.max(1, endWordIndex - startWordIndex + 1)
    const activeWordLength = Math.max(1, wordCharacters(currentWordIndex).length)
    const activeWordProgress = currentCharacterCount / activeWordLength
    const readProgress = currentWordIndex < startWordIndex
      ? 0
      : currentWordIndex > endWordIndex
        ? 1
        : (currentWordIndex - startWordIndex + activeWordProgress) / wordCount
    line.style.setProperty('--read-progress', `${readProgress * 100}%`)
    line.classList.toggle('read', readProgress === 1)
    line.classList.toggle('reading', readProgress > 0 && readProgress < 1)
  })
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
document.addEventListener('pointerdown', (event) => {
  if (!sidebar.classList.contains('open')) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (sidebar.contains(target) || sidebarToggle.contains(target) || colourPopover.contains(target)) return
  setSidebarOpen(false)
})

textInput.addEventListener('input', () => {
  localStorage.setItem(STORAGE.lastText, textInput.value)
  processText(textInput.value)
})

fontSizeRange.addEventListener('input', applyTypography)
fontSizeNumber.addEventListener('input', () => {
  if (!fontSizeNumber.value) return
  fontSizeRange.value = fontSizeNumber.value
  applyTypography()
})
fontSizeNumber.addEventListener('change', applyTypography)
wordSpacingRange.addEventListener('input', applyTypography)
characterSpacingRange.addEventListener('input', applyTypography)
lineSpacingRange.addEventListener('input', applyTypography)

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
textContainer.addEventListener('scroll', updateMinimapViewport, { passive: true })
minimap.addEventListener('pointerdown', (event) => {
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
  const target = event.target as HTMLElement
  if (target.matches('input, textarea, select, button')) return
  if (!words[currentWordIndex]) return

  if (event.key === 'ArrowRight') {
    if (event.shiftKey) {
      moveHighlightByCharacter(1)
    } else {
      let next = currentWordIndex + 1
      while (next < words.length && isPunctuation(words[next].textContent?.trim() ?? '')) next += 1
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
      while (previous >= 0 && isPunctuation(words[previous].textContent?.trim() ?? '')) previous -= 1
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
  processText(textInput.value)
  void document.fonts.ready.then(scheduleMinimapRender)
})
