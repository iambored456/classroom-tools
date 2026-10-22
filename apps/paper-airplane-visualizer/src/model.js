// Letter paper, in inches. The nose is (0, 0); the tail is at y = -11.
// Creases from the supplied Basic Dart pattern: 45 degrees, 22.5 degrees,
// then wing hinges running from the nose to the quarter-width tail marks.
export const WIDTH = 8.5
export const HEIGHT = 11
export const HALF = WIDTH / 2
export const NARROW_Y = -HALF / Math.tan(Math.PI / 8)
export const WING_X = WIDTH / 4
// A slightly emphasized sheet thickness (0.2 mm) keeps contacting layers distinct.
export const PAPER_THICKNESS = 0.008
const EPS = 1e-8
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
export const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t) }

// Numbered steps share one phase across their folds; labelled folds keep their
// individual intervals. Main steps occupy consecutive unit intervals.
export function foldPhase(time, fold, combinedStep = null) {
  return smooth(combinedStep === fold.step
    ? time - fold.step
    : (time - fold.start) / (fold.end - fold.start))
}

export const steps = [
  { name: 'Centre crease', short: 'Crease', text: 'Bring the long edges together, crease the centre, then open the sheet again.', tip: 'This first fold opens again so the centre line can guide the next folds.', lines: '1V · fold & unfold' },
  { name: 'Fold the corners', short: 'Corners', text: 'Bring both top corners inward until their top edges meet at the centre.', tip: 'Match the two corners to the same centre line.', lines: '2V + 3V' },
  { name: 'Narrow the nose', short: 'Nose', text: 'Bring the two sloping edges inward to meet at the centre once more.', tip: 'Fold all the layers together to make a long, sharp point.', lines: '4M + 5M · marked on the reverse' },
  { name: 'Fold in half', short: 'Body', text: 'Close the two halves along the centre crease, keeping the folded layers inside.', tip: 'Both sides move together here so you can see the body taking shape.', lines: '6V' },
  { name: 'Fold the wings', short: 'Wings', text: 'Lower each wing outward along its sloping crease, leaving a narrow body underneath.', tip: 'Keep both wings even. Pause at the end to inspect your finished Basic Dart.', lines: '7V + 8V' },
]

// Keep the five-stage geometry timeline, with one playback interval per PDF label.
// Reverse-face labels are mirrored: 4M is the right nose and 7V the left wing.
export const substeps = [
  { label: '1V', operation: 'crease', step: 0, start: 0, end: 1, text: 'Fold along 1V to bring the long edges together, then reopen the sheet.' },
  { label: '2V', operation: 'cornerL', step: 1, start: 1, end: 1.5, text: 'Fold corner 2V inward until its top edge meets the centre crease.' },
  { label: '3V', operation: 'cornerR', step: 1, start: 1.5, end: 2, text: 'Keep 2V folded. Bring corner 3V inward to meet the same centre crease.' },
  { label: '4M', operation: 'noseR', printedSide: 'back', step: 2, start: 2, end: 2.5, text: 'Fold the layers along 4M inward toward the centre. The red mark is on the reverse.' },
  { label: '5M', operation: 'noseL', printedSide: 'back', step: 2, start: 2.5, end: 3, text: 'Keep 4M folded. Bring the other side inward along 5M to meet the centre.' },
  { label: '6V', operation: 'body', step: 3, start: 3, end: 4, text: 'Close the two halves along 6V, keeping the folded layers inside.' },
  { label: '7V', operation: 'wingL', step: 4, start: 4, end: 4.5, text: 'Lower wing 7V outward along its sloping crease, leaving a narrow body underneath.' },
  { label: '8V', operation: 'wingR', step: 4, start: 4.5, end: 5, text: 'Keep 7V folded. Lower wing 8V to match, then pause to inspect your finished plane.' },
]
const substepByOperation = new Map(substeps.map(fold => [fold.operation, fold]))
function foldProgress(time, operation, combinedStep) {
  return foldPhase(time, substepByOperation.get(operation), combinedStep)
}

export function rotate(p, axis, angle) {
  const length = Math.hypot(...axis)
  const [x, y, z] = axis.map(v => v / length)
  const c = Math.cos(angle), s = Math.sin(angle)
  const dot = p[0] * x + p[1] * y + p[2] * z
  return [
    p[0] * c + (y * p[2] - z * p[1]) * s + x * dot * (1 - c),
    p[1] * c + (z * p[0] - x * p[2]) * s + y * dot * (1 - c),
    p[2] * c + (x * p[1] - y * p[0]) * s + z * dot * (1 - c),
  ]
}

export function area(vertices, key = 'uv') {
  return Math.abs(vertices.reduce((sum, v, i) => {
    const w = vertices[(i + 1) % vertices.length]
    return sum + v[key][0] * w[key][1] - w[key][0] * v[key][1]
  }, 0)) / 2
}

export function clip(vertices, distance, side) {
  const out = []
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length]
    const da = distance(a.flat) * side, db = distance(b.flat) * side
    if (da >= -EPS) out.push(a)
    if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
      const t = da / (da - db)
      out.push({ uv: a.uv.map((v, j) => v + t * (b.uv[j] - v)), flat: a.flat.map((v, j) => v + t * (b.flat[j] - v)) })
    }
  }
  return out.filter((v, i) => !i || Math.hypot(v.uv[0] - out[i - 1].uv[0], v.uv[1] - out[i - 1].uv[1]) > EPS)
}

const foldOps = [
  { id: 'cornerL', axis: [-HALF, -HALF, 0], sign: -1, distance: p => -p[0] + p[1] },
  { id: 'cornerR', axis: [HALF, -HALF, 0], sign: 1, distance: p => p[0] + p[1] },
  { id: 'noseL', axis: [-HALF, NARROW_Y, 0], sign: -1, distance: p => -p[0] + p[1] * Math.tan(Math.PI / 8) },
  { id: 'noseR', axis: [HALF, NARROW_Y, 0], sign: 1, distance: p => p[0] + p[1] * Math.tan(Math.PI / 8) },
]

export function createPanels() {
  let panels = [{ vertices: [[-HALF, 0], [-HALF, -HEIGHT], [HALF, -HEIGHT], [HALF, 0]].map(p => ({ uv: [...p], flat: [...p, 0] })), folds: [] }]
  for (const op of foldOps) {
    panels = panels.flatMap(panel => [-1, 1].flatMap(side => {
      const vertices = clip(panel.vertices, op.distance, side)
      if (vertices.length < 3 || area(vertices) < EPS) return []
      return [{ vertices: vertices.map(v => ({ uv: v.uv, flat: side > 0 ? rotate(v.flat, op.axis, op.sign * Math.PI) : v.flat })), folds: side > 0 ? [...panel.folds, op.id] : panel.folds }]
    }))
  }
  // Subdivide in the folded, planar state; preserve the original paper coordinates.
  // These panels are the same rigid pieces throughout every animation stage.
  for (const distance of [p => p[0], p => p[0] + p[1] * WING_X / HEIGHT, p => -p[0] + p[1] * WING_X / HEIGHT]) {
    panels = panels.flatMap(panel => [-1, 1].flatMap(side => {
      const vertices = clip(panel.vertices, distance, side)
      return vertices.length >= 3 && area(vertices) > EPS ? [{ ...panel, vertices }] : []
    }))
  }
  return panels.map((panel, id) => {
    const centre = panel.vertices.reduce((a, v) => [a[0] + v.flat[0] / panel.vertices.length, a[1] + v.flat[1] / panel.vertices.length], [0, 0])
    return { ...panel, id, side: centre[0] >= 0 ? 1 : -1, wing: Math.abs(centre[0]) + centre[1] * WING_X / HEIGHT > EPS }
  })
}

export const panels = createPanels()
export const paperArea = () => panels.reduce((sum, p) => sum + area(p.vertices), 0)

function rotateAtHeight(p, axis, angle, height) {
  const rotated = rotate([p[0], p[1], p[2] - height], axis, angle)
  return [rotated[0], rotated[1], rotated[2] + height]
}

function pose(uv, panel, time, thickness, combinedStep) {
  let p = [...uv, 0]
  // A complete first stage includes both making and opening the centre crease.
  if (time < 1 && panel.side > 0) {
    p = rotateAtHeight(p, [0, 1, 0], -Math.PI * smooth(Math.sin(Math.PI * clamp(time))), thickness / 2)
  }
  for (const op of foldOps) {
    if (panel.folds.includes(op.id)) {
      const corner = op.id.startsWith('corner')
      const progress = foldProgress(time, op.id, combinedStep)
      // A one-sheet fold closes above z=0; the next two-layer fold closes
      // above the existing stack. This must not depend on a panel's normal/id.
      p = rotateAtHeight(p, op.axis, op.sign * Math.PI * progress, thickness * (corner ? 0.5 : 1.5))
    }
  }
  // Applying the wing rotation before the body rotation is the conjugated hinge
  // transform: its world-space axis follows that half of the folded body.
  if (panel.wing) p = rotateAtHeight(p, [panel.side * WING_X, -HEIGHT, 0], -panel.side * Math.PI / 2 * foldProgress(time, panel.side < 0 ? 'wingL' : 'wingR', combinedStep), -thickness / 2)
  p = rotateAtHeight(p, [0, 1, 0], -panel.side * Math.PI / 2 * smooth(time - 3), thickness * 3.5)
  return p
}

// Keep the ideal, attached-sheet model available for geometry validation.
export const poseVertex = (uv, panel, time, combinedStep = null) => pose(uv, panel, time, 0, combinedStep)
// Rendering uses the same rotations with hinges at the surface of each stack.
export const posePaperVertex = (uv, panel, time, combinedStep = null) => pose(uv, panel, time, PAPER_THICKNESS, combinedStep)

// Internal subdivisions are not creases. Only a boundary separating different
// fold histories gets a mark, after that fold has been made at least once.
export function creaseFormedAt(a, b) {
  if (!b) return Infinity
  if (a.side !== b.side) return 0.5
  const differing = [...a.folds, ...b.folds].filter(id => a.folds.includes(id) !== b.folds.includes(id))
  if (differing.length) return Math.min(...differing.map(id => substepByOperation.get(id).end))
  if (a.wing !== b.wing) return substepByOperation.get(a.side < 0 ? 'wingL' : 'wingR').end
  return Infinity
}

export function guideSegments(step) {
  if (step === 0 || step === 3) return [[[0, 0, 0], [0, -HEIGHT, 0]]]
  if (step === 1) return [-1, 1].map(s => [[0, 0, 0], [s * HALF, -HALF, 0]])
  if (step === 2) return [-1, 1].map(s => [[0, 0, 0], [s * HALF, NARROW_Y, 0]])
  return [-1, 1].map(s => [[0, 0, 0], rotate([s * WING_X, -HEIGHT, 0], [0, 1, 0], -s * Math.PI / 2)])
}
