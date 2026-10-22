import { WIDTH, HEIGHT, HALF, rotate, clip, area, clamp, smooth } from './model.js'

export const PAPER_THICKNESS = 0.004
export const NOSE_Y = -5.5
// Measured crease coordinates from the Letter pattern, converted from points.
export const NARROW_Y = -731 / 72
export const LOCK_Y = -HEIGHT + 192.9138 / 72
export const WING_X = (471.2704 - 306) / 72
const CORNER_DROP = HALF * 271.7702 / 279.5753
const EPS = 1e-8

export const steps = [
  { name: 'Centre crease', short: 'Crease' },
  { name: 'Fold the corners', short: 'Corners' },
  { name: 'Narrow the nose', short: 'Nose' },
  { name: 'Fold the point down', short: 'Point down' },
  { name: 'Fold the locking corners', short: 'Lock folds' },
  { name: 'Fold the locking tip up', short: 'Lock tip' },
  { name: 'Fold the body in half', short: 'Body' },
  { name: 'Fold the wings', short: 'Wings' },
]

export const substeps = [
  { label: '1V', operation: 'crease', step: 0, start: 0, end: 1, text: 'Fold the long edges together along 1V, crease, then reopen the sheet.' },
  { label: '2V', operation: 'cornerL', step: 1, start: 1, end: 1.5, text: 'Bring corner 2V inward until its top edge meets the centre crease.' },
  { label: '3V', operation: 'cornerR', step: 1, start: 1.5, end: 2, text: 'Keep 2V folded. Bring corner 3V inward to meet the same centre crease.' },
  { label: '4M', operation: 'narrowR', step: 2, start: 2, end: 2.5, text: 'Fold the sloping edge inward along 4M to meet the centre. The red mark is on the reverse.' },
  { label: '5M', operation: 'narrowL', step: 2, start: 2.5, end: 3, text: 'Keep 4M folded. Bring the opposite sloping edge to the centre along 5M.' },
  { label: '6M', operation: 'pointDown', step: 3, start: 3, end: 4, text: 'Fold the whole pointed nose down along 6M until its tip reaches the bottom edge.' },
  { label: '7M', operation: 'lockCornerR', step: 4, start: 4, end: 4.5, text: 'Fold the upper corner along 7M inward toward the centre.' },
  { label: '8M', operation: 'lockCornerL', step: 4, start: 4.5, end: 5, text: 'Keep 7M folded. Bring the opposite upper corner inward along 8M to match.' },
  { label: '9V', operation: 'lockTip', step: 5, start: 5, end: 6, text: 'Fold the loose triangular tip up along 9V, over the two corner flaps, to lock them down.' },
  { label: '10V', operation: 'body', step: 6, start: 6, end: 7, text: 'Close the airplane in half along 10V, keeping the locking tab secure.' },
  { label: '11M', operation: 'wingR', step: 7, start: 7, end: 7.5, text: 'Fold wing 11M outward along its sloping red crease, leaving the body underneath.' },
  { label: '12M', operation: 'wingL', step: 7, start: 7.5, end: 8, text: 'Keep 11M folded. Lower wing 12M to match and inspect your finished Raven.' },
]
const byOperation = new Map(substeps.map(fold => [fold.operation, fold]))
function progress(time, id) {
  const { start, end } = byOperation.get(id)
  return smooth((time - start) / (end - start))
}

function turn(p, origin, axis, angle, height = 0) {
  const q = rotate([p[0] - origin[0], p[1] - origin[1], p[2] - height], axis, angle)
  return [q[0] + origin[0], q[1] + origin[1], q[2] + height]
}

function operation(id, origin, end, moving, layer) {
  const axis = [end[0] - origin[0], end[1] - origin[1], 0]
  const distance = p => axis[0] * (p[1] - origin[1]) - axis[1] * (p[0] - origin[0])
  const side = Math.sign(distance(moving))
  return { id, origin, axis, distance: p => distance(p) * side, angle: Math.PI * side, layer }
}

// The blue side (PDF page 6) faces the initial camera. The mountain folds
// printed on page 5 therefore close toward this side of the sheet.
const operations = [
  operation('cornerL', [0, 0], [-HALF, -HALF], [-HALF, 0], 0.5),
  operation('cornerR', [0, 0], [HALF, -HALF], [HALF, 0], 0.5),
  operation('narrowR', [0, 0], [HALF, NARROW_Y], [HALF, -HALF], 1.5),
  operation('narrowL', [0, 0], [-HALF, NARROW_Y], [-HALF, -HALF], 1.5),
  operation('pointDown', [-HALF, NOSE_Y], [HALF, NOSE_Y], [0, 0], 3.5),
  operation('lockCornerR', [0, NOSE_Y], [HALF, NOSE_Y - CORNER_DROP], [HALF, NOSE_Y], 7.5),
  operation('lockCornerL', [0, NOSE_Y], [-HALF, NOSE_Y - CORNER_DROP], [-HALF, NOSE_Y], 7.5),
  { ...operation('lockTip', [-HALF, LOCK_Y], [HALF, LOCK_Y], [0, -HEIGHT], 11.5), only: panel => panel.folds.includes('pointDown') },
]

function split(pieces, distance, op) {
  return pieces.flatMap(panel => {
    if (op?.only && !op.only(panel)) return [panel]
    return [-1, 1].flatMap(side => {
      const vertices = clip(panel.vertices, distance, side)
      if (vertices.length < 3 || area(vertices) < EPS) return []
      const moving = side > 0 && op
      return [{
        vertices: vertices.map(v => ({ uv: v.uv, flat: moving ? turn(v.flat, op.origin, op.axis, op.angle) : v.flat })),
        folds: moving ? [...panel.folds, op.id] : panel.folds,
      }]
    })
  })
}

export function createPanels() {
  let pieces = [{ vertices: [[-HALF, 0], [-HALF, -HEIGHT], [HALF, -HEIGHT], [HALF, 0]].map(uv => ({ uv, flat: [...uv, 0] })), folds: [] }]
  pieces = split(pieces, p => p[0])
  for (const op of operations) pieces = split(pieces, op.distance, op)
  const wingSlope = WING_X / (HEIGHT + NOSE_Y)
  for (const distance of [p => p[0], p => p[0] + (p[1] - NOSE_Y) * wingSlope, p => -p[0] + (p[1] - NOSE_Y) * wingSlope]) pieces = split(pieces, distance)
  return pieces.map((panel, id) => {
    const centre = panel.vertices.reduce((sum, v) => sum.map((n, j) => n + v.flat[j] / panel.vertices.length), [0, 0])
    const originalX = panel.vertices.reduce((sum, v) => sum + v.uv[0], 0)
    return { ...panel, id, initialSide: originalX >= 0 ? 1 : -1, side: centre[0] >= 0 ? 1 : -1, wing: Math.abs(centre[0]) + (centre[1] - NOSE_Y) * wingSlope > EPS }
  })
}
export const panels = createPanels()
export const paperArea = () => panels.reduce((sum, panel) => sum + area(panel.vertices), 0)

function pose(uv, panel, time, thickness) {
  let p = [...uv, 0]
  if (time < 1 && panel.initialSide > 0) p = turn(p, [0, 0], [0, 1, 0], -Math.PI * smooth(Math.sin(Math.PI * clamp(time))), thickness / 2)
  for (const op of operations) if (panel.folds.includes(op.id)) p = turn(p, op.origin, op.axis, op.angle * progress(time, op.id), op.layer * thickness)
  // Wings use each half's coordinates before its body rotation, so their
  // hinges remain attached to the moving body throughout the fold.
  if (panel.wing) p = turn(p, [0, NOSE_Y], [panel.side * WING_X, -HEIGHT - NOSE_Y, 0], panel.side * (Math.PI / 2 - 0.035) * progress(time, panel.side > 0 ? 'wingR' : 'wingL'), thickness * 19.5)
  return turn(p, [0, 0], [0, 1, 0], panel.side * Math.PI / 2 * progress(time, 'body'), -thickness / 2)
}
export const poseVertex = (uv, panel, time) => pose(uv, panel, time, 0)
export const posePaperVertex = (uv, panel, time) => pose(uv, panel, time, PAPER_THICKNESS)
export const centerY = time => HEIGHT / 2 - NOSE_Y / 2 * smooth(time - 3)

export function creaseFormedAt(a, b) {
  if (!b) return Infinity
  if (a.initialSide !== b.initialSide) return 0.5
  const different = [...a.folds, ...b.folds].filter(id => a.folds.includes(id) !== b.folds.includes(id))
  if (different.length) return Math.min(...different.map(id => byOperation.get(id).end))
  if (a.side !== b.side) return byOperation.get('body').end
  if (a.wing !== b.wing) return byOperation.get(a.side > 0 ? 'wingR' : 'wingL').end
  return Infinity
}
