import { layout, prepare, type PreparedText } from '@chenglou/pretext'

const BASE_FONT_SIZE = 100
const QUESTION_LINE_HEIGHT = 1.02
const FOLLOW_UP_LINE_HEIGHT = 1.16

type FitQuestionTextOptions = {
  prompt: string
  followUps: string[]
  contentWidth: number
  contentHeight: number
  rootFontSize: number
  viewportWidth: number
  viewportHeight: number
  compact: boolean
}

export type QuestionTextFit = {
  questionFontSize: number
  followUpFontSize: number
  requiredHeight: number
  availableHeight: number
  fits: boolean
}

const clamp = (minimum: number, value: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const measuredHeight = (
  prepared: PreparedText,
  width: number,
  fontSize: number,
  lineHeight: number,
) => {
  const scale = fontSize / BASE_FONT_SIZE
  return layout(prepared, Math.max(1, width / scale), BASE_FONT_SIZE * lineHeight).height * scale
}

export const fitQuestionText = ({
  prompt,
  followUps,
  contentWidth,
  contentHeight,
  rootFontSize,
  viewportWidth,
  viewportHeight,
  compact,
}: FitQuestionTextOptions): QuestionTextFit => {
  const questionMinimum = compact ? 20 : 26
  const questionMaximum = compact
    ? clamp(2.4 * rootFontSize, 0.105 * viewportWidth, 3.8 * rootFontSize)
    : clamp(3.75 * rootFontSize, 0.08 * viewportWidth, 8 * rootFontSize)
  const followUpMinimum = compact ? 14 : 16
  const followUpMaximum = compact
    ? clamp(1.25 * rootFontSize, 0.058 * viewportWidth, 1.75 * rootFontSize)
    : clamp(1.75 * rootFontSize, 0.031 * viewportWidth, 2.7 * rootFontSize)
  const cardGap = compact
    ? clamp(rootFontSize, 0.022 * viewportHeight, 1.4 * rootFontSize)
    : clamp(1.2 * rootFontSize, 0.03 * viewportHeight, 2 * rootFontSize)
  const panelPadding = compact
    ? 0.9 * rootFontSize
    : clamp(rootFontSize, 0.022 * viewportWidth, 1.5 * rootFontSize)
  const listGap = 0.6 * rootFontSize
  const panelGap = 0.55 * rootFontSize
  const nextButtonMargin = 0.25 * rootFontSize
  const nextButtonHeight = 3.5 * rootFontSize
  const revealButtonHeight = (compact ? 4.25 : 5.25) * rootFontSize
  const panelChromeHeight = panelPadding * 2 + 2
  const safeAvailableHeight = Math.max(1, contentHeight - 8)

  const preparedQuestion = prepare(
    prompt,
    `400 ${BASE_FONT_SIZE}px "Atkinson Hyperlegible Next"`,
    { whiteSpace: 'pre-wrap', letterSpacing: -0.035 * BASE_FONT_SIZE },
  )
  const preparedFollowUps = followUps.map((followUp) =>
    prepare(followUp, `400 ${BASE_FONT_SIZE}px "Atkinson Hyperlegible Next"`, {
      whiteSpace: 'pre-wrap',
    }),
  )

  const measureAt = (position: number) => {
    const questionFontSize = questionMinimum + (questionMaximum - questionMinimum) * position
    const followUpFontSize = followUpMinimum + (followUpMaximum - followUpMinimum) * position
    const questionHeight = measuredHeight(
      preparedQuestion,
      contentWidth,
      questionFontSize,
      QUESTION_LINE_HEIGHT,
    )

    if (preparedFollowUps.length === 0) {
      return { questionFontSize, followUpFontSize, requiredHeight: questionHeight }
    }

    const listIndent = 1.6 * followUpFontSize + 0.2 * rootFontSize
    const followUpWidth = Math.max(1, contentWidth - panelPadding * 2 - listIndent)
    let revealedTextHeight = 0
    let maximumPanelHeight = revealButtonHeight

    preparedFollowUps.forEach((preparedFollowUp, index) => {
      revealedTextHeight += measuredHeight(
        preparedFollowUp,
        followUpWidth,
        followUpFontSize,
        FOLLOW_UP_LINE_HEIGHT,
      )
      if (index > 0) revealedTextHeight += listGap

      const hasMoreFollowUps = index < preparedFollowUps.length - 1
      const panelHeight = panelChromeHeight + revealedTextHeight + (hasMoreFollowUps
        ? panelGap + nextButtonMargin + nextButtonHeight
        : 0)
      maximumPanelHeight = Math.max(maximumPanelHeight, panelHeight)
    })

    return {
      questionFontSize,
      followUpFontSize,
      requiredHeight: questionHeight + cardGap + maximumPanelHeight,
    }
  }

  let lower = 0
  let upper = 1
  let best = measureAt(0)

  if (best.requiredHeight <= safeAvailableHeight) {
    for (let iteration = 0; iteration < 16; iteration += 1) {
      const middle = (lower + upper) / 2
      const candidate = measureAt(middle)
      if (candidate.requiredHeight <= safeAvailableHeight) {
        lower = middle
        best = candidate
      } else {
        upper = middle
      }
    }
  }

  return {
    questionFontSize: Math.floor(best.questionFontSize * 10) / 10,
    followUpFontSize: Math.floor(best.followUpFontSize * 10) / 10,
    requiredHeight: best.requiredHeight,
    availableHeight: safeAvailableHeight,
    fits: best.requiredHeight <= safeAvailableHeight,
  }
}
