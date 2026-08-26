import { chromium } from 'playwright'

const baseUrl = process.env.CITY_ROUTES_URL ?? 'http://localhost:5185/city-navigator/'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
const captureScreenshots = process.env.CITY_ROUTES_SCREENSHOTS === '1'
page.on('pageerror', (error) => errors.push(error.message))
await page.addInitScript(() => {
  window.__cityRouteAudioFrequencies = []
  class MockAudioContext {
    currentTime = 0
    state = 'running'
    destination = {}

    createOscillator() {
      const oscillator = {
        frequency: { value: 0 },
        type: 'sine',
        connect: (target) => target,
        start: () => window.__cityRouteAudioFrequencies.push(oscillator.frequency.value),
        stop: () => {},
      }
      return oscillator
    }

    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: (target) => target,
      }
    }

    resume() { this.state = 'running'; return Promise.resolve() }
    close() { this.state = 'closed'; return Promise.resolve() }
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: MockAudioContext })
})

try {
  await page.goto(baseUrl)
  await page.evaluate(() => document.fonts.ready)
  const atkinsonLoaded = await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"'))
  const atkinsonMismatches = await page
    .locator('body, h1, h2, h3, button, input, select, .combined-arrow-letter')
    .evaluateAll((elements) => elements
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}.${typeof element.className === 'string' ? element.className : element.getAttribute('class') ?? ''}`,
        fontFamily: getComputedStyle(element).fontFamily,
      }))
      .filter(({ fontFamily }) => !fontFamily.includes('Atkinson Hyperlegible Next')))
  if (!atkinsonLoaded || atkinsonMismatches.length > 0) {
    throw new Error(`Atkinson Hyperlegible Next was not loaded and applied throughout City Routes: ${JSON.stringify({ atkinsonLoaded, atkinsonMismatches })}`)
  }
  const expectedHubUrl = new URL('..', baseUrl)
  if ((expectedHubUrl.hostname === 'localhost' || expectedHubUrl.hostname === '127.0.0.1') && expectedHubUrl.port === '5185') expectedHubUrl.port = '5173'
  const titleHomeLink = await page.getByRole('link', { name: 'Back to Classroom Learning Tools' }).evaluate((link) => ({
    href: link.href,
    text: link.textContent?.trim(),
    iconSource: link.querySelector('img')?.getAttribute('data-icon-source'),
    iconFile: new URL(link.querySelector('img')?.getAttribute('src') ?? '', document.baseURI).pathname,
  }))
  if (titleHomeLink.href !== expectedHubUrl.toString() || titleHomeLink.text !== 'Home' || titleHomeLink.iconSource !== 'music-learning-tools/packages/diatonic-compass-ui/public/assets/home-icon.svg' || !titleHomeLink.iconFile.endsWith('/assets/home-icon.svg')) {
    throw new Error(`The title-page Home button did not target Classroom Learning Tools: ${JSON.stringify({ expected: expectedHubUrl.toString(), actual: titleHomeLink })}`)
  }
  const titleChoiceHeights = {
    directionMode: (await page.locator('.direction-choices button').first().boundingBox())?.height,
    directionSymbols: (await page.locator('.representation-choices button').first().boundingBox())?.height,
  }
  const titleLaunchArrows = await page.locator('.launch-card > i').count()
  if (!titleChoiceHeights.directionMode || !titleChoiceHeights.directionSymbols || Math.abs(titleChoiceHeights.directionMode - titleChoiceHeights.directionSymbols) > 0.1) {
    throw new Error(`The title-page choice buttons did not have matching heights: ${JSON.stringify(titleChoiceHeights)}`)
  }
  if (titleLaunchArrows !== 0) throw new Error(`The title-page launch cards still contained ${titleLaunchArrows} arrow icons.`)
  const bothChoice = page.getByRole('button', { name: 'Both', exact: true })
  const titleCombinedSymbol = {
    symbols: await bothChoice.locator('.combined-direction-symbol').count(),
    outlines: await bothChoice.locator('.combined-arrow-outline').count(),
    letters: await bothChoice.locator('.combined-arrow-letter').allTextContents(),
  }
  if (titleCombinedSymbol.symbols !== 1 || titleCombinedSymbol.outlines !== 1 || titleCombinedSymbol.letters.join('') !== 'N') {
    throw new Error(`The title-page Both preview was not a letter inside an outlined arrow: ${JSON.stringify(titleCombinedSymbol)}`)
  }
  await bothChoice.click()
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-home.png', fullPage: true })
  await page.getByRole('button', { name: /Choose a level/i }).click()
  await page.waitForSelector('.level-card')
  const libraryLayout = {
    title: await page.locator('.page-header h1').innerText(),
    classroomLibraryCopy: await page.getByText(/Classroom route library/i).count(),
    routeVisibilityCopy: await page.getByText(/Every route stays visible/i).count(),
    modePills: await page.locator('.mode-pill').count(),
    groupNames: await page.locator('.group-heading h2').allTextContents(),
    routeMetadata: await page.locator('.level-card-body > p').count(),
    organizeButtons: await page.getByRole('button', { name: 'Organize', exact: true }).count(),
    manageButtons: await page.getByRole('button', { name: 'Manage', exact: true }).count(),
    newLevelButtons: await page.getByRole('button', { name: /New level/i }).count(),
    newLevelCards: await page.locator('.new-level-card').count(),
  }
  if (libraryLayout.title !== 'Choose a level' || libraryLayout.classroomLibraryCopy !== 0 || libraryLayout.routeVisibilityCopy !== 0 || libraryLayout.modePills !== 0 || libraryLayout.groupNames.join('|') !== 'One Goal|Multiple Goals|Predict the Destination' || libraryLayout.routeMetadata !== 0 || libraryLayout.organizeButtons !== 1 || libraryLayout.manageButtons !== 0 || libraryLayout.newLevelButtons !== 0 || libraryLayout.newLevelCards !== 0) {
    throw new Error(`The simplified route library did not render as expected: ${JSON.stringify(libraryLayout)}`)
  }
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-library.png', fullPage: true })

  await page.getByRole('button', { name: 'Play Across the Grid' }).click()
  const gameplayLayout = {
    topbarCount: await page.locator('.game-topbar').count(),
    removedDockHeadings: await page.locator('.dock-level-name, .mode-badge, .recipe-heading').count(),
    dockPosition: await page.locator('.recipe-workspace').evaluate((dock) => getComputedStyle(dock).position),
    dockPadding: await page.locator('.recipe-workspace').evaluate((dock) => {
      const style = getComputedStyle(dock)
      return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]
    }),
    settingsIcon: await page.locator('[aria-label="Level settings"] .settings-tool-icon').evaluate((icon) => ({
      source: icon.getAttribute('data-icon-source'),
      file: new URL(icon.getAttribute('src'), document.baseURI).pathname,
      width: icon.getBoundingClientRect().width,
      height: icon.getBoundingClientRect().height,
    })),
    homeIcon: await page.locator('[aria-label="Home"] .home-tool-icon').evaluate((icon) => ({
      source: icon.getAttribute('data-icon-source'),
      file: new URL(icon.getAttribute('src'), document.baseURI).pathname,
      width: icon.getBoundingClientRect().width,
      height: icon.getBoundingClientRect().height,
    })),
    goButtonSize: await page.locator('.go-button').evaluate((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(button).fontSize) })),
    objectiveOverlay: await page.locator('.level-objective').count(),
    objectiveText: await page.locator('.level-objective').innerText(),
    objectiveProgressLines: await page.locator('.level-objective > span:not(.prompt-pin)').count(),
    mapStageSpacing: await page.locator('.map-stage').evaluate((stage) => {
      const style = getComputedStyle(stage)
      const stageBox = stage.getBoundingClientRect()
      const dockBox = document.querySelector('.recipe-workspace')?.getBoundingClientRect()
      return {
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
        margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
        dockGap: dockBox ? Math.abs(stageBox.bottom - dockBox.top) : null,
      }
    }),
    dockControlFontSizes: await page.locator('.dock-control-button, .transport-controls button').evaluateAll((buttons) => buttons.map((button) => Number.parseFloat(getComputedStyle(button).fontSize))),
    sideViewTrees: await page.locator('.park-trees use').count(),
    sideViewHouses: await page.locator('.side-view-houses use[href^="#side-view-house"]').count(),
    residentialTrees: await page.locator('.side-view-houses use[href^="#side-view-tree"], .side-view-houses use[href="#side-view-evergreen"]').count(),
    houseDefinitions: await page.locator('defs > g[id^="side-view-house"]').count(),
    treeDefinitions: await page.locator('defs > g[id^="side-view-tree"], defs > g[id="side-view-evergreen"]').count(),
    houseVariantsUsed: await page.locator('.side-view-houses use[href^="#side-view-house"]').evaluateAll((icons) => new Set(icons.map((icon) => icon.getAttribute('href'))).size),
    treeVariantsUsed: await page.locator('.park-trees use, .side-view-houses use[href^="#side-view-tree"], .side-view-houses use[href="#side-view-evergreen"]').evaluateAll((icons) => new Set(icons.map((icon) => icon.getAttribute('href'))).size),
    houseAnatomy: await page.locator('#side-view-house .house-roof, #side-view-house .house-wall, #side-view-house .house-door, #side-view-house .house-window').count(),
    genericBuildingRoofs: await page.locator('.building-roofs').count(),
    emptyRecipeText: await page.locator('.empty-recipe').innerText(),
    recipeScrollbar: await page.locator('.recipe-strip').evaluate((strip) => getComputedStyle(strip).scrollbarWidth),
    streetLabelBackgrounds: await page.locator('.street-label-background').count(),
    paddedVerticalStreetLabels: await page.locator('.vertical-street-label').evaluateAll((labels) => labels.length > 0 && labels.every((label) => {
      const background = label.querySelector('.street-label-background')?.getBBox()
      const text = label.querySelector('.street-label')?.getBBox()
      return Boolean(background && text && background.width - text.width >= 1.6)
    })),
    intersectionMarkings: await page.locator('.intersection-marking').count(),
    squircleIntersections: await page.locator('.intersection-surface').evaluateAll((shapes) => shapes.every((shape) => shape.tagName.toLowerCase() === 'rect')),
    fullSizeIntersectionMarkings: await page.locator('.intersection-marking').evaluateAll((markings) => markings.every((marking) => {
      const box = marking.getBBox()
      const surface = document.querySelector('.intersection-surface')?.getBBox()
      const cornerRadius = Number(marking.getAttribute('rx') ?? 0)
      return Boolean(surface && box.width >= surface.width * .92 && box.height >= surface.height * .92 && cornerRadius === 0)
    })),
    initialCarCount: await page.locator('.car').count(),
    combinedPaletteSymbols: await page.locator('.direction-palette .combined-direction-symbol').count(),
    combinedPaletteLetters: await page.locator('.direction-palette .combined-arrow-letter').allTextContents(),
    startLabelInsideIntersection: await page.locator('.start-marker.initial-start').evaluate((marker) => {
      const outline = marker.querySelector('.start-outline')?.getBBox()
      const label = marker.querySelector('text')?.getBBox()
      return Boolean(outline && label && label.x >= outline.x && label.y >= outline.y && label.x + label.width <= outline.x + outline.width && label.y + label.height <= outline.y + outline.height)
    }),
  }
  const emptyRecipeWidth = await page.locator('.empty-recipe').evaluate((empty) => empty.getBoundingClientRect().width)
  const starFitsIntersection = await page.locator('.goal-star').evaluate((star) => {
    const starBox = star.getBBox()
    const intersectionBox = document.querySelector('.intersection-surface')?.getBBox()
    return Boolean(intersectionBox && starBox.width < intersectionBox.width && starBox.height < intersectionBox.height)
  })
  const mapNodeCount = await page.locator('.intersection-surface').count()
  if (gameplayLayout.topbarCount || gameplayLayout.removedDockHeadings || gameplayLayout.dockPosition !== 'fixed' || gameplayLayout.dockPadding.some((value) => value !== '0px') || gameplayLayout.settingsIcon.source !== 'music-learning-tools/packages/diatonic-compass-ui/public/assets/Settings_optimized.svg' || !gameplayLayout.settingsIcon.file.endsWith('/assets/Settings_optimized.svg') || gameplayLayout.settingsIcon.width !== 48 || gameplayLayout.settingsIcon.height !== 48 || gameplayLayout.homeIcon.source !== 'music-learning-tools/packages/diatonic-compass-ui/public/assets/home-icon.svg' || !gameplayLayout.homeIcon.file.endsWith('/assets/home-icon.svg') || gameplayLayout.homeIcon.width < 24 || gameplayLayout.homeIcon.height < 24 || gameplayLayout.goButtonSize.width < 84 || gameplayLayout.goButtonSize.height < 84 || gameplayLayout.goButtonSize.fontSize < 24 || !gameplayLayout.objectiveOverlay || gameplayLayout.objectiveProgressLines !== 0 || /stops? reached/i.test(gameplayLayout.objectiveText) || gameplayLayout.mapStageSpacing.padding.some((value) => value !== '0px') || gameplayLayout.mapStageSpacing.margin.some((value) => value !== '0px') || gameplayLayout.mapStageSpacing.dockGap > 1 || gameplayLayout.dockControlFontSizes.some((size) => size < 16) || !gameplayLayout.sideViewTrees || !gameplayLayout.sideViewHouses || !gameplayLayout.residentialTrees || gameplayLayout.houseDefinitions !== 3 || gameplayLayout.treeDefinitions !== 4 || gameplayLayout.houseVariantsUsed !== 3 || gameplayLayout.treeVariantsUsed !== 4 || gameplayLayout.houseAnatomy < 5 || gameplayLayout.genericBuildingRoofs !== 0 || gameplayLayout.emptyRecipeText || gameplayLayout.recipeScrollbar !== 'none' || !gameplayLayout.streetLabelBackgrounds || !gameplayLayout.paddedVerticalStreetLabels || gameplayLayout.intersectionMarkings !== mapNodeCount - 1 || !gameplayLayout.squircleIntersections || !gameplayLayout.fullSizeIntersectionMarkings || gameplayLayout.initialCarCount !== 0 || gameplayLayout.combinedPaletteSymbols !== 4 || gameplayLayout.combinedPaletteLetters.join('|') !== 'N|E|S|W' || !gameplayLayout.startLabelInsideIntersection || emptyRecipeWidth < 1200 || !starFitsIntersection) {
    throw new Error(`Gameplay layout did not match the bottom-dock design: ${JSON.stringify(gameplayLayout)}`)
  }
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-grid.png', fullPage: true })
  const compassButtons = Object.fromEntries(await Promise.all(['North', 'East', 'South', 'West'].map(async (name) => [name, await page.getByRole('button', { name, exact: true }).boundingBox()])))
  if (
    !compassButtons.North || !compassButtons.East || !compassButtons.South || !compassButtons.West
    || !(compassButtons.North.y < compassButtons.East.y && compassButtons.East.y < compassButtons.South.y)
    || !(compassButtons.West.x < compassButtons.North.x && compassButtons.North.x < compassButtons.East.x)
    || Object.values(compassButtons).some((box) => Math.abs(box.width - box.height) > 1 || box.width < 63)
  ) throw new Error(`Cardinal controls were not arranged as a compass: ${JSON.stringify(compassButtons)}`)
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileRouteControls = await Promise.all([
    page.getByRole('button', { name: 'Clear', exact: true }).boundingBox(),
    page.getByRole('button', { name: /Step back/i }).boundingBox(),
    page.getByRole('button', { name: /Step forward/i }).boundingBox(),
  ])
  if (mobileRouteControls.some((box) => !box) || !(mobileRouteControls[0].y < mobileRouteControls[1].y && mobileRouteControls[1].y < mobileRouteControls[2].y)) {
    throw new Error(`The mobile route controls were not stacked vertically: ${JSON.stringify(mobileRouteControls)}`)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Home' }).click()

  await page.getByRole('button', { name: 'Play Across the Grid' }).click()
  await page.getByRole('button', { name: 'North', exact: true }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  await page.getByRole('button', { name: 'North', exact: true }).click()
  const middleRecipeDirection = page.locator('.recipe-command').nth(1)
  const draggableDirection = await page.getByRole('button', { name: 'West', exact: true }).getAttribute('draggable')
  await page.getByRole('button', { name: 'West', exact: true }).dragTo(middleRecipeDirection)
  const recipeAfterMiddleDrop = await page.locator('.recipe-command').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
  if (draggableDirection !== 'true' || recipeAfterMiddleDrop.join('|') !== '1: North|2: West|3: North') {
    throw new Error(`Dragging did not replace only the middle direction: ${JSON.stringify({ draggableDirection, recipeAfterMiddleDrop })}`)
  }
  await page.getByRole('button', { name: 'East', exact: true }).dragTo(middleRecipeDirection)
  const recipeAfterRestoringMiddle = await page.locator('.recipe-command').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
  if (recipeAfterRestoringMiddle.join('|') !== '1: North|2: East|3: North') {
    throw new Error(`A second drop did not preserve the following direction: ${JSON.stringify(recipeAfterRestoringMiddle)}`)
  }
  await page.getByRole('button', { name: /Remove direction 3/i }).click()
  const enlargedRecipeButton = await page.locator('.recipe-command').first().boundingBox()
  const enlargedRecipeTextSize = await page.locator('.recipe-command b').first().evaluate((text) => Number.parseFloat(getComputedStyle(text).fontSize))
  const enlargedTransportButton = await page.getByRole('button', { name: /Step forward/i }).boundingBox()
  if (!enlargedRecipeButton || enlargedRecipeButton.width < 72 || enlargedRecipeButton.height < 72 || enlargedRecipeTextSize < 34 || !enlargedTransportButton || enlargedTransportButton.height < 50) {
    throw new Error(`The margin-free recipe workspace did not enlarge its controls: ${JSON.stringify({ enlargedRecipeButton, enlargedRecipeTextSize, enlargedTransportButton })}`)
  }
  const firstRecipeOutline = await page.locator('.recipe-command').first().evaluate((button) => ({
    borderColor: getComputedStyle(button).borderColor,
    borderStyle: getComputedStyle(button).borderStyle,
  }))
  const firstRecipeMarkerCount = await page.locator('.recipe-command.first-command').count()
  const recipeCombinedSymbols = await page.locator('.recipe-command .combined-direction-symbol').count()
  if (firstRecipeMarkerCount !== 1 || firstRecipeOutline.borderStyle !== 'dashed' || firstRecipeOutline.borderColor !== 'rgb(201, 57, 49)' || recipeCombinedSymbols !== 2) {
    throw new Error(`The first recipe direction did not match the map's red dashed outline: ${JSON.stringify({ firstRecipeMarkerCount, firstRecipeOutline })}`)
  }
  await page.locator('.recipe-tile').first().hover()
  await page.waitForTimeout(200)
  const removeButtonOpacity = await page.getByRole('button', { name: /Remove direction 1/i }).evaluate((button) => getComputedStyle(button).opacity)
  const centeredRemoveIcon = await page.getByRole('button', { name: /Remove direction 1/i }).locator('svg').count()
  if (removeButtonOpacity !== '1' || centeredRemoveIcon !== 1) throw new Error(`Recipe remove button did not render correctly (opacity ${removeButtonOpacity}, icons ${centeredRemoveIcon})`)
  await page.getByRole('button', { name: /Remove direction 2/i }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  const recipeBeforeStep = await page.locator('.recipe-command').count()
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(340)
  const directionShownAfterDeparture = await page.locator('.transient-route-glyph').count()
  if (directionShownAfterDeparture !== 1) throw new Error('The direction marker did not appear after the car cleared its intersection.')
  const mapCombinedSymbol = {
    symbols: await page.locator('.transient-route-glyph .map-direction-symbol').count(),
    letters: await page.locator('.transient-route-glyph .combined-arrow-letter').allTextContents(),
  }
  if (mapCombinedSymbol.symbols !== 1 || mapCombinedSymbol.letters.join('') !== 'N') {
    throw new Error(`The map direction was not a letter inside an outlined arrow: ${JSON.stringify(mapCombinedSymbol)}`)
  }
  const movingCarVisual = await page.locator('.car').evaluate((car) => {
    const plate = car.querySelector('circle')
    const arrow = car.querySelector(':scope > path:not(.car-window)')
    const box = arrow?.getBBox()
    const radius = Number(plate?.getAttribute('r') ?? 0)
    return {
      translucentPlate: Boolean(plate && Number(getComputedStyle(plate).fillOpacity) < 1),
      arrowFitsPlate: Boolean(box && box.x > -radius && box.y > -radius && box.x + box.width < radius && box.y + box.height < radius),
    }
  })
  if (!movingCarVisual.translucentPlate || !movingCarVisual.arrowFitsPlate) {
    throw new Error(`The car did not appear correctly once movement began: ${JSON.stringify(movingCarVisual)}`)
  }
  const currentRecipeVisual = await page.locator('.recipe-command.current').evaluate((button) => ({
    backgroundColor: getComputedStyle(button).backgroundColor,
    opacity: getComputedStyle(button).opacity,
  }))
  if (currentRecipeVisual.backgroundColor !== 'rgb(255, 216, 77)' || currentRecipeVisual.opacity !== '1') {
    throw new Error(`The current recipe direction was not fully visible in bright yellow: ${JSON.stringify(currentRecipeVisual)}`)
  }
  const redStartDirection = await page.locator('.transient-route-glyph .start-command-frame').count()
  if (redStartDirection !== 1) throw new Error('The first direction did not use the red dashed starting-point outline.')
  const activeTrailDash = await page.locator('.route-trace.transient').evaluate((trail) => getComputedStyle(trail).strokeDasharray)
  if (activeTrailDash === 'none' || !activeTrailDash.includes(',')) throw new Error(`The active trail was not dashed: ${activeTrailDash}`)
  await page.waitForTimeout(960)
  const completedRecipeVisual = await page.locator('.recipe-command.completed').first().evaluate((button) => ({
    backgroundColor: getComputedStyle(button).backgroundColor,
    opacity: getComputedStyle(button).opacity,
  }))
  const completionCheckmarks = await page.locator('.recipe-command [aria-label="completed"]').count()
  if (completedRecipeVisual.backgroundColor !== 'rgb(255, 240, 168)' || completedRecipeVisual.opacity !== '1' || completionCheckmarks !== 0) {
    throw new Error(`The completed recipe direction was not fully visible in light yellow: ${JSON.stringify(completedRecipeVisual)}`)
  }
  const checkpoint = {
    recipeBeforeStep,
    recipeTiles: await page.locator('.recipe-command').allTextContents(),
    controls: await page.locator('.transport-controls > button').evaluateAll((buttons) => buttons.map((button) => ({ text: button.textContent, disabled: button.disabled }))),
    stepForwardDisabled: await page.getByRole('button', { name: /Step forward/i }).isDisabled(),
    feedback: await page.locator('.feedback-card').allTextContents(),
    errors,
  }
  if (checkpoint.stepForwardDisabled) throw new Error(`First step did not settle: ${JSON.stringify(checkpoint)}`)
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(300)
  const cardinalTurnAngle = await page.locator('.car').evaluate((car) => Number(car.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? NaN))
  if (!(cardinalTurnAngle > 5 && cardinalTurnAngle < 85)) {
    throw new Error(`The cardinal car did not rotate smoothly through its intersection: ${cardinalTurnAngle}`)
  }
  await page.waitForTimeout(1200)
  const tracesAfterStep = await page.locator('.route-trace').count()
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-game.png', fullPage: true })

  await page.getByRole('button', { name: /Step back/i }).click()
  await page.waitForTimeout(1200)
  const tracesAfterBack = await page.locator('.route-trace').count()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'North', exact: true }).click()
  await page.getByRole('button', { name: 'West', exact: true }).click()
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(1300)
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(250)
  const impossible = await page.locator('.feedback-card.impossible').innerText()
  const failedRouteEditingState = {
    directionButtons: await page.locator('.direction-palette > button:not(.insert-button)').count(),
    removableDirections: await page.locator('.recipe-remove').count(),
    editDirectionsButtons: await page.getByRole('button', { name: /Edit directions/i }).count(),
    resetButtons: await page.getByRole('button', { name: /Reset/i }).count(),
  }
  if (failedRouteEditingState.directionButtons !== 4 || failedRouteEditingState.removableDirections !== 2 || failedRouteEditingState.editDirectionsButtons !== 0 || failedRouteEditingState.resetButtons !== 0) {
    throw new Error(`A failed route did not remain directly editable: ${JSON.stringify(failedRouteEditingState)}`)
  }
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  const clearedRouteState = {
    recipeDirections: await page.locator('.recipe-command').count(),
    traces: await page.locator('.route-trace').count(),
    visibleCars: await page.locator('.car').count(),
    directionButtons: await page.locator('.direction-palette > button:not(.insert-button)').count(),
    feedbackCards: await page.locator('.feedback-card').count(),
  }
  if (clearedRouteState.recipeDirections !== 0 || clearedRouteState.traces !== 0 || clearedRouteState.visibleCars !== 0 || clearedRouteState.directionButtons !== 4 || clearedRouteState.feedbackCards !== 0) {
    throw new Error(`Clear did not restore a blank route at the starting intersection: ${JSON.stringify(clearedRouteState)}`)
  }

  await page.getByRole('button', { name: 'Home' }).click()
  if (await page.getByRole('button', { name: 'Play Cedar Corner' }).count()) {
    throw new Error('Cedar Corner still appeared in the level library.')
  }
  const overpassPreview = page.getByRole('button', { name: 'Play Under the Bridge' }).locator('.city-map')
  const overpassVisual = await overpassPreview.evaluate((map) => {
    const road = map.querySelector('.bridge-road')
    const gradient = map.querySelector(`linearGradient#${road?.getAttribute('stroke')?.match(/#(.+)\)/)?.[1]}`)
    return {
      broadShadows: map.querySelectorAll('.bridge-shadow').length,
      bridgeCurbs: map.querySelectorAll('.bridge-curb').length,
      sideEdgeShadows: map.querySelectorAll('.bridge-edge-shadow').length,
      surfaceStops: [...(gradient?.querySelectorAll('stop') ?? [])].map((stop) => stop.getAttribute('stop-color')),
      centerLines: map.querySelectorAll('.bridge-center').length,
    }
  })
  if (overpassVisual.broadShadows !== 0 || overpassVisual.bridgeCurbs !== 0 || overpassVisual.sideEdgeShadows !== 2 || overpassVisual.surfaceStops.at(2) !== '#98a1a2' || overpassVisual.centerLines !== 1) {
    throw new Error(`The overpass did not use a centered elevation gradient with side-edge shadows: ${JSON.stringify(overpassVisual)}`)
  }
  await page.getByRole('button', { name: 'Play Under the Bridge' }).click()
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-overpass.png', fullPage: true })
  await page.getByRole('button', { name: 'East', exact: true }).click()
  await page.getByRole('button', { name: /GO/ }).click()
  await page.waitForTimeout(420)
  await page.getByRole('button', { name: /Pause/i }).click()
  await page.waitForTimeout(700)
  const tracesAfterEarlyPause = await page.locator('.route-trace').count()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  await page.getByRole('button', { name: /GO/ }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Pause/i }).click()
  await page.waitForTimeout(700)
  const tracesAfterLatePause = await page.locator('.route-trace').count()
  await page.getByRole('button', { name: 'Home' }).click()

  await page.getByRole('button', { name: 'Play Where Will It End?' }).click()
  await page.getByRole('button', { name: 'Level settings' }).click()
  await page.getByRole('button', { name: 'fast', exact: true }).click()
  await page.getByRole('button', { name: /GO/ }).click()
  await page.waitForTimeout(3200)
  const predictionResult = await page.locator('.feedback-card').innerText()
  const predictionTracesBeforeReplay = await page.locator('.route-trace').count()
  const replayStartedAt = Date.now()
  await page.getByRole('button', { name: /GO/ }).click()
  await page.locator('.feedback-card').waitFor({ state: 'detached' })
  const goDisabledDuringReplayRewind = await page.locator('.go-button').isDisabled()
  await page.getByRole('button', { name: /Pause/i }).waitFor({ timeout: 1200 })
  const replayRewindMs = Date.now() - replayStartedAt
  await page.locator('.feedback-card').waitFor({ state: 'visible', timeout: 6000 })
  const replayResult = await page.locator('.feedback-card').innerText()
  const predictionTracesAfterReplay = await page.locator('.route-trace').count()
  if (!goDisabledDuringReplayRewind || replayRewindMs > 900 || replayResult !== predictionResult || predictionTracesAfterReplay !== predictionTracesBeforeReplay) {
    throw new Error(`GO did not rapidly rewind and replay the completed route: ${JSON.stringify({ goDisabledDuringReplayRewind, replayRewindMs, predictionResult, replayResult, predictionTracesBeforeReplay, predictionTracesAfterReplay })}`)
  }
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: /Back to home/i }).click()
  await page.getByRole('button', { name: /Level Builder/i }).click()
  await page.waitForSelector('.builder-screen')
  const builderMap = page.locator('.builder-canvas-panel .city-map')
  const builderMapBox = await builderMap.boundingBox()
  if (!builderMapBox) throw new Error('The builder map was not visible.')
  const mapPixel = (x, y) => ({
    x: builderMapBox.x + builderMapBox.width * x / 100,
    y: builderMapBox.y + builderMapBox.height * y / 64,
  })
  const builderGridNodes = await page.locator('.builder-canvas-panel .grid-node').count()
  const eraseToolCount = await page.locator('.tool-rail button').filter({ hasText: 'Erase' }).count()
  const roadsBeforeLineTool = await page.locator('.builder-canvas-panel .road-surface').count()
  await page.locator('.tool-rail button').filter({ hasText: 'Road' }).click()
  const roadStartPixel = mapPixel(20, 10)
  const roadHoverPixel = mapPixel(40, 20)
  await page.mouse.click(roadStartPixel.x, roadStartPixel.y)
  await page.mouse.move(roadHoverPixel.x, roadHoverPixel.y)
  await page.waitForTimeout(100)
  const ghostRoad = await page.locator('.road-preview-surface').evaluate((line) => ({
    x1: Number(line.getAttribute('x1')),
    y1: Number(line.getAttribute('y1')),
    x2: Number(line.getAttribute('x2')),
    y2: Number(line.getAttribute('y2')),
  }))
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-builder.png', fullPage: true })
  if (builderGridNodes !== 228 || eraseToolCount !== 0 || ghostRoad.x1 !== 20 || ghostRoad.y1 !== 10 || ghostRoad.x2 !== 40 || ghostRoad.y2 !== 10) {
    throw new Error(`The builder grid or ghost road was incorrect: ${JSON.stringify({ builderGridNodes, eraseToolCount, ghostRoad })}`)
  }
  await page.mouse.click(roadHoverPixel.x, roadHoverPixel.y)
  await page.waitForTimeout(100)
  const roadsAfterLineTool = await page.locator('.builder-canvas-panel .road-surface').count()
  const ghostAfterPlacement = await page.locator('.road-preview-surface').count()
  const roadMidpoint = mapPixel(30, 10)
  await page.mouse.click(roadMidpoint.x, roadMidpoint.y, { button: 'right' })
  await page.waitForTimeout(100)
  const roadsAfterContextErase = await page.locator('.builder-canvas-panel .road-surface').count()
  const nodesBeforeContextErase = await page.locator('.builder-canvas-panel .node-handle').count()
  await page.mouse.click(roadStartPixel.x, roadStartPixel.y, { button: 'right' })
  await page.waitForTimeout(100)
  const nodesAfterContextErase = await page.locator('.builder-canvas-panel .node-handle').count()
  if (roadsAfterLineTool !== roadsBeforeLineTool + 1 || ghostAfterPlacement !== 0 || roadsAfterContextErase !== roadsBeforeLineTool || nodesAfterContextErase !== nodesBeforeContextErase - 1) {
    throw new Error(`The builder line placement or right-click erase interaction failed: ${JSON.stringify({ roadsBeforeLineTool, roadsAfterLineTool, ghostAfterPlacement, roadsAfterContextErase, nodesBeforeContextErase, nodesAfterContextErase })}`)
  }

  await page.getByLabel('Level name').fill('Preview Keeps My Work')
  await page.getByRole('button', { name: /Preview/i }).click()
  await page.waitForSelector('.game-screen')
  await page.getByRole('button', { name: /Return to builder/i }).click()
  await page.waitForSelector('.builder-screen')
  const previewPreservedName = await page.getByLabel('Level name').inputValue()
  await page.getByRole('button', { name: /Procedural generator/i }).click()
  await page.getByLabel('Map complexity').selectOption('advanced')
  await page.getByRole('button', { name: 'Generate editable city' }).click()
  const generatedRoadCount = await page.locator('.builder-canvas-panel .road-surface').count()
  await page.getByRole('button', { name: 'Save level' }).click()
  await page.waitForSelector('.library-screen')
  const savedGeneratedLevel = await page.getByText('Preview Keeps My Work', { exact: true }).count()
  await page.getByRole('button', { name: /Back to home/i }).click()
  await page.locator('.direction-choices button').filter({ hasText: 'Relative' }).click()
  await page.getByRole('button', { name: /Choose a level/i }).click()
  await page.getByRole('button', { name: 'Play Across the Grid' }).click()
  const relativeInitialCarCount = await page.locator('.car').count()
  const relativeInitialStartOnlyCount = await page.locator('.start-marker.initial-start').count()
  const relativeCombinedSymbols = {
    letters: await page.locator('.direction-palette .combined-arrow-letter').allTextContents(),
    forwardPath: await page.getByRole('button', { name: 'Forward', exact: true }).locator('.combined-arrow-outline').getAttribute('d'),
    leftPath: await page.getByRole('button', { name: 'Left', exact: true }).locator('.combined-arrow-outline').getAttribute('d'),
    rightPath: await page.getByRole('button', { name: 'Right', exact: true }).locator('.combined-arrow-outline').getAttribute('d'),
    rightTransform: await page.getByRole('button', { name: 'Right', exact: true }).locator('.combined-arrow-outline').getAttribute('transform'),
  }
  if (relativeInitialCarCount !== 1 || relativeInitialStartOnlyCount !== 0 || relativeCombinedSymbols.letters.join('|') !== 'L|F|R|U' || relativeCombinedSymbols.forwardPath !== 'M9.5 30 V15 H2.5 L16 1.5 L29.5 15 H22.5 V30 Z' || relativeCombinedSymbols.leftPath !== relativeCombinedSymbols.rightPath || !relativeCombinedSymbols.leftPath?.includes('C') || !relativeCombinedSymbols.rightTransform?.includes('scale(-1 1)')) {
    throw new Error(`Relative mode did not show the expected car and combined symbols: ${JSON.stringify({ relativeInitialCarCount, relativeInitialStartOnlyCount, relativeCombinedSymbols })}`)
  }
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-relative.png', fullPage: true })
  await page.getByRole('button', { name: 'Right', exact: true }).click()
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(300)
  const relativeTurnAngle = await page.locator('.car').evaluate((car) => Number(car.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? NaN))
  if (!(relativeTurnAngle > 5 && relativeTurnAngle < 85)) {
    throw new Error(`The relative car did not rotate smoothly through its intersection: ${relativeTurnAngle}`)
  }
  await page.waitForTimeout(1200)
  const audioFrequencies = await page.evaluate(() => window.__cityRouteAudioFrequencies)
  const departureChimes = audioFrequencies.filter((frequency) => frequency === 523).length
  const objectiveChimes = audioFrequencies.filter((frequency) => frequency === 1047).length
  const nonDepartureFrequencies = audioFrequencies.filter((frequency) => frequency !== 523)
  if (departureChimes < 5 || objectiveChimes !== 1 || nonDepartureFrequencies.join('|') !== '659|784|1047') {
    throw new Error(`Departures did not use single tones or the objective cue was incorrect: ${JSON.stringify({ audioFrequencies, departureChimes, objectiveChimes, nonDepartureFrequencies })}`)
  }

  console.log(JSON.stringify({ titleChoiceHeights, titleLaunchArrows, libraryLayout, gameplayLayout, mobileRouteControls, overpassVisual, audioFrequencies, departureChimes, objectiveChimes, cardinalTurnAngle, relativeInitialCarCount, relativeInitialStartOnlyCount, relativeCombinedSymbols, relativeTurnAngle, tracesAfterStep, tracesAfterBack, impossible, tracesAfterEarlyPause, tracesAfterLatePause, predictionResult, replayRewindMs, replayResult, builderGridNodes, ghostRoad, roadsAfterLineTool, roadsAfterContextErase, nodesAfterContextErase, previewPreservedName, generatedRoadCount, savedGeneratedLevel, errors, url: page.url() }))
} finally {
  await browser.close()
}
