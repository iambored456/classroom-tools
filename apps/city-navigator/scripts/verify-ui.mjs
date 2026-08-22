import { chromium } from 'playwright'

const baseUrl = process.env.CITY_ROUTES_URL ?? 'http://localhost:5185/city-navigator/'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
const captureScreenshots = process.env.CITY_ROUTES_SCREENSHOTS === '1'
page.on('pageerror', (error) => errors.push(error.message))

try {
  await page.goto(baseUrl)
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
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-home.png', fullPage: true })
  await page.getByRole('button', { name: /Choose a level/i }).click()
  await page.waitForSelector('.level-card')
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
    sideViewHouses: await page.locator('.side-view-houses use[href="#side-view-house"]').count(),
    residentialTrees: await page.locator('.side-view-houses use[href="#side-view-tree"]').count(),
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
  if (gameplayLayout.topbarCount || gameplayLayout.removedDockHeadings || gameplayLayout.dockPosition !== 'fixed' || gameplayLayout.dockPadding.some((value) => value !== '0px') || gameplayLayout.settingsIcon.source !== 'music-learning-tools/packages/diatonic-compass-ui/public/assets/Settings_optimized.svg' || !gameplayLayout.settingsIcon.file.endsWith('/assets/Settings_optimized.svg') || gameplayLayout.settingsIcon.width !== 48 || gameplayLayout.settingsIcon.height !== 48 || gameplayLayout.homeIcon.source !== 'music-learning-tools/packages/diatonic-compass-ui/public/assets/home-icon.svg' || !gameplayLayout.homeIcon.file.endsWith('/assets/home-icon.svg') || gameplayLayout.homeIcon.width < 24 || gameplayLayout.homeIcon.height < 24 || gameplayLayout.goButtonSize.width < 84 || gameplayLayout.goButtonSize.height < 84 || gameplayLayout.goButtonSize.fontSize < 24 || !gameplayLayout.objectiveOverlay || gameplayLayout.objectiveProgressLines !== 0 || /stops? reached/i.test(gameplayLayout.objectiveText) || gameplayLayout.mapStageSpacing.padding.some((value) => value !== '0px') || gameplayLayout.mapStageSpacing.margin.some((value) => value !== '0px') || gameplayLayout.mapStageSpacing.dockGap > 1 || gameplayLayout.dockControlFontSizes.some((size) => size < 16) || !gameplayLayout.sideViewTrees || !gameplayLayout.sideViewHouses || !gameplayLayout.residentialTrees || gameplayLayout.houseAnatomy < 5 || gameplayLayout.genericBuildingRoofs !== 0 || gameplayLayout.emptyRecipeText || gameplayLayout.recipeScrollbar !== 'none' || !gameplayLayout.streetLabelBackgrounds || !gameplayLayout.paddedVerticalStreetLabels || gameplayLayout.intersectionMarkings !== mapNodeCount - 1 || !gameplayLayout.squircleIntersections || !gameplayLayout.fullSizeIntersectionMarkings || gameplayLayout.initialCarCount !== 0 || !gameplayLayout.startLabelInsideIntersection || emptyRecipeWidth < 1200 || !starFitsIntersection) {
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
  await page.getByRole('button', { name: 'Home' }).click()

  await page.getByRole('button', { name: 'Play Cedar Corner' }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  await page.getByRole('button', { name: 'South', exact: true }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  const middleRecipeDirection = page.locator('.recipe-command').nth(1)
  const draggableDirection = await page.getByRole('button', { name: 'West', exact: true }).getAttribute('draggable')
  await page.getByRole('button', { name: 'West', exact: true }).dragTo(middleRecipeDirection)
  const recipeAfterMiddleDrop = await page.locator('.recipe-command').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
  if (draggableDirection !== 'true' || recipeAfterMiddleDrop.join('|') !== '1: East|2: West|3: East') {
    throw new Error(`Dragging did not replace only the middle direction: ${JSON.stringify({ draggableDirection, recipeAfterMiddleDrop })}`)
  }
  await page.getByRole('button', { name: 'South', exact: true }).dragTo(middleRecipeDirection)
  const recipeAfterRestoringMiddle = await page.locator('.recipe-command').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
  if (recipeAfterRestoringMiddle.join('|') !== '1: East|2: South|3: East') {
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
  if (firstRecipeMarkerCount !== 1 || firstRecipeOutline.borderStyle !== 'dashed' || firstRecipeOutline.borderColor !== 'rgb(201, 57, 49)') {
    throw new Error(`The first recipe direction did not match the map's red dashed outline: ${JSON.stringify({ firstRecipeMarkerCount, firstRecipeOutline })}`)
  }
  await page.locator('.recipe-tile').first().hover()
  await page.waitForTimeout(200)
  const removeButtonOpacity = await page.getByRole('button', { name: /Remove direction 1/i }).evaluate((button) => getComputedStyle(button).opacity)
  const centeredRemoveIcon = await page.getByRole('button', { name: /Remove direction 1/i }).locator('svg').count()
  if (removeButtonOpacity !== '1' || centeredRemoveIcon !== 1) throw new Error(`Recipe remove button did not render correctly (opacity ${removeButtonOpacity}, icons ${centeredRemoveIcon})`)
  await page.getByRole('button', { name: /Remove direction 2/i }).click()
  await page.getByRole('button', { name: 'South', exact: true }).click()
  const recipeBeforeStep = await page.locator('.recipe-command').count()
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(340)
  const directionShownAfterDeparture = await page.locator('.transient-route-glyph').count()
  if (directionShownAfterDeparture !== 1) throw new Error('The direction marker did not appear after the car cleared its intersection.')
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
  if (completedRecipeVisual.backgroundColor !== 'rgb(255, 240, 168)' || completedRecipeVisual.opacity !== '1') {
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
  if (!(cardinalTurnAngle > 95 && cardinalTurnAngle < 175)) {
    throw new Error(`The cardinal car did not rotate smoothly through its intersection: ${cardinalTurnAngle}`)
  }
  await page.waitForTimeout(1200)
  const tracesAfterStep = await page.locator('.route-trace').count()
  if (captureScreenshots) await page.screenshot({ path: '.tmp-city-game.png', fullPage: true })

  await page.getByRole('button', { name: /Step back/i }).click()
  await page.waitForTimeout(1200)
  const tracesAfterBack = await page.locator('.route-trace').count()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
  await page.getByRole('button', { name: 'East', exact: true }).click()
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
  await page.getByRole('button', { name: 'Play Cedar Corner' }).click()
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
  if (relativeInitialCarCount !== 1 || relativeInitialStartOnlyCount !== 0) {
    throw new Error(`Relative mode did not show the starting car: ${JSON.stringify({ relativeInitialCarCount, relativeInitialStartOnlyCount })}`)
  }
  await page.getByRole('button', { name: 'Right', exact: true }).click()
  await page.getByRole('button', { name: /Step forward/i }).click()
  await page.waitForTimeout(300)
  const relativeTurnAngle = await page.locator('.car').evaluate((car) => Number(car.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? NaN))
  if (!(relativeTurnAngle > 5 && relativeTurnAngle < 85)) {
    throw new Error(`The relative car did not rotate smoothly through its intersection: ${relativeTurnAngle}`)
  }
  await page.waitForTimeout(1200)

  console.log(JSON.stringify({ gameplayLayout, cardinalTurnAngle, relativeInitialCarCount, relativeInitialStartOnlyCount, relativeTurnAngle, tracesAfterStep, tracesAfterBack, impossible, tracesAfterEarlyPause, tracesAfterLatePause, predictionResult, builderGridNodes, ghostRoad, roadsAfterLineTool, roadsAfterContextErase, nodesAfterContextErase, previewPreservedName, generatedRoadCount, savedGeneratedLevel, errors, url: page.url() }))
} finally {
  await browser.close()
}
