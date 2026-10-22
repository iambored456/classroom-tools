import { WIDTH, HEIGHT, HALF, rotate, clip, area, clamp, smooth, foldPhase } from './model.js'

// Letter-sized Arrowhead pattern: the hem is 1 inch, the first point is 4.25
// inches below it, and the return fold bisects that triangular point.
export const PAPER_THICKNESS = 0.004
export const HEM_Y = -1
export const NOSE_Y = HEM_Y - HALF
export const SIDE_Y = NOSE_Y - HALF
export const RETURN_Y = NOSE_Y - HALF / 2
export const WING_X = (HEIGHT + NOSE_Y) * Math.tan(Math.PI / 8)
const EPS = 1e-8

export const steps = [
  { name: 'Centre crease', short: 'Crease', tip: 'Make the long centre crease, then open the paper again.' },
  { name: 'Fold the top edge', short: 'Top edge', tip: 'Turn the sheet over to fold the small strip along 2M.' },
  { name: 'Fold the corners', short: 'Corners', text: 'Turn back to the front. Bring both corners inward along 3V and 4V to meet the centre.', tip: 'Turn back to the front and bring each corner to the centre.' },
  { name: 'Fold the point down', short: 'Point down', tip: 'The red 5M line is printed on the reverse.' },
  { name: 'Fold the point back up', short: 'Point up', tip: 'The point returns to the top edge of the folded paper.' },
  { name: 'Fold the sides inward', short: 'Sides', text: 'Turn the paper over. Fold both sides inward along 7M and 8M.', tip: 'Turn the paper over and fold the sides one at a time.' },
  { name: 'Shape the arrowhead', short: 'Nose', text: 'Bring both sides inward along 9M and 10M to form the pointed nose pocket.', tip: 'These folds bring the sides over the point to form the nose pocket.' },
  { name: 'Tuck the nose into the pocket', short: 'Tuck', tip: 'Separate the two nose layers gently, insert the loose point and press flat.' },
  { name: 'Fold the body in half', short: 'Body', tip: 'Keep the tucked nose secure as you close the centre crease.' },
  { name: 'Fold the wings', short: 'Wings', text: 'Lower both wings along 12M and 13M, leaving a narrow body and a slight upward wing angle.', tip: 'Match both wings. A slight upward angle helps the finished Arrowhead stay level.' },
]

export const substeps = [
  { label: '1V', operation: 'crease', step: 0, start: 0, end: 1, text: 'Fold the long edges together along 1V, crease, then reopen the sheet.' },
  { label: '2M', operation: 'hem', step: 1, start: 1, end: 2, text: 'Turn the paper over. Fold the top strip down along the red 2M line.' },
  { label: '3V', operation: 'cornerR', step: 2, start: 2, end: 2.5, text: 'Turn back to the front. Bring corner 3V inward until its edge meets the centre.' },
  { label: '4V', operation: 'cornerL', step: 2, start: 2.5, end: 3, text: 'Keep 3V folded. Bring corner 4V inward to the same centre crease.' },
  { label: '5M', operation: 'pointDown', printedSide: 'back', step: 3, start: 3, end: 4, text: 'Fold the whole triangular point down along 5M. The mark is on the reverse.' },
  { label: '6V', operation: 'pointUp', printedSide: 'back', step: 4, start: 4, end: 5, text: 'Fold the lower point back up along 6V until its tip touches the top edge.' },
  { label: '7M', operation: 'sideL', step: 5, start: 5, end: 5.5, text: 'Turn the paper over. Fold side 7M inward along the red crease.' },
  { label: '8M', operation: 'sideR', step: 5, start: 5.5, end: 6, text: 'Keep 7M folded. Bring the opposite side inward along 8M.' },
  { label: '9M', operation: 'noseL', step: 6, start: 6, end: 6.5, text: 'Continue folding the first side inward along 9M to shape the pointed nose.' },
  { label: '10M', operation: 'noseR', step: 6, start: 6.5, end: 7, text: 'Fold the other side along 10M to match, forming two layers at the nose.' },
  { label: 'Tuck', operation: 'tuck', kind: 'tuck', step: 7, start: 7, end: 8, text: 'Gently open the two nose layers, slide the loose point into the pocket, then press flat.' },
  { label: '11V', operation: 'body', step: 8, start: 8, end: 9, text: 'Close the airplane in half along 11V, keeping the tucked nose inside.' },
  { label: '12M', operation: 'wingL', step: 9, start: 9, end: 9.5, text: 'Fold wing 12M outward along the sloping red line, leaving a narrow body below.' },
  { label: '13M', operation: 'wingR', step: 9, start: 9.5, end: 10, text: 'Keep 12M folded. Lower wing 13M to match and leave a slight upward angle on both wings.' },
]
const byOperation = new Map(substeps.map(f => [f.operation, f]))
const progress = (time, id, combinedStep) => foldPhase(time, byOperation.get(id), combinedStep)

function turn(p, a, axis, angle, height = 0) {
  const q = rotate([p[0] - a[0], p[1] - a[1], p[2] - height], axis, angle)
  return [q[0] + a[0], q[1] + a[1], q[2] + height]
}

function operation(id, a, b, moving, towardFront, layer) {
  const axis = [b[0] - a[0], b[1] - a[1], 0]
  const distance = p => axis[0] * (p[1] - a[1]) - axis[1] * (p[0] - a[0])
  const side = Math.sign(distance(moving))
  return { id, a, axis, distance: p => side * distance(p), angle: Math.PI * side * towardFront, layer }
}

const sideInset = HALF * Math.tan(Math.PI / 8)
const operations = [
  operation('hem', [-HALF, HEM_Y], [HALF, HEM_Y], [0, 0], -1, -0.5),
  operation('cornerR', [0, HEM_Y], [HALF, NOSE_Y], [HALF, HEM_Y], 1, 0.5),
  operation('cornerL', [0, HEM_Y], [-HALF, NOSE_Y], [-HALF, HEM_Y], 1, 0.5),
  operation('pointDown', [-HALF, NOSE_Y], [HALF, NOSE_Y], [0, HEM_Y], 1, 2.5),
  { ...operation('pointUp', [-HALF / 2, RETURN_Y], [HALF / 2, RETURN_Y], [0, SIDE_Y], 1, 5.5), only: panel => panel.folds.includes('pointDown') },
  operation('sideL', [-HALF, SIDE_Y], [-HALF + sideInset, NOSE_Y], [-HALF, NOSE_Y], -1, -0.5),
  operation('sideR', [HALF, SIDE_Y], [HALF - sideInset, NOSE_Y], [HALF, NOSE_Y], -1, -0.5),
  operation('noseL', [-HALF, SIDE_Y], [0, NOSE_Y], [-HALF, NOSE_Y], -1, -4.5),
  operation('noseR', [HALF, SIDE_Y], [0, NOSE_Y], [HALF, NOSE_Y], -1, -4.5),
]

function split(pieces, distance, op) {
  return pieces.flatMap(panel => {
    if (op?.only && !op.only(panel)) return [panel]
    return [-1, 1].flatMap(side => {
      const vertices = clip(panel.vertices, distance, side)
      if (vertices.length < 3 || area(vertices) < EPS) return []
      const moving = side > 0 && op
      return [{
        vertices: vertices.map(v => ({ uv: v.uv, flat: moving ? turn(v.flat, op.a, op.axis, op.angle) : v.flat })),
        folds: moving ? [...panel.folds, op.id] : panel.folds,
      }]
    })
  })
}

export function createPanels() {
  let pieces = [{ vertices: [[-HALF, 0], [-HALF, -HEIGHT], [HALF, -HEIGHT], [HALF, 0]].map(uv => ({ uv, flat: [...uv, 0] })), folds: [] }]
  pieces = split(pieces, p => p[0])
  for (const op of operations) pieces = split(pieces, op.distance, op)
  for (const distance of [p => p[0], p => p[0] + (p[1] - NOSE_Y) * WING_X / (HEIGHT + NOSE_Y), p => -p[0] + (p[1] - NOSE_Y) * WING_X / (HEIGHT + NOSE_Y)]) pieces = split(pieces, distance)
  return pieces.map((p, id) => {
    const centre = p.vertices.reduce((s, v) => s.map((n, j) => n + v.flat[j] / p.vertices.length), [0, 0])
    const originalX = p.vertices.reduce((s, v) => s + v.uv[0], 0)
    return { ...p, id, initialSide: originalX >= 0 ? 1 : -1, side: centre[0] >= 0 ? 1 : -1, wing: Math.abs(centre[0]) + (centre[1] - NOSE_Y) * WING_X / (HEIGHT + NOSE_Y) > EPS }
  })
}
export const panels = createPanels()
export const paperArea = () => panels.reduce((sum, p) => sum + area(p.vertices), 0)

function pose(uv, panel, time, thickness, combinedStep) {
  let p = [...uv, 0]
  if (time < 1 && panel.initialSide > 0) p = turn(p, [0, 0], [0, 1, 0], -Math.PI * smooth(Math.sin(Math.PI * clamp(time))), thickness / 2)
  const tuck = clamp(time - 7)
  const pocketOpen = Math.sin(Math.PI * tuck) * 0.22
  for (const op of operations) if (panel.folds.includes(op.id)) {
    const opening = op.id.startsWith('nose') ? pocketOpen : 0
    const angle = op.angle * progress(time, op.id, combinedStep) - Math.sign(op.angle) * opening
    p = turn(p, op.a, op.axis, angle, op.layer * thickness)
  }
  // The tuck gently flexes the loose point through the open nose layers.
  // Keep its hinge fixed and close the pocket after the point is seated.
  if (panel.folds.includes('pointUp') && time > 7) {
    const weight = smooth((p[1] - RETURN_Y) / (NOSE_Y - RETURN_Y))
    const inserted = smooth(clamp((tuck - 0.18) / 0.58))
    p[1] += Math.sin(Math.PI * inserted) * 0.18 * weight
    p[2] -= inserted * thickness * 18 * weight
  }
  if (panel.wing) p = turn(p, [0, NOSE_Y], [panel.side * WING_X, -HEIGHT - NOSE_Y, 0], -panel.side * (Math.PI / 2 - 0.045) * progress(time, panel.side < 0 ? 'wingL' : 'wingR', combinedStep), -thickness * 10.5)
  return turn(p, [0, 0], [0, 1, 0], -panel.side * Math.PI / 2 * progress(time, 'body', combinedStep), thickness * 6.5)
}
export const poseVertex = (uv, panel, time, combinedStep = null) => pose(uv, panel, time, 0, combinedStep)
export const posePaperVertex = (uv, panel, time, combinedStep = null) => pose(uv, panel, time, PAPER_THICKNESS, combinedStep)
export const centerY = time => HEIGHT / 2 + 0.5 * smooth(time - 1) + (HALF / 2) * smooth(time - 3)

export function creaseFormedAt(a, b) {
  if (!b) return Infinity
  if (a.initialSide !== b.initialSide) return 0.5
  const different = [...a.folds, ...b.folds].filter(id => a.folds.includes(id) !== b.folds.includes(id))
  if (different.length) return Math.min(...different.map(id => byOperation.get(id).end))
  if (a.side !== b.side) return byOperation.get('body').end
  if (a.wing !== b.wing) return byOperation.get(a.side < 0 ? 'wingL' : 'wingR').end
  return Infinity
}
