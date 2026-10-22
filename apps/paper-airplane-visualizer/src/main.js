import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { clamp, smooth, WIDTH, HEIGHT } from './model.js'
import { designs } from './designs.js'
import { createPrintedGuides } from './printed-guides.js'
import './style.css'

const icons = {
  plane: '<path d="m3 11 18-8-7 18-3-7-8-3Z"/><path d="m11 14 10-11"/>',
  back: '<path d="m14 6-6 6 6 6"/>', next: '<path d="m10 6 6 6-6 6"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>', pause: '<path d="M9 5v14M16 5v14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1.8 8M3 4v6h6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>',
  home: '<path d="m3 11 9-8 9 8M6 9v11h12V9M10 20v-6h4v6"/>',
  expand: '<path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1 .7-1.7 1-1.7 2.7M12 17h.01"/>',
  flip: '<path d="M4 7h16l-4-4M20 17H4l4 4M4 7v4m16 6v-4"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  arrowhead: '<path d="m12 2 9 19-9-5-9 5L12 2Z"/><path d="M12 2v14"/>',
  raven: '<path d="m12 2 10 18-8-3-2 4-2-4-8 3L12 2Z"/><path d="M12 2v19M2 20l10-8 10 8"/>',
}
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
const hubUrl = import.meta.env.DEV ? `${location.protocol}//${location.hostname}:5173/` : '../'
const screenshot = Boolean(window.__SCREENSHOT__)
let savedDesign
try { savedDesign = localStorage.getItem('classroom-tools.airplane-design') } catch {}
let design = designs.find(d => !screenshot && d.id === savedDesign) || designs[0]
let { panels, posePaperVertex, creaseFormedAt, PAPER_THICKNESS, steps, substeps } = design
document.querySelector('#app').innerHTML = `
  <header class="header">
    <div class="brand"><a class="icon-button hub-link" href="${hubUrl}" title="Classroom Tools" aria-label="Back to Classroom Tools">${icon('home')}</a><div><h1>Paper Airplane <span>Visualizer</span></h1></div></div>
    <button id="design-profile" class="design-label" popovertarget="design-menu" aria-haspopup="dialog" aria-expanded="false">${icon('plane')}<span id="profile-name">${design.name}</span>${icon('chevron')}</button>
    <button id="fullscreen" class="icon-button" title="Full screen" aria-label="Full screen">${icon('expand')}</button>
  </header>
  <div id="design-menu" popover role="dialog" aria-label="Choose an airplane">
    <h2>Choose an airplane</h2>
    ${designs.map(d => `<button data-design="${d.id}" aria-pressed="${d.id === design.id}">${icon(d.icon)}<span><strong>${d.name}</strong><small>${d.description}</small><small>${d.steps.length} steps · ${d.foldCount} labelled folds${d.substeps.some(fold => fold.kind === 'tuck') ? ' + pocket tuck' : ''}</small></span><span class="design-check" aria-hidden="true">✓</span></button>`).join('')}
  </div>
  <div id="controls-menu" popover role="dialog" aria-label="Controls and help">
    <h2>Controls</h2>
    <dl>
      <div><dt>Rotate</dt><dd>Drag the paper, or focus it and use the arrow keys.</dd></div>
      <div><dt>Zoom</dt><dd>Scroll, pinch, or use + / −.</dd></div>
      <div><dt>Pan</dt><dd>Right-drag or drag with two fingers.</dd></div>
      <div><dt>Playback</dt><dd>Space plays or pauses. Select a coloured label to repeat its fold; Next fold advances.</dd></div>
      <div><dt>Shortcuts</dt><dd>R resets the view. Number keys select a main step; 0 selects step 10.</dd></div>
      <div><dt>Printed guides</dt><dd>Blue V: valley fold. Red M: mountain fold.</dd></div>
    </dl>
    <a id="guide-credit" href="${design.guideUrl}" target="_blank" rel="noopener noreferrer">${design.name} · Fold’NFly guide ↗</a>
  </div>
  <main>
    <section class="stage" aria-label="Interactive 3D paper airplane">
      <div id="viewport" tabindex="0" role="region" aria-label="3D paper. Drag to rotate, scroll or pinch to zoom. Arrow keys rotate; plus and minus zoom; R resets the view."></div>
      <div class="view-tools" aria-label="View controls"><button id="zoom-in" class="icon-button" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button><button id="zoom-out" class="icon-button" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button><span></span><button id="flip-view" class="icon-button" title="View other side of the paper" aria-label="View other side">${icon('flip')}</button><button id="reset-view" class="icon-button" title="Reset view (R)" aria-label="Reset view">${icon('reset')}</button></div>
      <div id="graphics-error" role="alert" hidden><h2>3D view unavailable</h2><p>This browser could not start WebGL. Try enabling hardware acceleration or opening this app in another browser. The step instructions below are still available.</p></div>
    </section>
    <section class="fold-panel" aria-label="Folding controls">
      <nav id="fold-steps" class="steps" aria-label="Folding steps"></nav>
      <div class="instruction" aria-live="polite" aria-atomic="true"><h2 id="step-title"></h2><p id="step-text"></p></div>
      <div class="transport"><button id="previous" class="icon-button" aria-label="Previous fold" title="Previous fold">${icon('back')}</button><button id="play" class="play-button" aria-label="Pause animation" title="Pause animation">${icon('pause')}</button><div class="scrubber"><label for="progress" class="sr-only">Fold progress</label><input id="progress" type="range" min="0" max="1000" step="1" value="0" /><span id="progress-value">0%</span></div><label class="speed"><span class="sr-only">Animation speed</span><select id="speed" aria-label="Animation speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button id="next" class="next-button">Next fold ${icon('next')}</button><button id="controls-help" class="icon-button" popovertarget="controls-menu" aria-haspopup="dialog" aria-expanded="false" aria-label="Controls and help" title="Controls and help">${icon('help')}</button></div>
    </section>
  </main>
`

const $ = id => document.getElementById(id)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let selected = screenshot ? substeps.length - 1 : 0
let time = screenshot ? design.endTime : 0
let furthestFold = time
let playing = !screenshot && !reducedMotion.matches
let direction = 1, hold = 0.6, travel = null, last = performance.now(), dirty = true
let viewTurn = null
let renderer, scene, camera, controls, model, meshRecords = [], edgeRecords = []
let normals = [], poseCache = []
let edgeMaterial, creaseMaterial
let printedGuides

function renderSteps() {
  $('fold-steps').innerHTML = steps.map((s, i) => `<div class="step-group"><button data-step="${i}" aria-label="Step ${i + 1}: ${s.name}"><span class="step-number">${i + 1}</span><span>${s.short}</span></button><div class="substeps" role="group" aria-label="Step ${i + 1} folds">${substeps.map((fold, index) => fold.step === i ? `<button class="substep ${fold.kind === 'tuck' ? 'tuck' : fold.label.endsWith('M') ? 'mountain' : 'valley'}" data-fold="${index}" aria-label="${fold.kind === 'tuck' ? 'Pocket tuck' : `Fold ${fold.label}`}">${fold.label}</button>` : '').join('')}</div></div>`).join('')
  document.querySelectorAll('[data-step]').forEach(button => button.onclick = () => chooseStep(Number(button.dataset.step)))
  document.querySelectorAll('[data-fold]').forEach(button => button.onclick = () => chooseFold(Number(button.dataset.fold)))
  document.querySelector('.fold-panel').classList.toggle('many-steps', steps.length > 5)
  $('profile-name').textContent = design.name
  $('design-profile').querySelector('svg').innerHTML = icons[design.icon]
  $('design-profile').setAttribute('aria-label', `Choose airplane: ${design.name}`)
  $('guide-credit').href = design.guideUrl
  $('guide-credit').textContent = `${design.name} · Fold’NFly guide ↗`
  document.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === design.id)))
}

function chooseDesign(id) {
  const next = designs.find(d => d.id === id)
  $('design-menu').hidePopover()
  if (!next || next === design) return
  design = next
  ;({ panels, posePaperVertex, creaseFormedAt, PAPER_THICKNESS, steps, substeps } = design)
  selected = time = furthestFold = 0
  travel = null
  direction = 1
  hold = 0.65
  playing = !reducedMotion.matches
  try { localStorage.setItem('classroom-tools.airplane-design', design.id) } catch {}
  if (renderer) { buildPaper(); resetView() }
  renderSteps()
  updateStep()
  updatePlayback()
  $('design-profile').focus()
}

function positionDesignMenu() {
  const rect = $('design-profile').getBoundingClientRect()
  const menu = $('design-menu')
  menu.style.left = `${clamp(rect.right - menu.offsetWidth, 12, innerWidth - menu.offsetWidth - 12)}px`
  menu.style.top = `${rect.bottom + 10}px`
}
document.querySelectorAll('[data-design]').forEach(button => button.onclick = () => chooseDesign(button.dataset.design))
$('design-menu').addEventListener('toggle', event => {
  $('design-profile').setAttribute('aria-expanded', String(event.newState === 'open'))
  if (event.newState === 'open') positionDesignMenu()
})
function positionControlsMenu() {
  const rect = $('controls-help').getBoundingClientRect()
  const menu = $('controls-menu')
  menu.style.left = `${clamp(rect.right - menu.offsetWidth, 12, innerWidth - menu.offsetWidth - 12)}px`
  menu.style.bottom = `${innerHeight - rect.top + 8}px`
}
$('controls-menu').addEventListener('toggle', event => {
  $('controls-help').setAttribute('aria-expanded', String(event.newState === 'open'))
  if (event.newState === 'open') positionControlsMenu()
})
window.addEventListener('resize', () => {
  if ($('design-menu').matches(':popover-open')) positionDesignMenu()
  if ($('controls-menu').matches(':popover-open')) positionControlsMenu()
})

function chooseFold(next) {
  if (next < 0 || next >= substeps.length || next === selected) return
  selected = next
  // Travel through intermediate folds, preserving a continuous paper model.
  const target = substeps[next].start
  travel = { target, resume: playing }
  if (reducedMotion.matches) { time = target; travel = null }
  direction = 1
  hold = 0.65
  updateStep()
}

function chooseStep(step) {
  chooseFold(substeps.findIndex(fold => fold.step === step))
}

function cancelTravel() {
  if (!travel) return
  const index = substeps.findIndex(fold => time < fold.end)
  selected = index < 0 ? substeps.length - 1 : index
  travel = null
  updateStep()
}

function updateStep() {
  const fold = substeps[selected]
  const step = steps[fold.step]
  $('step-title').textContent = step.name
  $('step-text').textContent = fold.text
  $('previous').disabled = selected === 0
  $('next').innerHTML = selected === substeps.length - 1 ? `Start again ${icon('reset')}` : `Next fold ${icon('next')}`
  document.querySelectorAll('[data-step]').forEach(button => {
    const active = Number(button.dataset.step) === fold.step
    button.setAttribute('aria-current', active ? 'step' : 'false')
  })
  document.querySelectorAll('[data-fold]').forEach(button => {
    button.setAttribute('aria-current', Number(button.dataset.fold) === selected ? 'step' : 'false')
  })
  document.querySelector(`[data-fold="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' })
  dirty = true
}

function updatePlayback() {
  $('play').innerHTML = icon(playing ? 'pause' : 'play')
  $('play').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation')
  $('play').title = playing ? 'Pause animation (Space)' : 'Play animation (Space)'
}

function pointOnSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const length = dx * dx + dy * dy
  if (length < 1e-12) return false
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length
  return t > -1e-7 && t < 1 + 1e-7 && Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) < 1e-6
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.setClearColor(0xf5f5f0, 0)
  $('viewport').append(renderer.domElement)
  renderer.domElement.setAttribute('aria-hidden', 'true')
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 150)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.minDistance = 8
  controls.maxDistance = 48
  controls.rotateSpeed = 0.7
  controls.addEventListener('change', () => { dirty = true })
  controls.addEventListener('start', cancelViewTurn)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb1bec2, 2.3))
  const key = new THREE.DirectionalLight(0xfff9ef, 2.3)
  key.position.set(-8, 12, 16)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xd6eeff, 0.8)
  fill.position.set(10, -5, -12)
  scene.add(fill)
  buildPaper()
  resetView()
  new ResizeObserver(resize).observe($('viewport'))
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    playing = false
    updatePlayback()
    $('graphics-error').hidden = false
  })
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    $('graphics-error').hidden = true
    dirty = true
  })
}

function buildPaper() {
  if (model) {
    const materials = new Set([edgeMaterial, creaseMaterial])
    model.traverse(object => {
      object.geometry?.dispose()
      if (object.material) materials.add(object.material)
    })
    materials.forEach(material => material?.dispose())
    Object.values(printedGuides).forEach(texture => texture.dispose())
    scene.remove(model)
  }
  meshRecords = []
  edgeRecords = []
  model = new THREE.Group()
  model.position.y = HEIGHT / 2
  scene.add(model)
  printedGuides = createPrintedGuides(renderer, design.id)
  const front = new THREE.MeshStandardMaterial({ color: 0xfffdf3, map: printedGuides.front, roughness: 0.95, side: THREE.FrontSide })
  const back = new THREE.MeshStandardMaterial({ color: 0xf3f6f4, map: printedGuides.back, roughness: 0.95, side: THREE.BackSide })
  const rim = new THREE.MeshStandardMaterial({ color: 0xe2e5de, roughness: 0.95, side: THREE.DoubleSide })
  edgeMaterial = new THREE.LineBasicMaterial({ color: 0x536b65, transparent: true, opacity: 0.42, depthWrite: false })
  creaseMaterial = new THREE.LineBasicMaterial({ color: 0x9a9e9a, transparent: true, opacity: 0.55, depthWrite: false })
  meshRecords = panels.map(panel => {
    const indices = []
    for (let i = 1; i < panel.vertices.length - 1; i++) indices.push(0, i, i + 1)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(panel.vertices.length * 3), 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(panel.vertices.flatMap(v => [(v.uv[0] + WIDTH / 2) / WIDTH, 1 + v.uv[1] / HEIGHT]), 2))
    geometry.setIndex(indices)
    const backGeometry = geometry.clone()
    for (let i = 0; i < panel.vertices.length; i++) backGeometry.attributes.uv.setX(i, 1 - geometry.attributes.uv.getX(i))
    const rimGeometry = new THREE.BufferGeometry()
    rimGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(panel.vertices.length * 18), 3))
    const frontMesh = new THREE.Mesh(geometry, front), backMesh = new THREE.Mesh(backGeometry, back)
    const rimMesh = new THREE.Mesh(rimGeometry, rim)
    frontMesh.frustumCulled = backMesh.frustumCulled = false
    rimMesh.frustumCulled = false
    model.add(frontMesh, backMesh, rimMesh)
    panel.vertices.forEach((a, i) => {
      const b = panel.vertices[(i + 1) % panel.vertices.length]
      const midpoint = a.uv.map((v, j) => (v + b.uv[j]) / 2)
      const neighbor = panels.find(p => p.id !== panel.id && p.vertices.some((v, j) => pointOnSegment(midpoint, v.uv, p.vertices[(j + 1) % p.vertices.length].uv)))
      const lineGeometry = new THREE.BufferGeometry()
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
      const line = new THREE.Line(lineGeometry, edgeMaterial)
      const backLine = new THREE.Line(lineGeometry.clone(), edgeMaterial)
      line.frustumCulled = false
      backLine.frustumCulled = false
      line.renderOrder = backLine.renderOrder = 2
      model.add(line, backLine)
      edgeRecords.push({ panel: panel.id, a: i, b: (i + 1) % panel.vertices.length, neighbor: neighbor?.id, formedAt: creaseFormedAt(panel, neighbor), line, backLine })
    })
    return { panel, geometry, backGeometry, rimGeometry }
  })
}

function resize() {
  const { width, height } = $('viewport').getBoundingClientRect()
  camera.aspect = width / Math.max(1, height)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  dirty = true
}

function resetView() {
  if (!camera) return
  cancelViewTurn()
  controls.target.set(0, 0, 0.45)
  camera.up.set(0, 1, 0)
  camera.position.set(11, 7, 24)
  controls.update()
  dirty = true
}

function zoom(factor) {
  if (!camera) return
  cancelViewTurn()
  const vector = camera.position.clone().sub(controls.target)
  vector.setLength(clamp(vector.length() * factor, controls.minDistance, controls.maxDistance))
  camera.position.copy(controls.target).add(vector)
  controls.update()
  dirty = true
}

function rotateView(angle) {
  const offset = camera.position.clone().sub(controls.target)
  offset.applyAxisAngle(camera.up, angle)
  camera.position.copy(controls.target).add(offset)
  dirty = true
}

function cancelViewTurn() {
  viewTurn = null
  $('flip-view').disabled = false
}

function animateViewTurn(delta) {
  if (!viewTurn) return
  viewTurn.elapsed = Math.min(viewTurn.elapsed + delta, 0.9)
  const angle = Math.PI * smooth(viewTurn.elapsed / 0.9)
  // Advance along the orbit, preserving radius and elevation. Normal orbit
  // damping can settle naturally, and direct camera input cancels the turn.
  rotateView(angle - viewTurn.angle)
  viewTurn.angle = angle
  if (viewTurn.elapsed === 0.9) cancelViewTurn()
}

function drawPaper() {
  if (!model) return
  model.position.y = design.centerY?.(time) ?? HEIGHT / 2
  furthestFold = Math.max(furthestFold, time)
  poseCache = panels.map(panel => panel.vertices.map(v => new THREE.Vector3(...posePaperVertex(v.uv, panel, time))))
  normals = poseCache.map(points => {
    for (let i = 1; i < points.length - 1; i++) {
      const n = new THREE.Vector3().crossVectors(points[i].clone().sub(points[0]), points[i + 1].clone().sub(points[0]))
      if (n.lengthSq() > 1e-12) return n.normalize()
    }
    return new THREE.Vector3(0, 0, 1)
  })
  meshRecords.forEach(({ panel, geometry, backGeometry, rimGeometry }) => {
    const halfThickness = normals[panel.id].clone().multiplyScalar(PAPER_THICKNESS / 2)
    const frontPoints = poseCache[panel.id].map(p => p.clone().add(halfThickness))
    const backPoints = poseCache[panel.id].map(p => p.clone().sub(halfThickness))
    for (const [surface, points] of [[geometry, frontPoints], [backGeometry, backPoints]]) {
      const attribute = surface.attributes.position
      points.forEach((p, i) => attribute.setXYZ(i, p.x, p.y, p.z))
      attribute.needsUpdate = true
      surface.computeVertexNormals()
    }
    const rimAttribute = rimGeometry.attributes.position
    frontPoints.forEach((a, i) => {
      const j = (i + 1) % frontPoints.length
      const points = [a, backPoints[i], frontPoints[j], frontPoints[j], backPoints[i], backPoints[j]]
      points.forEach((p, n) => rimAttribute.setXYZ(i * 6 + n, p.x, p.y, p.z))
    })
    rimAttribute.needsUpdate = true
    rimGeometry.computeVertexNormals()
  })
  edgeRecords.forEach(edge => {
    const boundary = edge.neighbor === undefined
    const bent = !boundary && normals[edge.panel].dot(normals[edge.neighbor]) < 0.9999
    const remembered = furthestFold >= edge.formedAt
    // Draw an unfolded shared crease only once; both faces have their own line.
    const duplicate = !boundary && !bent && edge.panel > edge.neighbor
    edge.line.visible = edge.backLine.visible = !duplicate && (boundary || bent || remembered)
    if (!edge.line.visible) return
    edge.line.material = edge.backLine.material = boundary || bent ? edgeMaterial : creaseMaterial
    for (const [line, sign] of [[edge.line, 1], [edge.backLine, -1]]) {
      const attr = line.geometry.attributes.position
      const lift = normals[edge.panel].clone().multiplyScalar(sign * (PAPER_THICKNESS / 2 + 0.0003))
      for (const [i, index] of [edge.a, edge.b].entries()) {
        const p = poseCache[edge.panel][index].clone().add(lift)
        attr.setXYZ(i, p.x, p.y, p.z)
      }
      attr.needsUpdate = true
    }
  })
}

function frame(now) {
  const delta = Math.min((now - last) / 1000, 0.05)
  last = now
  if (!document.hidden) {
    const speed = Number($('speed').value)
    const fold = substeps[selected]
    const span = fold.end - fold.start
    if (travel) {
      const gap = travel.target - time
      const change = Math.sign(gap) * Math.min(Math.abs(gap), delta * 1.5 * speed)
      time += change
      if (Math.abs(gap) < 0.001) { time = travel.target; playing = travel.resume; travel = null; updatePlayback() }
      dirty = true
    } else if (playing) {
      if (hold > 0) hold -= delta * speed
      else {
        time = clamp(time + direction * delta * speed * span / 3.2, fold.start, fold.end)
        if (time === fold.start || time === fold.end) { direction *= -1; hold = 0.85 }
      }
      dirty = true
    }
    animateViewTurn(delta)
    controls?.update()
    if (dirty) {
      const fraction = clamp((time - fold.start) / span)
      $('progress').value = String(Math.round(fraction * 1000))
      $('progress').style.setProperty('--progress', `${fraction * 100}%`)
      $('progress').setAttribute('aria-valuetext', `${Math.round(fraction * 100)} percent of fold ${fold.label}`)
      $('progress-value').textContent = `${Math.round(fraction * 100)}%`
      drawPaper()
      renderer?.render(scene, camera)
      dirty = false
    }
  }
  requestAnimationFrame(frame)
}

$('previous').onclick = () => chooseFold(selected - 1)
$('next').onclick = () => chooseFold((selected + 1) % substeps.length)
$('play').onclick = () => {
  if (travel) {
    cancelTravel()
    playing = false
    updatePlayback()
    return
  }
  playing = !playing
  if (time >= substeps[selected].end) direction = -1
  if (time <= substeps[selected].start) direction = 1
  updatePlayback()
  dirty = true
}
$('progress').oninput = event => {
  travel = null
  playing = false
  const fold = substeps[selected]
  time = fold.start + Number(event.target.value) / 1000 * (fold.end - fold.start)
  hold = 0
  updatePlayback()
  dirty = true
}
$('zoom-in').onclick = () => zoom(0.85)
$('zoom-out').onclick = () => zoom(1 / 0.85)
$('reset-view').onclick = resetView
$('flip-view').onclick = () => {
  if (!camera || viewTurn) return
  if (reducedMotion.matches) { rotateView(Math.PI); controls.update(); return }
  viewTurn = { elapsed: 0, angle: 0 }
  $('flip-view').disabled = true
}
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
  catch { $('fullscreen').title = 'Full screen is unavailable in this browser.' }
}
if (!document.fullscreenEnabled) $('fullscreen').hidden = true
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Full screen')
  $('fullscreen').title = document.fullscreenElement ? 'Exit full screen' : 'Full screen'
})
reducedMotion.addEventListener('change', event => {
  if (!event.matches) return
  playing = false
  cancelTravel()
  if (viewTurn) { rotateView(Math.PI - viewTurn.angle); cancelViewTurn() }
  updatePlayback()
  dirty = true
})
document.addEventListener('keydown', event => {
  if (event.target.matches('input, select, button, a')) return
  if (event.code === 'Space') { event.preventDefault(); $('play').click() }
  if (event.key.toLowerCase() === 'r') resetView()
  if (event.key === '+' || event.key === '=') zoom(0.9)
  if (event.key === '-') zoom(1 / 0.9)
  if (/^[0-9]$/.test(event.key)) {
    const step = Number(event.key) || 10
    if (step <= steps.length) chooseStep(step - 1)
  }
  if (event.target === $('viewport') && event.key.startsWith('Arrow') && camera) {
    event.preventDefault()
    cancelViewTurn()
    const vector = camera.position.clone().sub(controls.target)
    const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? camera.up : new THREE.Vector3().crossVectors(vector, camera.up).normalize()
    vector.applyAxisAngle(axis, (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 1 : -1) * 0.12)
    camera.position.copy(controls.target).add(vector)
    controls.update()
    dirty = true
  }
})

try { setupScene() } catch (error) { console.error('Unable to initialize 3D view', error); $('graphics-error').hidden = false }
renderSteps()
updateStep()
updatePlayback()
requestAnimationFrame(frame)
