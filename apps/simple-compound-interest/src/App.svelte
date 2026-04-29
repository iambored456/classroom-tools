<svelte:head>
  <title>Simple and Compound Interest</title>
  <meta
    name="description"
    content="Explore how principal and interest build over time with a stacked bar graph for simple and compound interest."
  />
</svelte:head>

<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'

  type InterestMode = 'simple' | 'compound'
  type EditableField = 'principal' | 'rate' | 'time'
  type NumberPadKey = string | null
  type BarDatum = {
    year: number
    principal: number
    grownPrincipal: number
    currentInterest: number
    interest: number
    total: number
  }
  type PositionedBarDatum = BarDatum & {
    xLeft: number
    xCenter: number
  }

  const SVG_WIDTH = 840
  const SVG_HEIGHT = 600
  const CHART_LEFT = 88
  const CHART_RIGHT = 730
  const CHART_TOP = 34
  const CHART_BOTTOM = 514
  const BAR_CAP = 58
  const MIN_BAR_WIDTH = 10
  const BAR_RADIUS = 18
  const MIN_Y_AXIS_MAX = 1000
  const PRINCIPAL_STEP = 50
  const RATE_STEP = 0.5
  const PRINCIPAL_MIN = 250
  const PRINCIPAL_MAX = 100000
  const RATE_MIN = 1
  const RATE_MAX = 20
  const YEAR_MIN = 1
  const YEAR_MAX = 25
  const homeHref = new URL('..', new URL(import.meta.env.BASE_URL, window.location.origin)).toString()
  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const compactMoneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const wholeNumberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  })

  let mode: InterestMode = 'simple'
  let principal = 1200
  let ratePercent = 8
  let years = 6
  let activeField: EditableField | null = null
  let principalDraft = ''
  let rateDraft = ''
  let timeDraft = ''
  let summaryGridElement: HTMLDivElement | null = null

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  function roundToStep(value: number, step: number): number {
    return Math.round(value / step) * step
  }

  function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }

  function computeCompoundTotal(principalValue: number, rateValue: number, year: number): number {
    const rate = rateValue / 100

    return roundMoney(principalValue * Math.pow(1 + rate, year))
  }

  function buildBarData(
    modeValue: InterestMode,
    principalValue: number,
    rateValue: number,
    yearCount: number,
  ): BarDatum[] {
    return Array.from({ length: yearCount + 1 }, (_, year) => {
      if (modeValue === 'simple') {
        const interest = roundMoney(principalValue * (rateValue / 100) * year)

        return {
          year,
          principal: principalValue,
          grownPrincipal: 0,
          currentInterest: interest,
          interest,
          total: roundMoney(principalValue + interest),
        }
      }

      const currentTotal = computeCompoundTotal(principalValue, rateValue, year)
      const previousTotal = year === 0
        ? principalValue
        : computeCompoundTotal(principalValue, rateValue, year - 1)
      const grownPrincipal = roundMoney(previousTotal - principalValue)
      const currentInterest = roundMoney(currentTotal - previousTotal)
      const interest = roundMoney(grownPrincipal + currentInterest)

      return {
        year,
        principal: principalValue,
        grownPrincipal,
        currentInterest,
        interest,
        total: roundMoney(principalValue + interest),
      }
    })
  }

  function formatMoney(value: number): string {
    return moneyFormatter.format(Math.round(value))
  }

  function formatAxisMoney(value: number): string {
    if (value >= 10000) return compactMoneyFormatter.format(value)
    return moneyFormatter.format(value)
  }

  function getNiceTickStep(maxValue: number): number {
    if (maxValue <= 0) return 100

    const rawStep = maxValue / 5
    const exponent = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const fraction = rawStep / exponent

    if (fraction <= 1) return exponent
    if (fraction <= 2) return 2 * exponent
    if (fraction <= 5) return 5 * exponent
    return 10 * exponent
  }

  function getNiceChartMax(maxValue: number): number {
    const step = getNiceTickStep(maxValue)
    return Math.max(step, step * Math.ceil(maxValue / step))
  }

  function buildRoundedRectPath(
    x: number,
    y: number,
    width: number,
    height: number,
    corners: {
      topLeft: number
      topRight: number
      bottomRight: number
      bottomLeft: number
    },
  ): string {
    const safeWidth = Math.max(width, 0)
    const safeHeight = Math.max(height, 0)
    if (safeWidth === 0 || safeHeight === 0) return ''

    const maxRadius = Math.min(safeWidth / 2, safeHeight / 2)
    const topLeft = Math.min(corners.topLeft, maxRadius)
    const topRight = Math.min(corners.topRight, maxRadius)
    const bottomRight = Math.min(corners.bottomRight, maxRadius)
    const bottomLeft = Math.min(corners.bottomLeft, maxRadius)

    return [
      `M ${x + topLeft} ${y}`,
      `H ${x + safeWidth - topRight}`,
      topRight > 0
        ? `A ${topRight} ${topRight} 0 0 1 ${x + safeWidth} ${y + topRight}`
        : `L ${x + safeWidth} ${y}`,
      `V ${y + safeHeight - bottomRight}`,
      bottomRight > 0
        ? `A ${bottomRight} ${bottomRight} 0 0 1 ${x + safeWidth - bottomRight} ${y + safeHeight}`
        : `L ${x + safeWidth} ${y + safeHeight}`,
      `H ${x + bottomLeft}`,
      bottomLeft > 0
        ? `A ${bottomLeft} ${bottomLeft} 0 0 1 ${x} ${y + safeHeight - bottomLeft}`
        : `L ${x} ${y + safeHeight}`,
      `V ${y + topLeft}`,
      topLeft > 0
        ? `A ${topLeft} ${topLeft} 0 0 1 ${x + topLeft} ${y}`
        : `L ${x} ${y}`,
      'Z',
    ].join(' ')
  }

  function getEditableRawValue(field: EditableField): string {
    if (field === 'principal') return String(principal)
    if (field === 'time') return String(years)
    return Number.isInteger(ratePercent) ? String(ratePercent) : ratePercent.toFixed(1)
  }

  function getDraft(field: EditableField): string {
    if (field === 'principal') return principalDraft
    if (field === 'rate') return rateDraft
    return timeDraft
  }

  function setDraft(field: EditableField, value: string): void {
    if (field === 'principal') {
      principalDraft = value
      return
    }

    if (field === 'rate') {
      rateDraft = value
      return
    }

    timeDraft = value
  }

  function getFieldLabel(field: EditableField): string {
    if (field === 'principal') return 'Principal'
    if (field === 'rate') return 'Rate'
    return 'Time'
  }

  function getPadRows(field: EditableField): NumberPadKey[][] {
    return [
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['0', field === 'rate' ? '.' : null, 'back'],
    ]
  }

  async function openNumberPad(field: EditableField): Promise<void> {
    activeField = field
    setDraft(field, getEditableRawValue(field))
    await tick()
    const input = document.getElementById(`summary-${field}`) as HTMLInputElement | null
    input?.focus()
  }

  function parseFieldValue(field: EditableField, raw: string): number | null {
    const trimmed = raw.trim()
    if (trimmed === '') return null

    if (field === 'principal') {
      const digits = trimmed.replace(/\D/g, '')
      if (digits === '') return null
      return clamp(roundToStep(Number(digits), PRINCIPAL_STEP), PRINCIPAL_MIN, PRINCIPAL_MAX)
    }

    if (field === 'rate') {
      const sanitized = trimmed.replace(/[^0-9.]/g, '')
      if (sanitized === '' || sanitized === '.') return null
      const parsed = Number(sanitized)
      if (!Number.isFinite(parsed)) return null
      return clamp(roundToStep(parsed, RATE_STEP), RATE_MIN, RATE_MAX)
    }

    const digits = trimmed.replace(/\D/g, '')
    if (digits === '') return null
    return clamp(Math.round(Number(digits)), YEAR_MIN, YEAR_MAX)
  }

  function applyFieldDraft(field: EditableField): void {
    const parsed = parseFieldValue(field, getDraft(field))
    if (parsed === null) {
      setDraft(field, getEditableRawValue(field))
      return
    }

    if (field === 'principal') {
      principal = parsed
    } else if (field === 'rate') {
      ratePercent = parsed
    } else {
      years = parsed
    }

    setDraft(field, getEditableRawValue(field))
  }

  function closeNumberPad(apply = true): void {
    if (activeField) {
      if (apply) {
        applyFieldDraft(activeField)
      } else {
        setDraft(activeField, getEditableRawValue(activeField))
      }
    }

    activeField = null
  }

  function appendDraftValue(field: EditableField, key: string): void {
    let current = getDraft(field)

    if (key === 'back') {
      setDraft(field, current.slice(0, -1))
      return
    }

    if (field === 'rate' && key === '.') {
      if (current.includes('.')) return
      if (current === '') {
        setDraft(field, '0.')
        return
      }

      setDraft(field, `${current}.`)
      return
    }

    if (!/^\d$/.test(key)) return

    if (field === 'rate') {
      const decimalPart = current.split('.')[1] ?? ''
      if (current.includes('.') && decimalPart.length >= 1) return
      if (current === '0') {
        setDraft(field, key)
        return
      }

      setDraft(field, `${current}${key}`)
      return
    }

    if (current === '0') {
      setDraft(field, key)
      return
    }

    setDraft(field, `${current}${key}`)
  }

  function clearDraft(field: EditableField): void {
    setDraft(field, '')
  }

  function handleFieldKeydown(event: KeyboardEvent, field: EditableField): void {
    if (event.key === 'Tab') return

    if (event.key === 'Escape') {
      event.preventDefault()
      closeNumberPad(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeField !== field) {
        openNumberPad(field)
        return
      }

      closeNumberPad(true)
      return
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      if (activeField !== field) openNumberPad(field)
      appendDraftValue(field, 'back')
      return
    }

    if (event.key === '.' && field === 'rate') {
      event.preventDefault()
      if (activeField !== field) openNumberPad(field)
      appendDraftValue(field, '.')
      return
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      if (activeField !== field) openNumberPad(field)
      appendDraftValue(field, event.key)
    }
  }

  function handleOutsidePointer(event: PointerEvent): void {
    if (!summaryGridElement) return
    if (!(event.target instanceof Node)) return
    if (summaryGridElement.contains(event.target)) return
    closeNumberPad(true)
  }

  function yForValue(value: number): number {
    const ratio = value / chartMax
    return CHART_BOTTOM - ratio * (CHART_BOTTOM - CHART_TOP)
  }

  function barHeight(topValue: number, bottomValue = 0): number {
    return yForValue(bottomValue) - yForValue(topValue)
  }

  function handlePrincipalInput(event: Event): void {
    principal = clamp(Number((event.currentTarget as HTMLInputElement).value), PRINCIPAL_MIN, PRINCIPAL_MAX)
  }

  function handleRateInput(event: Event): void {
    ratePercent = clamp(Number((event.currentTarget as HTMLInputElement).value), RATE_MIN, RATE_MAX)
  }

  function handleYearsInput(event: Event): void {
    years = clamp(Math.round(Number((event.currentTarget as HTMLInputElement).value)), YEAR_MIN, YEAR_MAX)
  }

  $: principal = clamp(principal, PRINCIPAL_MIN, PRINCIPAL_MAX)
  $: ratePercent = clamp(ratePercent, RATE_MIN, RATE_MAX)
  $: years = clamp(years, YEAR_MIN, YEAR_MAX)

  $: chartData = buildBarData(mode, principal, ratePercent, years)
  $: finalBar = chartData[chartData.length - 1]
  $: highestTotal = Math.max(...chartData.map((bar) => bar.total))
  $: principalDisplay = wholeNumberFormatter.format(principal)
  $: rateDisplay = Number.isInteger(ratePercent) ? String(ratePercent) : ratePercent.toFixed(1)
  $: timeDisplay = String(years)
  $: formulaLabel = mode === 'simple' ? 'I = P x R x T' : 'A = P(1 + r)^t'
  $: autoChartMax = getNiceChartMax(Math.max(highestTotal * 1.08, MIN_Y_AXIS_MAX))
  $: chartMax = autoChartMax
  $: tickStep = getNiceTickStep(chartMax)
  $: yTicks = Array.from({ length: Math.floor(chartMax / tickStep) + 1 }, (_, index) => index * tickStep)
  $: slotWidth = (CHART_RIGHT - CHART_LEFT) / chartData.length
  $: barWidth = Math.round(Math.min(BAR_CAP, Math.max(MIN_BAR_WIDTH, slotWidth * (years > 12 ? 0.5 : 0.62))))
  $: xStep = chartData.length > 1 ? (CHART_RIGHT - CHART_LEFT - barWidth) / (chartData.length - 1) : 0
  $: positionedChartData = chartData.map((bar, index): PositionedBarDatum => {
    const xLeft = Math.round(CHART_LEFT + xStep * index)
    return {
      ...bar,
      xLeft,
      xCenter: Math.round(xLeft + barWidth / 2),
    }
  })
  $: rateBarIndex = Math.min(1, positionedChartData.length - 1)
  $: rateBar = positionedChartData[rateBarIndex]
  $: bracketX = rateBar.xLeft - 16
  $: interestTop = yForValue(rateBar.total)
  $: principalTop = yForValue(rateBar.principal + rateBar.grownPrincipal)
  $: summaryLabel =
    mode === 'simple'
      ? `Simple interest at ${ratePercent}% over ${years} year${years === 1 ? '' : 's'}`
      : `Compound interest at ${ratePercent}% over ${years} year${years === 1 ? '' : 's'}`

  onMount(() => {
    window.addEventListener('pointerdown', handleOutsidePointer)
  })

  onDestroy(() => {
    window.removeEventListener('pointerdown', handleOutsidePointer)
  })
</script>

<main class="app-shell">
  <header class="topbar">
    <a class="home-button" href={homeHref} aria-label="Back to app hub" title="Back to app hub">
      <svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5L12 3.75l8.5 6.75" />
        <path d="M6.5 9.75V20.25h11V9.75" />
        <path d="M10 20.25v-5.5h4v5.5" />
      </svg>
    </a>
    <div class="topbar-title">
      <p class="eyebrow">Math Tool</p>
      <h1>Simple and Compound Interest</h1>
    </div>
  </header>

  <section class="workspace">
    <article class="chart-card">
      <div class="chart-header">
        <div>
          <h2>{mode === 'simple' ? 'Simple Interest' : 'Compound Interest'}</h2>
        </div>
        <div class="legend" aria-label="Chart legend">
          <span class="legend-chip">
            <span class="legend-swatch legend-swatch-principal"></span>
            {mode === 'compound' ? 'Original Principal' : 'Principal'}
          </span>
          {#if mode === 'compound'}
            <span class="legend-chip">
              <span class="legend-swatch legend-swatch-grown"></span>
              Grown Principal
            </span>
          {/if}
          <span class="legend-chip">
            <span class="legend-swatch legend-swatch-interest"></span>
            {mode === 'compound' ? 'New Interest' : 'Interest'}
          </span>
        </div>
      </div>

      <div class="chart-frame">
        <svg class="chart" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} aria-label={summaryLabel}>
          <rect
            class="chart-surface"
            x={CHART_LEFT}
            y={CHART_TOP}
            width={CHART_RIGHT - CHART_LEFT}
            height={CHART_BOTTOM - CHART_TOP}
            rx="26"
          />

          {#each yTicks as tick}
            <line
              class:axis-line={tick === 0}
              class:grid-line={tick !== 0}
              x1={CHART_LEFT}
              y1={yForValue(tick)}
              x2={CHART_RIGHT}
              y2={yForValue(tick)}
            />
            <text class="tick-label y-tick" x={CHART_LEFT - 16} y={yForValue(tick) + 5} text-anchor="end">
              {formatAxisMoney(tick)}
            </text>
          {/each}

          <line class="axis-stroke" x1={CHART_LEFT} y1={CHART_TOP} x2={CHART_LEFT} y2={CHART_BOTTOM} />
          <line class="axis-stroke" x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} />

          {#each positionedChartData as bar (bar.year)}
            <g transform={`translate(${bar.xLeft} 0)`}>
              {#if mode === 'compound'}
                <path
                  class="bar-principal"
                  d={buildRoundedRectPath(0, yForValue(bar.principal), barWidth, barHeight(bar.principal), {
                    topLeft: 0,
                    topRight: 0,
                    bottomRight: BAR_RADIUS,
                    bottomLeft: BAR_RADIUS,
                  })}
                />
                {#if bar.grownPrincipal > 0}
                  <path
                    class="bar-grown-principal"
                    d={buildRoundedRectPath(
                      0,
                      yForValue(bar.principal + bar.grownPrincipal),
                      barWidth,
                      barHeight(bar.principal + bar.grownPrincipal, bar.principal),
                      {
                        topLeft: 0,
                        topRight: 0,
                        bottomRight: 0,
                        bottomLeft: 0,
                      },
                    )}
                  />
                {/if}
                {#if bar.currentInterest > 0}
                  <path
                    class="bar-interest"
                    d={buildRoundedRectPath(
                      0,
                      yForValue(bar.total),
                      barWidth,
                      barHeight(bar.total, bar.principal + bar.grownPrincipal),
                      {
                        topLeft: BAR_RADIUS,
                        topRight: BAR_RADIUS,
                        bottomRight: 0,
                        bottomLeft: 0,
                      },
                    )}
                  />
                {/if}
              {:else}
                <path
                  class="bar-principal"
                  d={buildRoundedRectPath(0, yForValue(bar.principal), barWidth, barHeight(bar.principal), {
                    topLeft: 0,
                    topRight: 0,
                    bottomRight: BAR_RADIUS,
                    bottomLeft: BAR_RADIUS,
                  })}
                />
                {#if bar.currentInterest > 0}
                  <path
                    class="bar-interest"
                    d={buildRoundedRectPath(
                      0,
                      yForValue(bar.total),
                      barWidth,
                      barHeight(bar.total, bar.principal + bar.grownPrincipal),
                      {
                        topLeft: BAR_RADIUS,
                        topRight: BAR_RADIUS,
                        bottomRight: 0,
                        bottomLeft: 0,
                      },
                    )}
                  />
                {/if}
              {/if}
            </g>

            <line class="x-axis-tick" x1={bar.xCenter} y1={CHART_BOTTOM} x2={bar.xCenter} y2={CHART_BOTTOM + 8} />
            <text class="tick-label x-tick" class:is-dense={years > 12} x={bar.xCenter} y={CHART_BOTTOM + 28} text-anchor="middle">
              {bar.year}
            </text>
          {/each}

          <path
            class="rate-bracket"
            d={`M ${bracketX + 10} ${interestTop} H ${bracketX} V ${principalTop} H ${bracketX + 10}`}
          />
          <text
            class="rate-label"
            x={bracketX - 10}
            y={(interestTop + principalTop) / 2}
            dominant-baseline="middle"
            text-anchor="end"
          >
            rate
          </text>

          <text class="axis-title" x={(CHART_LEFT + CHART_RIGHT) / 2} y={SVG_HEIGHT - 20} text-anchor="middle">
            Time (years)
          </text>
          <text
            class="axis-title"
            x="26"
            y={(CHART_TOP + CHART_BOTTOM) / 2}
            text-anchor="middle"
            transform={`rotate(-90 26 ${(CHART_TOP + CHART_BOTTOM) / 2})`}
          >
            Dollars
          </text>
        </svg>
      </div>
    </article>

    <aside class="control-card">
      <section class="panel-card note-card">
        <p class="eyebrow">Formula</p>
        <p class="formula">{formulaLabel}</p>
      </section>

      <div class="summary-grid" bind:this={summaryGridElement}>
        <div class="summary-box summary-box-principal" class:is-active={activeField === 'principal'}>
          <label class="summary-label" for="summary-principal">{getFieldLabel('principal')}</label>
          <div class="answer-input-shell">
            {#if activeField === 'principal'}
              <input
                id="summary-principal"
                class="coordinate-input summary-input is-active"
                bind:value={principalDraft}
                type="text"
                inputmode="none"
                readonly
                aria-haspopup="dialog"
                autocomplete="off"
                spellcheck="false"
                on:keydown={(event) => handleFieldKeydown(event, 'principal')}
              />
            {:else}
              <button
                type="button"
                id="summary-principal"
                class="summary-display-button"
                aria-haspopup="dialog"
                on:click={() => openNumberPad('principal')}
              >
                {principalDisplay}
              </button>
            {/if}
          </div>
          {#if activeField === 'principal'}
            <div class="number-pad summary-number-pad" role="dialog" aria-label="Number pad for principal">
              <div class="number-pad-grid">
                {#each getPadRows('principal') as row}
                  {#each row as key}
                    {#if key}
                      <button
                        type="button"
                        class="number-pad-key"
                        class:number-pad-utility={key === 'back'}
                        on:click={() => appendDraftValue('principal', key)}
                      >
                        {key === 'back' ? 'Del' : key}
                      </button>
                    {:else}
                      <span class="number-pad-spacer" aria-hidden="true"></span>
                    {/if}
                  {/each}
                {/each}
              </div>
              <div class="number-pad-actions">
                <button type="button" class="ghost-pad-button" on:click={() => clearDraft('principal')}>Clear</button>
                <button type="button" class="confirm-pad-button" on:click={() => closeNumberPad(true)}>Set</button>
              </div>
            </div>
          {/if}
        </div>

        <div class="summary-box summary-box-rate" class:is-active={activeField === 'rate'}>
          <label class="summary-label" for="summary-rate">{getFieldLabel('rate')}</label>
          <div class="answer-input-shell">
            {#if activeField === 'rate'}
              <input
                id="summary-rate"
                class="coordinate-input summary-input is-active"
                bind:value={rateDraft}
                type="text"
                inputmode="none"
                readonly
                aria-haspopup="dialog"
                autocomplete="off"
                spellcheck="false"
                on:keydown={(event) => handleFieldKeydown(event, 'rate')}
              />
            {:else}
              <button
                type="button"
                id="summary-rate"
                class="summary-display-button"
                aria-haspopup="dialog"
                on:click={() => openNumberPad('rate')}
              >
                {rateDisplay}
              </button>
            {/if}
          </div>
          {#if activeField === 'rate'}
            <div class="number-pad summary-number-pad" role="dialog" aria-label="Number pad for rate">
              <div class="number-pad-grid">
                {#each getPadRows('rate') as row}
                  {#each row as key}
                    {#if key}
                      <button
                        type="button"
                        class="number-pad-key"
                        class:number-pad-utility={key === 'back'}
                        on:click={() => appendDraftValue('rate', key)}
                      >
                        {key === 'back' ? 'Del' : key}
                      </button>
                    {:else}
                      <span class="number-pad-spacer" aria-hidden="true"></span>
                    {/if}
                  {/each}
                {/each}
              </div>
              <div class="number-pad-actions">
                <button type="button" class="ghost-pad-button" on:click={() => clearDraft('rate')}>Clear</button>
                <button type="button" class="confirm-pad-button" on:click={() => closeNumberPad(true)}>Set</button>
              </div>
            </div>
          {/if}
        </div>

        <div class="summary-box summary-box-time" class:is-active={activeField === 'time'}>
          <label class="summary-label" for="summary-time">{getFieldLabel('time')}</label>
          <div class="answer-input-shell">
            {#if activeField === 'time'}
              <input
                id="summary-time"
                class="coordinate-input summary-input is-active"
                bind:value={timeDraft}
                type="text"
                inputmode="none"
                readonly
                aria-haspopup="dialog"
                autocomplete="off"
                spellcheck="false"
                on:keydown={(event) => handleFieldKeydown(event, 'time')}
              />
            {:else}
              <button
                type="button"
                id="summary-time"
                class="summary-display-button"
                aria-haspopup="dialog"
                on:click={() => openNumberPad('time')}
              >
                {timeDisplay}
              </button>
            {/if}
          </div>
          {#if activeField === 'time'}
            <div class="number-pad summary-number-pad" role="dialog" aria-label="Number pad for time">
              <div class="number-pad-grid">
                {#each getPadRows('time') as row}
                  {#each row as key}
                    {#if key}
                      <button
                        type="button"
                        class="number-pad-key"
                        class:number-pad-utility={key === 'back'}
                        on:click={() => appendDraftValue('time', key)}
                      >
                        {key === 'back' ? 'Del' : key}
                      </button>
                    {:else}
                      <span class="number-pad-spacer" aria-hidden="true"></span>
                    {/if}
                  {/each}
                {/each}
              </div>
              <div class="number-pad-actions">
                <button type="button" class="ghost-pad-button" on:click={() => clearDraft('time')}>Clear</button>
                <button type="button" class="confirm-pad-button" on:click={() => closeNumberPad(true)}>Set</button>
              </div>
            </div>
          {/if}
        </div>

        <div class="summary-box summary-box-readonly">
          <span class="summary-label">Interest</span>
          <div class="summary-readout">{formatMoney(finalBar.interest)}</div>
        </div>

        <div class="summary-box summary-box-readonly">
          <span class="summary-label">Total</span>
          <div class="summary-readout">{formatMoney(finalBar.total)}</div>
        </div>
      </div>

      <section class="panel-card">
        <div class="mode-switch" role="tablist" aria-label="Interest mode">
          <button type="button" class:active={mode === 'simple'} on:click={() => (mode = 'simple')}>
            Simple
          </button>
          <button type="button" class:active={mode === 'compound'} on:click={() => (mode = 'compound')}>
            Compound
          </button>
        </div>
      </section>

      <section class="panel-card controls-panel">
        <div class="control-row">
          <div class="control-heading">
            <label for="principal-range">Principal</label>
            <strong>{formatMoney(principal)}</strong>
          </div>
          <input
            id="principal-range"
            value={principal}
            type="range"
            min={PRINCIPAL_MIN}
            max={PRINCIPAL_MAX}
            step={PRINCIPAL_STEP}
            on:input={handlePrincipalInput}
          />
        </div>

        <div class="control-row">
          <div class="control-heading">
            <label for="rate-range">Rate</label>
            <strong>{ratePercent}%</strong>
          </div>
          <input
            id="rate-range"
            value={ratePercent}
            type="range"
            min={RATE_MIN}
            max={RATE_MAX}
            step="0.5"
            on:input={handleRateInput}
          />
        </div>

        <div class="control-row">
          <div class="control-heading">
            <label for="years-range">Years</label>
            <strong>{years}</strong>
          </div>
          <input
            id="years-range"
            value={years}
            type="range"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step="1"
            on:input={handleYearsInput}
          />
        </div>

      </section>

    </aside>
  </section>
</main>
