import './styles.css'

import {
  DEFAULT_CONFIG,
  FEDERAL_TAX_BRACKETS_2026,
  ONTARIO_TAX_BRACKETS_2026,
  computeTaxModel,
  createBracket,
  formatBracketRange,
  formatCurrency,
  formatPercent,
  sanitizeConfig,
} from './model.ts'
import {
  clearStoredConfig,
  clearStoredStageWidthPercent,
  loadStoredConfig,
  loadStoredStageWidthPercent,
  saveStoredConfig,
  saveStoredStageWidthPercent,
} from './storage.ts'
import type {
  AppConfig,
  Bounds,
  BucketLayout,
  Marble,
  Point,
  SceneLayout,
  ScenePhase,
  TaxModel,
} from './types.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'
const DEDUCTION_COLOR = '#5aa8a3'
const TAX_COLOR = '#d85b63'
const NET_PAY_COLOR = '#d7a446'
const MIN_STAGE_WIDTH_PERCENT = 55
const MAX_STAGE_WIDTH_PERCENT = 100
const FIXED_MARBLE_RADIUS = 3.25

type Elements = {
  toolbarShell: HTMLElement
  toolbar: HTMLElement
  incomeInput: HTMLInputElement
  marbleCountInput: HTMLInputElement
  cppRateInput: HTMLInputElement
  eiRateInput: HTMLInputElement
  dollarsPerMarbleOutput: HTMLElement
  phaseHint: HTMLElement
  goButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  controlsToggleButton: HTMLButtonElement
  controlsPanel: HTMLElement
  addBracketButton: HTMLButtonElement
  restoreDefaultsButton: HTMLButtonElement
  overflowNote: HTMLElement
  bracketRows: HTMLTableSectionElement
  bracketSummaryRows: HTMLTableSectionElement
  stageStatus: HTMLElement
  stageShellFrame: HTMLElement
  stageResizeHandle: HTMLButtonElement
  scene: SVGSVGElement
  backgroundLayer: SVGGElement
  labelLayer: SVGGElement
  marblesLayer: SVGGElement
  foregroundLayer: SVGGElement
  incomeValue: HTMLElement
  deductionValue: HTMLElement
  taxValue: HTMLElement
  netValue: HTMLElement
  rateValue: HTMLElement
  appRoot: HTMLElement
}

function queryRequired<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector(selector)
  if (!element) {
    throw new Error(`Missing required element: ${selector}`)
  }
  return element as T
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag)
}

function setAttributes(element: Element, attributes: Record<string, string | number>): void {
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value))
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pointLerp(start: Point, end: Point, progress: number): Point {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  }
}

function easeInCubic(progress: number): number {
  return progress * progress * progress
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function easeInOutSine(progress: number): number {
  return -(Math.cos(Math.PI * progress) - 1) / 2
}

function formatCompactBracketRange(lower: number, upper: number, isOverflow: boolean): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  if (isOverflow) {
    return `${formatter.format(lower)}+`
  }

  return `${formatter.format(lower)}-${formatter.format(upper)}`
}

function formatWholeNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function createShell(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app-shell" data-phase="ready-fill">
      <div class="toolbar-shell">
        <header class="toolbar">
          <div class="toolbar-grid">
          <label class="field field-inline">
            <span>Income</span>
            <input id="income-input" type="text" inputmode="numeric" autocomplete="off" />
          </label>
            <label class="field">
              <span>Marble Count</span>
              <input id="marble-count-input" type="number" min="10" max="480" step="1" />
            </label>
            <div class="field field-readonly">
              <span>Each Marble Represents</span>
              <strong id="dollars-per-marble-output"></strong>
            </div>
            <div class="action-cluster">
              <button id="go-button" class="primary-button" type="button">Go: Fill Brackets</button>
              <button id="reset-button" type="button">Reset</button>
              <button id="toolbar-controls-toggle" class="toolbar-controls-toggle" type="button" aria-expanded="true">
                Bracket Controls
              </button>
            </div>
          </div>
          <p id="phase-hint" class="phase-hint"></p>
          <div id="toolbar-controls-panel" class="toolbar-controls-panel">
            <div class="deduction-controls-grid">
              <label class="field field-inline">
                <span>CPP %</span>
                <input id="cpp-rate-input" type="number" min="0" max="100" step="0.01" />
              </label>
              <label class="field field-inline">
                <span>EI %</span>
                <input id="ei-rate-input" type="number" min="0" max="100" step="0.01" />
              </label>
            </div>
            <p id="overflow-note" class="overflow-note" hidden></p>
            <div class="toolbar-table-wrap">
              <table class="bracket-editor">
                <thead>
                  <tr>
                    <th>Range</th>
                    <th>Bracket Size</th>
                    <th>Tax %</th>
                    <th>Visual Gross</th>
                    <th>Visual Tax</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody id="bracket-rows"></tbody>
              </table>
            </div>
            <div class="toolbar-secondary-actions">
              <button id="add-bracket-button" type="button">Add Bracket</button>
              <button id="restore-defaults-button" type="button">Restore Defaults</button>
            </div>
          </div>
        </header>
      </div>

      <main class="content">
        <section class="stage-card">
          <div class="stage-header">
            <div>
              <h1>Tax Brackets - Marble Visual</h1>
              <p>Fill the CPP and EI deductions bucket plus the tax brackets, drop the withheld marbles into their collectors, then move the remaining marbles into net pay.</p>
            </div>
            <div id="stage-status" class="stage-status"></div>
          </div>
          <div class="stage-shell-wrap">
            <div id="stage-shell-frame" class="stage-shell-frame">
              <div class="stage-shell">
                <svg id="scene" viewBox="0 0 1200 790" aria-label="Tax bracket marble visualization">
                  <g id="background-layer"></g>
                  <g id="label-layer"></g>
                  <g id="marbles-layer"></g>
                  <g id="foreground-layer"></g>
                </svg>
              </div>
              <button
                id="stage-resize-handle"
                class="stage-resize-handle"
                type="button"
                aria-label="Resize visualization width"
                title="Drag to resize visualization width"
              ></button>
            </div>
          </div>
        </section>

        <section class="summary-grid">
          <article class="summary-card">
            <span class="summary-label">Income</span>
            <strong id="income-value"></strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">CPP + CPP2 + EI</span>
            <strong id="deduction-value"></strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Income Tax</span>
            <strong id="tax-value"></strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Net Pay</span>
            <strong id="net-value"></strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Effective Tax Rate</span>
            <strong id="rate-value"></strong>
          </article>
        </section>

        <section class="detail-card">
          <div class="detail-card-header">
            <div>
              <h2>Bracket Breakdown</h2>
              <p>Exact income-tax dollars stay precise. CPP and EI are shown separately in the deductions bucket.</p>
            </div>
          </div>
          <div class="toolbar-table-wrap">
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>Bracket</th>
                  <th>Taxable Income</th>
                  <th>Tax Dollars</th>
                </tr>
              </thead>
              <tbody id="bracket-summary-rows"></tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  `
}

class TaxBracketsMarbleVisualApp {
  private readonly root: HTMLElement
  private readonly elements: Elements
  private readonly isScreenshotMode: boolean
  private config: AppConfig
  private model: TaxModel
  private phase: ScenePhase = 'ready-fill'
  private layout: SceneLayout | null = null
  private marbles: Marble[] = []
  private animationFrame = 0
  private stageWidthPercent = MAX_STAGE_WIDTH_PERCENT
  private toolbarResizeObserver: ResizeObserver | null = null

  constructor(root: HTMLElement) {
    this.root = root
    createShell(root)

    this.elements = {
      toolbarShell: queryRequired(root, '.toolbar-shell'),
      toolbar: queryRequired(root, '.toolbar'),
      incomeInput: queryRequired(root, '#income-input'),
      marbleCountInput: queryRequired(root, '#marble-count-input'),
      cppRateInput: queryRequired(root, '#cpp-rate-input'),
      eiRateInput: queryRequired(root, '#ei-rate-input'),
      dollarsPerMarbleOutput: queryRequired(root, '#dollars-per-marble-output'),
      phaseHint: queryRequired(root, '#phase-hint'),
      goButton: queryRequired(root, '#go-button'),
      resetButton: queryRequired(root, '#reset-button'),
      controlsToggleButton: queryRequired(root, '#toolbar-controls-toggle'),
      controlsPanel: queryRequired(root, '#toolbar-controls-panel'),
      addBracketButton: queryRequired(root, '#add-bracket-button'),
      restoreDefaultsButton: queryRequired(root, '#restore-defaults-button'),
      overflowNote: queryRequired(root, '#overflow-note'),
      bracketRows: queryRequired(root, '#bracket-rows'),
      bracketSummaryRows: queryRequired(root, '#bracket-summary-rows'),
      stageStatus: queryRequired(root, '#stage-status'),
      stageShellFrame: queryRequired(root, '#stage-shell-frame'),
      stageResizeHandle: queryRequired(root, '#stage-resize-handle'),
      scene: queryRequired(root, '#scene'),
      backgroundLayer: queryRequired(root, '#background-layer'),
      labelLayer: queryRequired(root, '#label-layer'),
      marblesLayer: queryRequired(root, '#marbles-layer'),
      foregroundLayer: queryRequired(root, '#foreground-layer'),
      incomeValue: queryRequired(root, '#income-value'),
      deductionValue: queryRequired(root, '#deduction-value'),
      taxValue: queryRequired(root, '#tax-value'),
      netValue: queryRequired(root, '#net-value'),
      rateValue: queryRequired(root, '#rate-value'),
      appRoot: queryRequired(root, '.app-shell'),
    }

    this.isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === '1'
    this.config = sanitizeConfig(loadStoredConfig() ?? DEFAULT_CONFIG)
    this.model = computeTaxModel(this.config)
    this.stageWidthPercent = this.normalizeStageWidth(loadStoredStageWidthPercent() ?? MAX_STAGE_WIDTH_PERCENT)

    this.attachEvents()
    this.attachToolbarObserver()
    this.render()

    if (this.isScreenshotMode) {
      this.placeCompletedPreviewState()
    }
  }

  private attachEvents(): void {
    this.elements.incomeInput.addEventListener('input', () => {
      this.formatWholeNumberInput(this.elements.incomeInput)
    })

    this.elements.incomeInput.addEventListener('change', () => {
      this.updateIncomePreservingMarbleValue(
        this.parseWholeNumber(this.elements.incomeInput.value, this.config.income),
      )
    })

    this.elements.incomeInput.addEventListener('blur', () => {
      this.elements.incomeInput.value = formatWholeNumber(
        this.parseWholeNumber(this.elements.incomeInput.value, this.config.income),
      )
    })

    this.elements.marbleCountInput.addEventListener('change', () => {
      this.updateConfig({
        marbleCount: this.parseWholeNumber(this.elements.marbleCountInput.value, this.config.marbleCount),
      })
    })

    this.elements.cppRateInput.addEventListener('change', () => {
      this.updateConfig({
        deductions: {
          ...this.config.deductions,
          cppRate: clamp(Number(this.elements.cppRateInput.value) || 0, 0, 100),
        },
      })
    })

    this.elements.eiRateInput.addEventListener('change', () => {
      this.updateConfig({
        deductions: {
          ...this.config.deductions,
          eiRate: clamp(Number(this.elements.eiRateInput.value) || 0, 0, 100),
        },
      })
    })

    this.elements.goButton.addEventListener('click', () => {
      if (this.phase === 'ready-fill') {
        this.runFillAnimation()
        return
      }
      if (this.phase === 'ready-tax') {
        this.runTaxAnimation()
        return
      }
      if (this.phase === 'ready-take-home') {
        this.runTakeHomeAnimation()
        return
      }
      if (this.phase === 'complete') {
        this.resetVisualization()
      }
    })

    this.elements.resetButton.addEventListener('click', () => {
      this.resetVisualization()
    })

    this.elements.controlsToggleButton.addEventListener('click', () => {
      const isExpanded = this.elements.controlsToggleButton.getAttribute('aria-expanded') === 'true'
      this.elements.controlsToggleButton.setAttribute('aria-expanded', String(!isExpanded))
      this.elements.controlsPanel.hidden = isExpanded
      this.syncToolbarOffset()
    })

    this.attachStageResizeEvents()

    this.elements.addBracketButton.addEventListener('click', () => {
      if (this.config.brackets.length >= 8) return
      this.updateConfig({
        brackets: [...this.config.brackets, createBracket()],
      })
    })

    this.elements.restoreDefaultsButton.addEventListener('click', () => {
      clearStoredConfig()
      clearStoredStageWidthPercent()
      this.config = sanitizeConfig(DEFAULT_CONFIG)
      this.model = computeTaxModel(this.config)
      this.stageWidthPercent = MAX_STAGE_WIDTH_PERCENT
      this.render()
    })

    this.elements.bracketRows.addEventListener('change', (event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLButtonElement)) return

      const row = target.closest('tr')
      if (!(row instanceof HTMLTableRowElement)) return
      const index = Number(row.dataset.index)
      if (!Number.isInteger(index)) return

      if (target instanceof HTMLButtonElement && target.dataset.action === 'remove') {
        if (this.config.brackets.length <= 1) return
        this.updateConfig({
          brackets: this.config.brackets.filter((_, bracketIndex) => bracketIndex !== index),
        })
        return
      }

      if (!(target instanceof HTMLInputElement)) return
      const field = target.dataset.field
      if (!field) return

      const nextBrackets = [...this.config.brackets]
      const current = nextBrackets[index]
      if (!current) return

      if (field === 'size') {
        current.size = this.parseWholeNumber(target.value, current.size)
      }
      if (field === 'rate') {
        current.rate = clamp(Number(target.value) || 0, 0, 100)
      }

      this.updateConfig({ brackets: nextBrackets })
    })
  }

  private parseWholeNumber(raw: string, fallback: number): number {
    const normalized = raw.replace(/[^\d.-]/g, '')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return fallback
    return Math.round(parsed)
  }

  private formatWholeNumberInput(input: HTMLInputElement): void {
    const currentValue = input.value
    const selectionStart = input.selectionStart ?? currentValue.length
    const digitsBeforeCaret = currentValue.slice(0, selectionStart).replace(/\D/g, '').length
    const digitsOnly = currentValue.replace(/\D/g, '')

    if (digitsOnly.length === 0) {
      input.value = ''
      return
    }

    const formatted = formatWholeNumber(Number.parseInt(digitsOnly, 10))
    input.value = formatted

    let nextCaret = formatted.length
    if (digitsBeforeCaret === 0) {
      nextCaret = 0
    } else {
      let seenDigits = 0
      for (let index = 0; index < formatted.length; index += 1) {
        if (/\d/.test(formatted[index] ?? '')) {
          seenDigits += 1
        }
        if (seenDigits >= digitsBeforeCaret) {
          nextCaret = index + 1
          break
        }
      }
    }

    input.setSelectionRange(nextCaret, nextCaret)
  }

  private updateIncomePreservingMarbleValue(nextIncome: number): void {
    const currentDollarsPerMarble = this.model.dollarsPerMarble
    if (currentDollarsPerMarble <= 0) {
      this.updateConfig({ income: nextIncome })
      return
    }

    this.updateConfig({
      income: nextIncome,
      marbleCount: Math.max(1, Math.round(nextIncome / currentDollarsPerMarble)),
    })
  }

  private updateConfig(patch: Partial<AppConfig>): void {
    this.config = sanitizeConfig({
      ...this.config,
      ...patch,
    })
    this.model = computeTaxModel(this.config)
    saveStoredConfig(this.config)
    this.render()
  }

  private syncToolbarOffset(): void {
    this.elements.appRoot.style.setProperty('--toolbar-height', `${this.elements.toolbarShell.offsetHeight}px`)
  }

  private attachToolbarObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.toolbarResizeObserver = new ResizeObserver(() => {
        this.syncToolbarOffset()
      })
      this.toolbarResizeObserver.observe(this.elements.toolbarShell)
    }

    window.addEventListener('resize', () => {
      this.syncToolbarOffset()
    })
  }

  private normalizeStageWidth(percent: number): number {
    return clamp(Math.round(percent * 10) / 10, MIN_STAGE_WIDTH_PERCENT, MAX_STAGE_WIDTH_PERCENT)
  }

  private applyStageWidth(): void {
    this.elements.stageShellFrame.style.width = `${this.stageWidthPercent}%`
  }

  private setStageWidthPercent(percent: number, persist = true): void {
    this.stageWidthPercent = this.normalizeStageWidth(percent)
    this.applyStageWidth()
    if (persist) {
      saveStoredStageWidthPercent(this.stageWidthPercent)
    }
  }

  private attachStageResizeEvents(): void {
    const handle = this.elements.stageResizeHandle
    const frame = this.elements.stageShellFrame
    let activePointerId: number | null = null

    const updateWidthFromClientX = (clientX: number, persist: boolean): void => {
      const rect = frame.parentElement?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return

      const centerX = rect.left + rect.width / 2
      const nextWidthPercent = ((clientX - centerX) * 2 * 100) / rect.width
      this.setStageWidthPercent(nextWidthPercent, persist)
    }

    const finishDrag = (): void => {
      activePointerId = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveStoredStageWidthPercent(this.stageWidthPercent)
    }

    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      activePointerId = event.pointerId
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      updateWidthFromClientX(event.clientX, false)
      event.preventDefault()
    })

    handle.addEventListener('pointermove', (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return
      updateWidthFromClientX(event.clientX, false)
    })

    handle.addEventListener('pointerup', (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return
      handle.releasePointerCapture(event.pointerId)
      finishDrag()
    })

    handle.addEventListener('pointercancel', (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return
      finishDrag()
    })

    handle.addEventListener('lostpointercapture', () => {
      if (activePointerId === null) return
      finishDrag()
    })
  }

  private render(): void {
    this.cancelAnimation()
    this.renderToolbar()
    this.renderSummary()
    this.layout = this.buildSceneLayout(this.model)
    this.renderStaticScene(this.layout)
    this.createMarbles(this.layout)
    this.applyStageWidth()
    this.syncToolbarOffset()
    this.resetVisualization()
  }

  private renderToolbar(): void {
    this.elements.incomeInput.value = formatWholeNumber(this.config.income)
    this.elements.marbleCountInput.value = String(this.config.marbleCount)
    this.elements.cppRateInput.value = this.config.deductions.cppRate.toFixed(2)
    this.elements.eiRateInput.value = this.config.deductions.eiRate.toFixed(2)
    this.elements.dollarsPerMarbleOutput.textContent =
      this.model.visualMarbleCount > 0 ? formatCurrency(this.model.dollarsPerMarble) : '$0'

    this.elements.overflowNote.hidden = this.model.overflowIncome <= 0
    this.elements.overflowNote.textContent =
      this.model.overflowIncome > 0
        ? `The editable brackets cover ${formatCurrency(this.model.configuredBracketCapacity)}. A derived overflow bucket was added for the remaining ${formatCurrency(this.model.overflowIncome)} at the final rate so every marble still has a bracket.`
        : ''

    this.elements.bracketRows.replaceChildren()

    let lowerBound = 0
    this.config.brackets.forEach((bracket, index) => {
      const matchingModel = this.model.brackets.find((item) => item.id === bracket.id)
      const upperBound = lowerBound + bracket.size
      const row = document.createElement('tr')
      row.dataset.index = String(index)
      row.innerHTML = `
        <td class="range-cell"><strong>${formatBracketRange(lowerBound, upperBound, matchingModel?.isOverflow ?? false)}</strong></td>
        <td><input data-field="size" type="number" min="1" max="10000000" step="100" value="${bracket.size}" /></td>
        <td><input data-field="rate" type="number" min="0" max="100" step="0.25" value="${bracket.rate}" /></td>
        <td>${matchingModel?.grossMarbles ?? 0}</td>
        <td>${matchingModel?.taxedMarbles ?? 0}</td>
        <td><button data-action="remove" type="button" ${this.config.brackets.length <= DEFAULT_CONFIG.brackets.length ? 'disabled' : ''}>Remove</button></td>
      `
      this.elements.bracketRows.appendChild(row)
      lowerBound = upperBound
    })

    this.elements.addBracketButton.disabled = this.config.brackets.length >= DEFAULT_CONFIG.brackets.length
  }

  private renderSummary(): void {
    this.elements.incomeValue.textContent = formatCurrency(this.model.config.income)
    this.elements.deductionValue.textContent = formatCurrency(this.model.deductionDollars)
    this.elements.taxValue.textContent = formatCurrency(this.model.totalTaxDollars)
    this.elements.netValue.textContent = formatCurrency(this.model.netIncome)
    this.elements.rateValue.textContent = formatPercent(this.model.effectiveRate)

    this.elements.bracketSummaryRows.replaceChildren()
    this.model.brackets.forEach((bracket) => {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td>
          <strong>${formatBracketRange(bracket.lowerBound, bracket.upperBound, bracket.isOverflow)}</strong>
          ${bracket.isOverflow ? '<span class="summary-note">Derived overflow bucket</span>' : ''}
        </td>
        <td>${formatCurrency(bracket.taxableIncome)}</td>
        <td>${formatCurrency(bracket.taxDollars)}</td>
      `
      this.elements.bracketSummaryRows.appendChild(row)
    })
  }

  private buildSceneLayout(model: TaxModel): SceneLayout {
    const width = 1200
    const height = 790
    const railY = 220
    const funnelY = 582
    const jarBounds: Bounds = { x: 60, y: 62, width: 168, height: 142 }
    const deductionBounds: Bounds = { x: 62, y: 610, width: 208, height: 58 }
    const taxBounds: Bounds = { x: 308, y: 610, width: 252, height: 58 }
    const takeHomeBounds: Bounds = { x: 598, y: 610, width: 522, height: 58 }
    const bodyBottomY = 470
    const tipY = 526
    const deductionBucketLeft = 248
    const deductionBucketWidth = 104
    const bucketLeft = 390
    const bucketAreaWidth = 700
    const gap = 18
    const bucketCount = model.brackets.length
    const bucketWidth = (bucketAreaWidth - gap * Math.max(0, bucketCount - 1)) / Math.max(1, bucketCount)
    const minRate = Math.min(model.deductionRate * 100, ...model.brackets.map((bracket) => bracket.rate))
    const maxRate = Math.max(model.deductionRate * 100, ...model.brackets.map((bracket) => bracket.rate))
    const shortestBucketTopY = 332
    const tallestBucketTopY = 234

    const getTopYForRate = (rate: number): number => {
      const rateProgress = maxRate > minRate ? (rate - minRate) / (maxRate - minRate) : 0.5
      return shortestBucketTopY - (shortestBucketTopY - tallestBucketTopY) * rateProgress
    }

    const deductionBucket: BucketLayout = {
      index: -1,
      x: deductionBucketLeft,
      width: deductionBucketWidth,
      topY: getTopYForRate(model.deductionRate * 100),
      bodyBottomY,
      tipY,
      outlet: {
        x: deductionBucketLeft + deductionBucketWidth / 2,
        y: tipY + 6,
      },
      slotBounds: {
        x: deductionBucketLeft + 14,
        y: getTopYForRate(model.deductionRate * 100) + 18,
        width: deductionBucketWidth - 28,
        height: bodyBottomY - getTopYForRate(model.deductionRate * 100) - 34,
      },
      labelX: deductionBucketLeft + deductionBucketWidth / 2,
      labelY: 140,
      color: DEDUCTION_COLOR,
    }

    const buckets: BucketLayout[] = model.brackets.map((_, index) => {
      const x = bucketLeft + index * (bucketWidth + gap)
      const bracketRate = model.brackets[index]?.rate ?? minRate
      const topY = getTopYForRate(bracketRate)

      return {
        index,
        x,
        width: bucketWidth,
        topY,
        bodyBottomY,
        tipY,
        outlet: {
          x: x + bucketWidth / 2,
          y: tipY + 6,
        },
        slotBounds: {
          x: x + 18,
          y: topY + 18,
          width: bucketWidth - 36,
          height: bodyBottomY - topY - 34,
        },
        labelX: x + bucketWidth / 2,
        labelY: 140,
        color: TAX_COLOR,
      }
    })

    const marbleRadius = FIXED_MARBLE_RADIUS

    return {
      width,
      height,
      railY,
      spout: { x: 144, y: 206 },
      jarBounds,
      jarSlots: this.createGridSlots(jarBounds, model.visualMarbleCount, marbleRadius, 2),
      marbleRadius,
      deductionBucket,
      deductionBucketSlots: this.createGridSlots(deductionBucket.slotBounds, model.deductionMarbles, marbleRadius, 6),
      buckets,
      bucketSlots: buckets.map((bucket, index) =>
        this.createGridSlots(bucket.slotBounds, model.brackets[index]?.grossMarbles ?? 0, marbleRadius, index + 10),
      ),
      deductionBounds,
      deductionSlots: this.createGridSlots(deductionBounds, model.deductionMarbles, marbleRadius, 72),
      taxBounds,
      taxSlots: this.createGridSlots(taxBounds, model.totalTaxedMarbles, marbleRadius, 90),
      takeHomeBounds,
      takeHomeSlots: this.createGridSlots(takeHomeBounds, model.totalUntaxedMarbles, marbleRadius, 130),
      funnelY,
    }
  }

  private createGridSlots(bounds: Bounds, count: number, radius: number, seedOffset: number): Point[] {
    if (count <= 0) return []

    const gap = Math.max(1.5, radius * 0.35)
    const pitch = radius * 2 + gap
    const columns = Math.max(1, Math.floor((bounds.width + gap) / pitch))
    const slots: Point[] = []

    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns)
      const column = index % columns
      const itemsInRow = Math.min(columns, count - row * columns)
      const rowWidth = itemsInRow * (radius * 2) + (itemsInRow - 1) * gap
      const startX = bounds.x + (bounds.width - rowWidth) / 2 + radius
      const baseX = startX + column * pitch
      const baseY = bounds.y + bounds.height - radius - row * pitch
      const jitterScale = Math.min(radius * 0.22, 1.8)
      const jitterX = (seededNoise(index + seedOffset * 19) - 0.5) * jitterScale
      const jitterY = (seededNoise(index + seedOffset * 23 + 100) - 0.5) * jitterScale

      slots.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
      })
    }

    return slots
  }

  private renderStaticScene(layout: SceneLayout): void {
    this.elements.backgroundLayer.replaceChildren()
    this.elements.labelLayer.replaceChildren()
    this.elements.foregroundLayer.replaceChildren()

    const existingDefs = this.elements.scene.querySelector('defs')
    if (existingDefs) existingDefs.remove()

    const defs = createSvgElement('defs')
    const glassGradient = createSvgElement('linearGradient')
    setAttributes(glassGradient, { id: 'glass-gradient', x1: '0%', y1: '0%', x2: '0%', y2: '100%' })
    const topStop = createSvgElement('stop')
    setAttributes(topStop, { offset: '0%', 'stop-color': '#f7fbff', 'stop-opacity': 0.7 })
    const bottomStop = createSvgElement('stop')
    setAttributes(bottomStop, { offset: '100%', 'stop-color': '#d8e6f3', 'stop-opacity': 0.18 })
    glassGradient.append(topStop, bottomStop)
    defs.appendChild(glassGradient)
    this.elements.scene.prepend(defs)

    const background = createSvgElement('rect')
    setAttributes(background, {
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
      fill: '#f2efe8',
      rx: 20,
    })
    this.elements.backgroundLayer.appendChild(background)

    const rail = createSvgElement('path')
    setAttributes(rail, {
      d: `M ${layout.spout.x} ${layout.spout.y} L 250 ${layout.railY} L 1114 ${layout.railY}`,
      stroke: '#4d463d',
      'stroke-width': 10,
      'stroke-linecap': 'round',
      fill: 'none',
    })
    this.elements.backgroundLayer.appendChild(rail)

    const deductionTrough = createSvgElement('rect')
    setAttributes(deductionTrough, {
      x: layout.deductionBounds.x - 12,
      y: layout.deductionBounds.y - 8,
      width: layout.deductionBounds.width + 24,
      height: layout.deductionBounds.height + 14,
      rx: 30,
      fill: '#b7ded8',
      stroke: '#2e706e',
      'stroke-width': 4,
    })
    this.elements.backgroundLayer.appendChild(deductionTrough)

    const taxTrough = createSvgElement('rect')
    setAttributes(taxTrough, {
      x: layout.taxBounds.x - 12,
      y: layout.taxBounds.y - 8,
      width: layout.taxBounds.width + 24,
      height: layout.taxBounds.height + 14,
      rx: 30,
      fill: '#f5c3c7',
      stroke: TAX_COLOR,
      'stroke-width': 4,
    })
    this.elements.backgroundLayer.appendChild(taxTrough)

    const takeHomeTrough = createSvgElement('rect')
    setAttributes(takeHomeTrough, {
      x: layout.takeHomeBounds.x - 12,
      y: layout.takeHomeBounds.y - 8,
      width: layout.takeHomeBounds.width + 24,
      height: layout.takeHomeBounds.height + 14,
      rx: 30,
      fill: '#f5d39f',
      stroke: '#8d5f28',
      'stroke-width': 4,
    })
    this.elements.backgroundLayer.appendChild(takeHomeTrough)

    const jug = createSvgElement('path')
    setAttributes(jug, {
      d: `
        M 82 54
        L 206 54
        Q 220 54 220 70
        L 220 116
        Q 220 136 206 146
        L 176 168
        L 176 204
        Q 176 214 166 216
        L 122 216
        Q 112 214 112 204
        L 112 168
        L 82 146
        Q 68 136 68 116
        L 68 70
        Q 68 54 82 54
        Z
      `,
      fill: 'url(#glass-gradient)',
      stroke: '#506f8d',
      'stroke-width': 4,
    })
    this.elements.foregroundLayer.appendChild(jug)

    const grossTitle = createSvgElement('text')
    setAttributes(grossTitle, {
      x: 144,
      y: 250,
      'text-anchor': 'middle',
      class: 'scene-label',
    })
    grossTitle.textContent = 'Gross Income'
    this.elements.labelLayer.appendChild(grossTitle)

    const grossValue = createSvgElement('text')
    setAttributes(grossValue, {
      x: 144,
      y: 278,
      'text-anchor': 'middle',
      class: 'scene-value',
    })
    grossValue.textContent = formatCurrency(this.model.config.income)
    this.elements.labelLayer.appendChild(grossValue)

    const deductionTitle = createSvgElement('text')
    setAttributes(deductionTitle, {
      x: layout.deductionBounds.x + layout.deductionBounds.width / 2,
      y: layout.deductionBounds.y + layout.deductionBounds.height + 28,
      'text-anchor': 'middle',
      class: 'collector-label collector-label-deduction',
    })
    deductionTitle.textContent = 'CPP + CPP2 + EI'
    this.elements.labelLayer.appendChild(deductionTitle)

    const deductionValue = createSvgElement('text')
    setAttributes(deductionValue, {
      x: layout.deductionBounds.x + layout.deductionBounds.width / 2,
      y: layout.deductionBounds.y + layout.deductionBounds.height + 58,
      'text-anchor': 'middle',
      class: 'collector-value collector-value-deduction',
    })
    deductionValue.textContent = formatCurrency(this.model.deductionDollars)
    this.elements.labelLayer.appendChild(deductionValue)

    const deductionMeta = createSvgElement('text')
    setAttributes(deductionMeta, {
      x: layout.deductionBounds.x + layout.deductionBounds.width / 2,
      y: layout.deductionBounds.y + layout.deductionBounds.height + 84,
      'text-anchor': 'middle',
      class: 'collector-meta',
    })
    deductionMeta.textContent = `CPP ${formatCurrency(this.model.cppContribution)} + CPP2 ${formatCurrency(this.model.cpp2Contribution)} + EI ${formatCurrency(this.model.eiContribution)}`
    this.elements.labelLayer.appendChild(deductionMeta)

    const taxTitle = createSvgElement('text')
    setAttributes(taxTitle, {
      x: layout.taxBounds.x + layout.taxBounds.width / 2,
      y: layout.taxBounds.y + layout.taxBounds.height + 28,
      'text-anchor': 'middle',
      class: 'collector-label',
    })
    taxTitle.textContent = 'Income Tax'
    this.elements.labelLayer.appendChild(taxTitle)

    const taxValue = createSvgElement('text')
    setAttributes(taxValue, {
      x: layout.taxBounds.x + layout.taxBounds.width / 2,
      y: layout.taxBounds.y + layout.taxBounds.height + 58,
      'text-anchor': 'middle',
      class: 'collector-value',
    })
    taxValue.textContent = formatCurrency(this.model.totalTaxDollars)
    this.elements.labelLayer.appendChild(taxValue)

    const taxMeta = createSvgElement('text')
    setAttributes(taxMeta, {
      x: layout.taxBounds.x + layout.taxBounds.width / 2,
      y: layout.taxBounds.y + layout.taxBounds.height + 84,
      'text-anchor': 'middle',
      class: 'collector-meta',
    })
    taxMeta.textContent = `Effective rate ${formatPercent(this.model.effectiveRate)}`
    this.elements.labelLayer.appendChild(taxMeta)

    const takeHomeTitle = createSvgElement('text')
    setAttributes(takeHomeTitle, {
      x: layout.takeHomeBounds.x + layout.takeHomeBounds.width / 2,
      y: layout.takeHomeBounds.y + layout.takeHomeBounds.height + 28,
      'text-anchor': 'middle',
      class: 'collector-label collector-label-take-home',
    })
    takeHomeTitle.textContent = 'Net Pay'
    this.elements.labelLayer.appendChild(takeHomeTitle)

    const takeHomeValue = createSvgElement('text')
    setAttributes(takeHomeValue, {
      x: layout.takeHomeBounds.x + layout.takeHomeBounds.width / 2,
      y: layout.takeHomeBounds.y + layout.takeHomeBounds.height + 58,
      'text-anchor': 'middle',
      class: 'collector-value collector-value-take-home',
    })
    takeHomeValue.textContent = formatCurrency(this.model.netIncome)
    this.elements.labelLayer.appendChild(takeHomeValue)

    const deductionGuide = createSvgElement('path')
    setAttributes(deductionGuide, {
      d: `M ${layout.deductionBucket.outlet.x} ${layout.deductionBucket.outlet.y} C ${layout.deductionBucket.outlet.x - 12} ${layout.funnelY - 26}, ${layout.deductionBounds.x + layout.deductionBounds.width / 2} ${layout.funnelY - 8}, ${layout.deductionBounds.x + layout.deductionBounds.width / 2} ${layout.deductionBounds.y - 2}`,
      fill: 'none',
      stroke: `${layout.deductionBucket.color}88`,
      'stroke-width': 6,
      'stroke-linecap': 'round',
      'stroke-dasharray': '10 8',
    })
    this.elements.backgroundLayer.appendChild(deductionGuide)

    const deductionBucketFill = createSvgElement('path')
    setAttributes(deductionBucketFill, {
      d: `
        M ${layout.deductionBucket.x} ${layout.deductionBucket.topY}
        L ${layout.deductionBucket.x + layout.deductionBucket.width} ${layout.deductionBucket.topY}
        L ${layout.deductionBucket.x + layout.deductionBucket.width - 18} ${layout.deductionBucket.bodyBottomY}
        L ${layout.deductionBucket.x + layout.deductionBucket.width / 2} ${layout.deductionBucket.tipY}
        L ${layout.deductionBucket.x + 18} ${layout.deductionBucket.bodyBottomY}
        Z
      `,
      fill: `${layout.deductionBucket.color}24`,
      stroke: layout.deductionBucket.color,
      'stroke-width': 4,
    })
    this.elements.backgroundLayer.appendChild(deductionBucketFill)

    const deductionLip = createSvgElement('line')
    setAttributes(deductionLip, {
      x1: layout.deductionBucket.x - 2,
      y1: layout.deductionBucket.topY,
      x2: layout.deductionBucket.x + layout.deductionBucket.width + 2,
      y2: layout.deductionBucket.topY,
      stroke: '#403a34',
      'stroke-width': 8,
      'stroke-linecap': 'round',
    })
    this.elements.foregroundLayer.appendChild(deductionLip)

    const deductionSticky = createSvgElement('rect')
    setAttributes(deductionSticky, {
      x: layout.deductionBucket.labelX - 74,
      y: 58,
      width: 148,
      height: 66,
      rx: 8,
      fill: '#d6f4ee',
      stroke: 'rgba(64, 59, 47, 0.18)',
      'stroke-width': 2,
    })
    this.elements.labelLayer.appendChild(deductionSticky)

    const deductionRateText = createSvgElement('text')
    setAttributes(deductionRateText, {
      x: layout.deductionBucket.labelX,
      y: 102,
      'text-anchor': 'middle',
      class: 'bucket-rate bucket-rate-deduction',
    })
    deductionRateText.textContent = `${(this.model.deductionRate * 100).toFixed(2)}%`
    this.elements.labelLayer.appendChild(deductionRateText)

    const deductionRangeText = createSvgElement('text')
    setAttributes(deductionRangeText, {
      x: layout.deductionBucket.labelX,
      y: 148,
      'text-anchor': 'middle',
      class: 'bucket-range',
    })
    deductionRangeText.textContent = 'CPP / CPP2 / EI'
    this.elements.labelLayer.appendChild(deductionRangeText)

    const deductionBucketLabel = createSvgElement('text')
    setAttributes(deductionBucketLabel, {
      x: layout.deductionBucket.labelX,
      y: layout.deductionBucket.tipY + 30,
      'text-anchor': 'middle',
      class: 'bucket-subrate',
    })
    deductionBucketLabel.textContent = 'Canadian deductions'
    this.elements.labelLayer.appendChild(deductionBucketLabel)

    const firstTaxBucket = layout.buckets[0]
    if (firstTaxBucket) {
      const taxedIncomeAmount = Math.max(0, this.model.config.income - this.model.deductionDollars)
      const taxedIncomeX = (layout.deductionBucket.labelX + firstTaxBucket.labelX) / 2

      const taxedIncomeLabel = createSvgElement('text')
      setAttributes(taxedIncomeLabel, {
        x: taxedIncomeX,
        y: layout.railY + 28,
        'text-anchor': 'middle',
        class: 'transition-label',
      })
      taxedIncomeLabel.textContent = 'Taxed Income'
      this.elements.labelLayer.appendChild(taxedIncomeLabel)

      const taxedIncomeValue = createSvgElement('text')
      setAttributes(taxedIncomeValue, {
        x: taxedIncomeX,
        y: layout.railY + 52,
        'text-anchor': 'middle',
        class: 'transition-value',
      })
      taxedIncomeValue.textContent = formatCurrency(taxedIncomeAmount)
      this.elements.labelLayer.appendChild(taxedIncomeValue)
    }

    const lastTaxBucket = layout.buckets.at(-1)
    if (firstTaxBucket && lastTaxBucket) {
      const labelWidth = Math.min(122, Math.max(104, firstTaxBucket.width - 12))
      const federalRowY = 36
      const provincialRowY = 114
      const rowLabelX = firstTaxBucket.labelX - labelWidth / 2 - 28

      const federalRowLabel = createSvgElement('text')
      setAttributes(federalRowLabel, {
        x: rowLabelX,
        y: federalRowY + 32,
        'text-anchor': 'end',
        class: 'tax-row-label',
      })
      federalRowLabel.textContent = 'Federal'
      this.elements.labelLayer.appendChild(federalRowLabel)

      const provincialRowLabel = createSvgElement('text')
      setAttributes(provincialRowLabel, {
        x: rowLabelX,
        y: provincialRowY + 32,
        'text-anchor': 'end',
        class: 'tax-row-label',
      })
      provincialRowLabel.textContent = 'Ontario'
      this.elements.labelLayer.appendChild(provincialRowLabel)

      layout.buckets.forEach((bucket, index) => {
        const federal = FEDERAL_TAX_BRACKETS_2026[index]
        const provincial = ONTARIO_TAX_BRACKETS_2026[index]
        if (!federal || !provincial) return

        const federalSticky = createSvgElement('rect')
        setAttributes(federalSticky, {
          x: bucket.labelX - labelWidth / 2,
          y: federalRowY,
          width: labelWidth,
          height: 52,
          rx: 8,
          fill: '#f6e86b',
          stroke: 'rgba(64, 59, 47, 0.18)',
          'stroke-width': 2,
        })
        this.elements.labelLayer.appendChild(federalSticky)

        const federalRateText = createSvgElement('text')
        setAttributes(federalRateText, {
          x: bucket.labelX,
          y: federalRowY + 35,
          'text-anchor': 'middle',
          class: 'tax-chip-rate',
        })
        federalRateText.textContent = `${federal.rate}%`
        this.elements.labelLayer.appendChild(federalRateText)

        const federalRangeText = createSvgElement('text')
        setAttributes(federalRangeText, {
          x: bucket.labelX,
          y: federalRowY + 70,
          'text-anchor': 'middle',
          class: 'tax-chip-range',
        })
        federalRangeText.textContent = formatCompactBracketRange(federal.lower, federal.upper ?? 0, federal.upper === null)
        this.elements.labelLayer.appendChild(federalRangeText)

        const provincialSticky = createSvgElement('rect')
        setAttributes(provincialSticky, {
          x: bucket.labelX - labelWidth / 2,
          y: provincialRowY,
          width: labelWidth,
          height: 52,
          rx: 8,
          fill: '#f6e86b',
          stroke: 'rgba(64, 59, 47, 0.18)',
          'stroke-width': 2,
        })
        this.elements.labelLayer.appendChild(provincialSticky)

        const provincialRateText = createSvgElement('text')
        setAttributes(provincialRateText, {
          x: bucket.labelX,
          y: provincialRowY + 35,
          'text-anchor': 'middle',
          class: 'tax-chip-rate tax-chip-rate-provincial',
        })
        provincialRateText.textContent = `${provincial.rate}%`
        this.elements.labelLayer.appendChild(provincialRateText)

        const provincialRangeText = createSvgElement('text')
        setAttributes(provincialRangeText, {
          x: bucket.labelX,
          y: provincialRowY + 70,
          'text-anchor': 'middle',
          class: 'tax-chip-range',
        })
        provincialRangeText.textContent = formatCompactBracketRange(
          provincial.lower,
          provincial.upper ?? 0,
          provincial.upper === null,
        )
        this.elements.labelLayer.appendChild(provincialRangeText)
      })
    }

    layout.buckets.forEach((bucket, index) => {
      const taxGuideTargetX =
        layout.taxBounds.x + 42 +
        (index / Math.max(1, layout.buckets.length - 1)) * (layout.taxBounds.width - 84)
      const takeHomeGuideTargetX =
        layout.takeHomeBounds.x + 42 +
        (index / Math.max(1, layout.buckets.length - 1)) * (layout.takeHomeBounds.width - 84)

      const taxGuide = createSvgElement('path')
      setAttributes(taxGuide, {
        d: `M ${bucket.outlet.x} ${bucket.outlet.y} C ${bucket.outlet.x} ${layout.funnelY - 16}, ${taxGuideTargetX} ${layout.funnelY - 8}, ${taxGuideTargetX} ${layout.taxBounds.y - 2}`,
        fill: 'none',
        stroke: `${bucket.color}88`,
        'stroke-width': 6,
        'stroke-linecap': 'round',
        'stroke-dasharray': '10 8',
      })
      this.elements.backgroundLayer.appendChild(taxGuide)

      const takeHomeGuide = createSvgElement('path')
      setAttributes(takeHomeGuide, {
        d: `M ${bucket.outlet.x} ${bucket.outlet.y} C ${bucket.outlet.x + 48} ${layout.funnelY - 20}, ${takeHomeGuideTargetX} ${layout.funnelY - 14}, ${takeHomeGuideTargetX} ${layout.takeHomeBounds.y - 2}`,
        fill: 'none',
        stroke: `${bucket.color}40`,
        'stroke-width': 5,
        'stroke-linecap': 'round',
        'stroke-dasharray': '6 10',
      })
      this.elements.backgroundLayer.appendChild(takeHomeGuide)

      const bucketFill = createSvgElement('path')
      setAttributes(bucketFill, {
        d: `
          M ${bucket.x} ${bucket.topY}
          L ${bucket.x + bucket.width} ${bucket.topY}
          L ${bucket.x + bucket.width - 18} ${bucket.bodyBottomY}
          L ${bucket.x + bucket.width / 2} ${bucket.tipY}
          L ${bucket.x + 18} ${bucket.bodyBottomY}
          Z
        `,
        fill: `${bucket.color}24`,
        stroke: bucket.color,
        'stroke-width': 4,
      })
      this.elements.backgroundLayer.appendChild(bucketFill)

      const lip = createSvgElement('line')
      setAttributes(lip, {
        x1: bucket.x - 2,
        y1: bucket.topY,
        x2: bucket.x + bucket.width + 2,
        y2: bucket.topY,
        stroke: '#403a34',
        'stroke-width': 8,
        'stroke-linecap': 'round',
      })
      this.elements.foregroundLayer.appendChild(lip)
    })
  }

  private createMarbles(layout: SceneLayout): void {
    this.elements.marblesLayer.replaceChildren()
    this.marbles = []

    const jarSlots = [...layout.jarSlots]
    for (let index = jarSlots.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(seededNoise(index + 40) * (index + 1))
      const current = jarSlots[index]
      const swap = jarSlots[swapIndex]
      if (!current || !swap) continue
      jarSlots[index] = swap
      jarSlots[swapIndex] = current
    }

    let marbleId = 0
    let fillOrder = 0
    let withholdingOrder = 0
    let takeHomeOrder = 0
    let jarSlotIndex = 0
    let deductionCollectorSlotIndex = 0
    let taxCollectorSlotIndex = 0
    let takeHomeSlotIndex = 0

    layout.deductionBucketSlots.forEach((bucketSlot, slotIndex) => {
      const circle = createSvgElement('circle')
      setAttributes(circle, {
        cx: 0,
        cy: 0,
        r: layout.marbleRadius,
        fill: layout.deductionBucket.color,
        stroke: 'rgba(30, 32, 36, 0.28)',
        'stroke-width': 1.2,
        class: 'marble marble-withheld',
      })
      this.elements.marblesLayer.appendChild(circle)

      const jarSlot = jarSlots[jarSlotIndex] ?? { x: layout.jarBounds.x, y: layout.jarBounds.y }
      const deductionCollectorSlot = layout.deductionSlots[deductionCollectorSlotIndex] ?? null

      const marble: Marble = {
        id: marbleId,
        bracketIndex: null,
        fillOrder,
        withholdingOrder,
        takeHomeOrder: null,
        color: layout.deductionBucket.color,
        jarSlot,
        bucketSlot,
        isDeduction: true,
        shouldTax: false,
        deductionCollectorSlot,
        taxCollectorSlot: null,
        takeHomeSlot: null,
        currentPosition: jarSlot,
        element: circle,
      }

      deductionCollectorSlotIndex += 1
      withholdingOrder += 1
      jarSlotIndex += 1
      fillOrder += 1
      marbleId += 1

      this.positionMarble(marble, marble.jarSlot)
      this.marbles.push(marble)
    })

    this.model.brackets.forEach((bracket, bracketIndex) => {
      const bucketSlots = layout.bucketSlots[bracketIndex] ?? []
      const bucketColor = layout.buckets[bracketIndex]?.color ?? TAX_COLOR
      const taxStartIndex = Math.max(0, bracket.grossMarbles - bracket.taxedMarbles)

      for (let slotIndex = 0; slotIndex < bracket.grossMarbles; slotIndex += 1) {
        const shouldTax = slotIndex >= taxStartIndex
        const taxCollectorSlot = shouldTax ? layout.taxSlots[taxCollectorSlotIndex] ?? null : null
        const takeHomeSlot = shouldTax ? null : layout.takeHomeSlots[takeHomeSlotIndex] ?? null
        if (shouldTax) taxCollectorSlotIndex += 1
        if (!shouldTax) takeHomeSlotIndex += 1
        const isWithheld = shouldTax

        const circle = createSvgElement('circle')
        setAttributes(circle, {
          cx: 0,
          cy: 0,
          r: layout.marbleRadius,
          fill: shouldTax ? bucketColor : NET_PAY_COLOR,
          stroke: 'rgba(30, 32, 36, 0.28)',
          'stroke-width': 1.2,
          class: isWithheld ? 'marble marble-withheld' : 'marble',
        })
        this.elements.marblesLayer.appendChild(circle)

        const jarSlot = jarSlots[jarSlotIndex] ?? { x: layout.jarBounds.x, y: layout.jarBounds.y }
        const bucketSlot = bucketSlots[slotIndex] ?? jarSlot

        const marble: Marble = {
          id: marbleId,
          bracketIndex,
          fillOrder,
          withholdingOrder: shouldTax ? withholdingOrder : null,
          takeHomeOrder: shouldTax ? null : takeHomeOrder,
          color: shouldTax ? bucketColor : NET_PAY_COLOR,
          jarSlot,
          bucketSlot,
          isDeduction: false,
          shouldTax,
          deductionCollectorSlot: null,
          taxCollectorSlot,
          takeHomeSlot,
          currentPosition: jarSlot,
          element: circle,
        }

        if (shouldTax) withholdingOrder += 1
        if (!shouldTax) takeHomeOrder += 1
        jarSlotIndex += 1
        fillOrder += 1
        marbleId += 1

        this.positionMarble(marble, marble.jarSlot)
        this.marbles.push(marble)
      }
    })
  }

  private positionMarble(marble: Marble, point: Point): void {
    marble.currentPosition = point
    marble.element.setAttribute('cx', point.x.toFixed(2))
    marble.element.setAttribute('cy', point.y.toFixed(2))
  }

  private quadraticPoint(start: Point, control: Point, end: Point, progress: number): Point {
    const t = clamp(progress, 0, 1)
    const first = pointLerp(start, control, t)
    const second = pointLerp(control, end, t)
    return pointLerp(first, second, t)
  }

  private setPhase(phase: ScenePhase): void {
    this.phase = phase
    this.elements.appRoot.dataset.phase = phase

    switch (phase) {
      case 'ready-fill':
        this.elements.goButton.disabled = false
        this.elements.goButton.textContent = 'Go: Fill Brackets'
        this.elements.phaseHint.textContent =
          'Release the gross-income marbles from the jug and route them into the CPP and EI bucket plus the tax bracket buckets.'
        break
      case 'filling':
        this.elements.goButton.disabled = true
        this.elements.goButton.textContent = 'Filling...'
        this.elements.phaseHint.textContent =
          'Marbles are moving along the top rail and dropping into the deductions bucket or the appropriate tax bracket.'
        break
      case 'ready-tax':
        this.elements.goButton.disabled = false
        this.elements.goButton.textContent = 'Go: Drop Deductions + Tax'
        this.elements.phaseHint.textContent =
          'Release the CPP and EI marbles into their collector and the taxed bracket marbles into the income-tax trough.'
        break
      case 'taxing':
        this.elements.goButton.disabled = true
        this.elements.goButton.textContent = 'Dropping Withholdings...'
        this.elements.phaseHint.textContent =
          'Payroll deductions and income-tax marbles are following the guide paths into their collectors.'
        break
      case 'ready-take-home':
        this.elements.goButton.disabled = false
        this.elements.goButton.textContent = 'Go: Move Take-Home Pay'
        this.elements.phaseHint.textContent =
          'Move the remaining untaxed marbles into the take-home pay container on the right.'
        break
      case 'taking-home':
        this.elements.goButton.disabled = true
        this.elements.goButton.textContent = 'Moving Take-Home Pay...'
        this.elements.phaseHint.textContent =
          'The remaining marbles are moving into the take-home pay container.'
        break
      case 'complete':
        this.elements.goButton.disabled = false
        this.elements.goButton.textContent = 'Replay'
        this.elements.phaseHint.textContent =
          'The left container holds CPP and EI marbles, the middle container holds income-tax marbles, and the right container holds net-pay marbles.'
        break
    }

    this.updateStageStatus()
  }

  private updateStageStatus(): void {
    if (this.phase === 'ready-fill') {
      this.elements.stageStatus.textContent =
        `${this.model.visualMarbleCount} marbles are ready in the jug, with ${this.model.deductionMarbles} set aside for CPP and EI before ${this.model.brackets.length} tax-bracket buckets.`
      return
    }
    if (this.phase === 'filling') {
      this.elements.stageStatus.textContent = 'Gross-income marbles are sorting into the deductions bucket and each tax bracket.'
      return
    }
    if (this.phase === 'ready-tax') {
      this.elements.stageStatus.textContent =
        `${this.model.deductionMarbles} deduction marbles and ${this.model.totalTaxedMarbles} income-tax marbles are ready to drop, while ${this.model.totalUntaxedMarbles} marbles will remain for net pay.`
      return
    }
    if (this.phase === 'taxing') {
      this.elements.stageStatus.textContent = 'CPP and EI marbles are collecting on the left while income-tax marbles collect in the center trough.'
      return
    }
    if (this.phase === 'ready-take-home') {
      this.elements.stageStatus.textContent =
        `${this.model.totalUntaxedMarbles} marbles are ready to move into the take-home pay container.`
      return
    }
    if (this.phase === 'taking-home') {
      this.elements.stageStatus.textContent = 'Take-home pay marbles are moving into the right-hand container.'
      return
    }
    this.elements.stageStatus.textContent =
      `${this.model.deductionMarbles} marbles collected as CPP and EI, ${this.model.totalTaxedMarbles} as income tax, and ${this.model.totalUntaxedMarbles} as net pay.`
  }

  private cancelAnimation(): void {
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = 0
    }
  }

  private resetVisualization(): void {
    this.cancelAnimation()
    this.setPhase('ready-fill')

    this.marbles.forEach((marble) => {
      marble.element.classList.remove('is-withheld')
      marble.element.style.opacity = '1'
      this.positionMarble(marble, marble.jarSlot)
    })
  }

  private placeCompletedPreviewState(): void {
    this.cancelAnimation()
    this.setPhase('complete')
    this.marbles.forEach((marble) => {
      if (marble.isDeduction && marble.deductionCollectorSlot) {
        marble.element.classList.add('is-withheld')
        this.positionMarble(marble, marble.deductionCollectorSlot)
        return
      }
      if (marble.shouldTax && marble.taxCollectorSlot) {
        marble.element.classList.add('is-withheld')
        this.positionMarble(marble, marble.taxCollectorSlot)
        return
      }
      if (marble.takeHomeSlot) {
        this.positionMarble(marble, marble.takeHomeSlot)
        return
      }
      this.positionMarble(marble, marble.bucketSlot)
    })
  }

  private runFillAnimation(): void {
    if (this.phase !== 'ready-fill' || !this.layout) return

    this.cancelAnimation()
    this.setPhase('filling')

    const startTime = performance.now()
    const spread = Math.min(2_100, 320 + this.marbles.length * 9)
    const duration = 1_450

    const tick = (now: number): void => {
      let allDone = true

      this.marbles.forEach((marble) => {
        const delay = (marble.fillOrder / Math.max(1, this.marbles.length - 1)) * spread
        const elapsed = now - startTime - delay

        if (elapsed <= 0) {
          this.positionMarble(marble, marble.jarSlot)
          allDone = false
          return
        }

        const progress = clamp(elapsed / duration, 0, 1)
        if (progress < 1) allDone = false
        this.positionMarble(marble, this.getFillAnimationPoint(marble, progress))
      })

      if (!allDone) {
        this.animationFrame = requestAnimationFrame(tick)
        return
      }

      this.animationFrame = 0
      this.marbles.forEach((marble) => this.positionMarble(marble, marble.bucketSlot))
      this.setPhase('ready-tax')
    }

    this.animationFrame = requestAnimationFrame(tick)
  }

  private getFillAnimationPoint(marble: Marble, progress: number): Point {
    if (!this.layout) return marble.jarSlot
    const bucket = marble.isDeduction
      ? this.layout.deductionBucket
      : marble.bracketIndex === null
        ? null
        : this.layout.buckets[marble.bracketIndex]
    if (!bucket) return marble.bucketSlot

    const spoutPoint = {
      x: this.layout.spout.x + (seededNoise(marble.id + 4) - 0.5) * 8,
      y: this.layout.spout.y + (seededNoise(marble.id + 7) - 0.5) * 5,
    }
    const railPoint = {
      x: bucket.x + bucket.width / 2 + (seededNoise(marble.id + 9) - 0.5) * 8,
      y: this.layout.railY + Math.sin(progress * Math.PI * 2 + marble.id * 0.4) * 3,
    }

    if (progress < 0.24) {
      return pointLerp(marble.jarSlot, spoutPoint, easeInCubic(progress / 0.24))
    }

    if (progress < 0.68) {
      return pointLerp(spoutPoint, railPoint, easeInOutSine((progress - 0.24) / 0.44))
    }

    const local = easeOutCubic((progress - 0.68) / 0.32)
    const dropControl = {
      x: railPoint.x + (marble.bucketSlot.x - railPoint.x) * 0.18,
      y: bucket.topY + 18,
    }
    return this.quadraticPoint(railPoint, dropControl, marble.bucketSlot, local)
  }

  private runTaxAnimation(): void {
    if (this.phase !== 'ready-tax' || !this.layout) return

    this.cancelAnimation()
    this.setPhase('taxing')

    const withheldMarbles = this.marbles.filter(
      (marble) => (marble.isDeduction && marble.deductionCollectorSlot) || (marble.shouldTax && marble.taxCollectorSlot),
    )
    const startTime = performance.now()
    const spread = Math.min(1_700, 280 + withheldMarbles.length * 12)
    const duration = 1_350

    const tick = (now: number): void => {
      let allDone = true

      this.marbles.forEach((marble) => {
        const targetSlot = marble.isDeduction ? marble.deductionCollectorSlot : marble.taxCollectorSlot
        if ((!marble.isDeduction && !marble.shouldTax) || !targetSlot) {
          this.positionMarble(marble, marble.bucketSlot)
          return
        }

        const order = marble.withholdingOrder ?? 0
        const delay = (order / Math.max(1, withheldMarbles.length - 1)) * spread
        const elapsed = now - startTime - delay

        if (elapsed <= 0) {
          this.positionMarble(marble, marble.bucketSlot)
          marble.element.classList.remove('is-withheld')
          allDone = false
          return
        }

        const progress = clamp(elapsed / duration, 0, 1)
        if (progress < 1) allDone = false
        marble.element.classList.add('is-withheld')
        this.positionMarble(marble, this.getTaxAnimationPoint(marble, progress))
      })

      if (!allDone) {
        this.animationFrame = requestAnimationFrame(tick)
        return
      }

      this.animationFrame = 0
      this.marbles.forEach((marble) => {
        if (marble.isDeduction && marble.deductionCollectorSlot) {
          this.positionMarble(marble, marble.deductionCollectorSlot)
          return
        }
        if (marble.shouldTax && marble.taxCollectorSlot) {
          this.positionMarble(marble, marble.taxCollectorSlot)
          return
        }
        this.positionMarble(marble, marble.bucketSlot)
      })
      this.setPhase('ready-take-home')
    }

    this.animationFrame = requestAnimationFrame(tick)
  }

  private getTaxAnimationPoint(marble: Marble, progress: number): Point {
    const targetSlot = marble.isDeduction ? marble.deductionCollectorSlot : marble.taxCollectorSlot
    if (!this.layout || !targetSlot) return marble.bucketSlot
    const bucket = marble.isDeduction
      ? this.layout.deductionBucket
      : marble.bracketIndex === null
        ? null
        : this.layout.buckets[marble.bracketIndex]
    if (!bucket) return targetSlot

    const guidePoint = {
      x: targetSlot.x,
      y:
        this.layout.funnelY +
        (marble.isDeduction ? -8 : 0) +
        (seededNoise(marble.id + 31) - 0.5) * 12,
    }

    if (progress < 0.28) {
      return pointLerp(marble.bucketSlot, bucket.outlet, easeInCubic(progress / 0.28))
    }

    if (progress < 0.78) {
      const local = easeInOutCubic((progress - 0.28) / 0.5)
      const control = {
        x: bucket.outlet.x + (targetSlot.x - bucket.outlet.x) * 0.5,
        y: this.layout.funnelY - 56 - (marble.isDeduction ? 0 : (marble.bracketIndex ?? 0) * 6),
      }
      return this.quadraticPoint(bucket.outlet, control, guidePoint, local)
    }

    return pointLerp(guidePoint, targetSlot, easeOutCubic((progress - 0.78) / 0.22))
  }

  private runTakeHomeAnimation(): void {
    if (this.phase !== 'ready-take-home' || !this.layout) return

    this.cancelAnimation()
    this.setPhase('taking-home')

    const takeHomeMarbles = this.marbles.filter((marble) => !marble.shouldTax && marble.takeHomeSlot)
    const startTime = performance.now()
    const spread = Math.min(1_700, 320 + takeHomeMarbles.length * 11)
    const duration = 1_450

    const tick = (now: number): void => {
      let allDone = true

      this.marbles.forEach((marble) => {
        if (marble.isDeduction || marble.shouldTax) {
          const targetSlot = marble.isDeduction ? marble.deductionCollectorSlot : marble.taxCollectorSlot
          if (targetSlot) {
            this.positionMarble(marble, targetSlot)
          }
          return
        }

        if (!marble.takeHomeSlot) {
          this.positionMarble(marble, marble.bucketSlot)
          return
        }

        const order = marble.takeHomeOrder ?? 0
        const delay = (order / Math.max(1, takeHomeMarbles.length - 1)) * spread
        const elapsed = now - startTime - delay

        if (elapsed <= 0) {
          this.positionMarble(marble, marble.bucketSlot)
          allDone = false
          return
        }

        const progress = clamp(elapsed / duration, 0, 1)
        if (progress < 1) allDone = false
        this.positionMarble(marble, this.getTakeHomeAnimationPoint(marble, progress))
      })

      if (!allDone) {
        this.animationFrame = requestAnimationFrame(tick)
        return
      }

      this.animationFrame = 0
      this.marbles.forEach((marble) => {
        if (marble.isDeduction && marble.deductionCollectorSlot) {
          this.positionMarble(marble, marble.deductionCollectorSlot)
          return
        }
        if (marble.shouldTax && marble.taxCollectorSlot) {
          this.positionMarble(marble, marble.taxCollectorSlot)
          return
        }
        if (marble.takeHomeSlot) {
          this.positionMarble(marble, marble.takeHomeSlot)
          return
        }
        this.positionMarble(marble, marble.bucketSlot)
      })
      this.setPhase('complete')
    }

    this.animationFrame = requestAnimationFrame(tick)
  }

  private getTakeHomeAnimationPoint(marble: Marble, progress: number): Point {
    if (!this.layout || !marble.takeHomeSlot) return marble.bucketSlot
    const bucket = marble.bracketIndex === null ? null : this.layout.buckets[marble.bracketIndex]
    if (!bucket) return marble.takeHomeSlot

    const guidePoint = {
      x: marble.takeHomeSlot.x,
      y: this.layout.funnelY + 10 + (seededNoise(marble.id + 63) - 0.5) * 14,
    }

    if (progress < 0.24) {
      return pointLerp(marble.bucketSlot, bucket.outlet, easeInCubic(progress / 0.24))
    }

    if (progress < 0.8) {
      const local = easeInOutCubic((progress - 0.24) / 0.56)
      const control = {
        x: bucket.outlet.x + (marble.takeHomeSlot.x - bucket.outlet.x) * 0.52,
        y: this.layout.funnelY - 24 - (marble.bracketIndex ?? 0) * 4,
      }
      return this.quadraticPoint(bucket.outlet, control, guidePoint, local)
    }

    return pointLerp(guidePoint, marble.takeHomeSlot, easeOutCubic((progress - 0.8) / 0.2))
  }
}

const root = document.getElementById('app')

if (!(root instanceof HTMLElement)) {
  throw new Error('App root not found.')
}

new TaxBracketsMarbleVisualApp(root)
