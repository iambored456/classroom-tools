import { measureNaturalWidth, prepareWithSegments } from '@chenglou/pretext'
import type { WordGroup } from './types'

type AnswerTextOptions = {
  groups: WordGroup[]
  allCaps: boolean
  revealed: boolean
}

const MEASURE_FONT_SIZE = 100

/** Share the largest single-line title and word sizes across the whole puzzle. */
export const fitAnswerText = (node: HTMLElement, initialOptions: AnswerTextOptions) => {
  let options = initialOptions
  let frame: number | null = null
  let destroyed = false
  let fontsReady = false
  let measuredKey = ''
  let titleWidth = 1
  let wordsWidth = 1
  let viewportKey = ''
  let smallestRowHeight = Infinity
  const fontFamily = getComputedStyle(node).fontFamily

  const measure = () => {
    frame = null
    if (!fontsReady || !options.groups.length || !node.clientWidth || !node.clientHeight) return

    const style = getComputedStyle(node)
    const cssNumber = (name: string) => Number.parseFloat(style.getPropertyValue(name))
    const key = JSON.stringify([options.groups.map(({ title, words }) => [title, words]), options.allCaps])
    if (key !== measuredKey) {
      const width = (text: string, weight: number) => measureNaturalWidth(prepareWithSegments(
        options.allCaps ? text.toLocaleUpperCase() : text,
        `${weight} ${MEASURE_FONT_SIZE}px ${fontFamily}`,
        { whiteSpace: 'normal' },
      ))
      // Include unsolved groups so revealing another answer never changes the sizes.
      titleWidth = Math.max(1, ...options.groups.map((group) => width(group.title, 700)))
      wordsWidth = Math.max(1, ...options.groups.map((group) => width(group.words.join(', '), 400)))
      measuredKey = key
    }

    const nextViewportKey = `${window.innerWidth}/${window.innerHeight}/${options.groups.length}`
    if (nextViewportKey !== viewportKey) {
      viewportKey = nextViewportKey
      smallestRowHeight = Infinity
    }
    const gap = Number.parseFloat(style.rowGap) || 0
    const rowHeight = (node.clientHeight - gap * (options.groups.length - 1)) / options.groups.length
    // Completing the game frees toolbar space; keep the established text sizes.
    smallestRowHeight = Math.min(smallestRowHeight, rowHeight)
    const paddingBlock = cssNumber('--answer-padding-block')
    const topPadding = options.revealed ? cssNumber('--answer-revealed-padding-top') : paddingBlock
    const availableHeight = smallestRowHeight - topPadding - paddingBlock - cssNumber('--answer-text-gap') - 2
    const availableWidth = node.clientWidth - 2 * cssNumber('--answer-padding-inline') - 4
    if (availableHeight <= 0 || availableWidth <= 0) return

    let titleSize = MEASURE_FONT_SIZE * availableWidth / titleWidth
    let wordsSize = MEASURE_FONT_SIZE * availableWidth / wordsWidth
    const heightScale = Math.min(1, availableHeight / ((titleSize + wordsSize) * cssNumber('--answer-line-height')))
    titleSize *= heightScale
    wordsSize *= heightScale
    node.style.setProperty('--answer-title-font-size', `${Math.floor(titleSize * 2) / 2}px`)
    node.style.setProperty('--answer-word-font-size', `${Math.floor(wordsSize * 2) / 2}px`)
  }

  const schedule = () => {
    if (destroyed || frame !== null) return
    frame = requestAnimationFrame(measure)
  }

  const observer = new ResizeObserver(schedule)
  observer.observe(node)
  // Prepare only after the actual regular and bold faces load, avoiding cached fallback metrics.
  void Promise.all([
    document.fonts.load(`400 ${MEASURE_FONT_SIZE}px ${fontFamily}`),
    document.fonts.load(`700 ${MEASURE_FONT_SIZE}px ${fontFamily}`),
  ]).then(() => {
    fontsReady = true
    schedule()
  })

  return {
    update(nextOptions: AnswerTextOptions) {
      options = nextOptions
      schedule()
    },
    destroy() {
      destroyed = true
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    },
  }
}
