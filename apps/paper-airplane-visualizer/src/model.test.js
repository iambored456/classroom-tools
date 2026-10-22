import test from 'node:test'
import assert from 'node:assert/strict'
import { panels, substeps, poseVertex, posePaperVertex, PAPER_THICKNESS, creaseFormedAt, paperArea, WIDTH, HEIGHT } from './model.js'

const close = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} != ${b}`)
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
const samples = Array.from({ length: 101 }, (_, i) => i / 20)

test('panels preserve the entire 8.5 by 11 inch sheet', () => {
  close(paperArea(), WIDTH * HEIGHT)
  assert.ok(panels.length > 8)
})

test('every panel remains rigid through every fold and reverse', () => {
  for (const time of samples) for (const panel of panels) {
    const points = panel.vertices.map(v => poseVertex(v.uv, panel, time))
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      close(distance(points[i], points[j]), distance(panel.vertices[i].uv, panel.vertices[j].uv), `rigid panel ${panel.id} at ${time}`)
      assert.ok(points[i].every(Number.isFinite))
    }
  }
})

test('shared vertices stay attached throughout the full timeline', () => {
  const shared = new Map()
  for (const p of panels) for (const v of p.vertices) {
    const key = v.uv.map(n => n.toFixed(7)).join(',')
    shared.set(key, [...(shared.get(key) ?? []), { uv: v.uv, panel: p }])
  }
  for (const time of samples) for (const group of shared.values()) {
    const anchor = poseVertex(group[0].uv, group[0].panel, time)
    for (const v of group.slice(1)) close(distance(anchor, poseVertex(v.uv, v.panel, time)), 0, `seam at ${time}`)
  }
})

test('centre crease closes fully halfway through step one and reopens', () => {
  const right = panels.find(p => p.vertices.some(v => v.uv[0] > 1))
  const point = right.vertices.find(v => v.uv[0] > 1).uv
  close(poseVertex(point, right, 0.5)[0], -point[0])
  close(distance(poseVertex(point, right, 0), poseVertex(point, right, 1)), 0)
})

test('final plane has a vertical body and symmetric wings with a fixed nose', () => {
  const final = panels.flatMap(panel => panel.vertices.map(v => poseVertex(v.uv, panel, 5)))
  const extent = [Math.min(...final.map(v => v[0])), Math.max(...final.map(v => v[0]))]
  close(extent[0], -extent[1])
  assert.ok(extent[1] > 1.5, 'wings extend on both sides')
  for (const p of panels.filter(p => !p.wing)) for (const v of p.vertices) close(poseVertex(v.uv, p, 5)[0], 0)
  for (const p of panels) for (const v of p.vertices.filter(v => distance(v.uv, [0, 0]) < 1e-8)) close(distance(poseVertex(v.uv, p, 5), [0, 0, 0]), 0)
})

test('every adjacent step meets continuously and reversing retraces the same model', () => {
  for (const panel of panels) for (const v of panel.vertices) {
    for (let step = 1; step < 5; step++) assert.ok(distance(poseVertex(v.uv, panel, step - 1e-6), poseVertex(v.uv, panel, step + 1e-6)) < 1e-7)
    const forward = samples.map(t => poseVertex(v.uv, panel, t))
    const reverse = [...samples].reverse().map(t => poseVertex(v.uv, panel, t)).reverse()
    assert.deepEqual(reverse, forward)
  }
})

test('finite-thickness panels stay rigid and continuous across step boundaries', () => {
  for (const panel of panels) for (const time of samples) {
    const points = panel.vertices.map(v => posePaperVertex(v.uv, panel, time))
    for (let i = 1; i < points.length; i++) close(distance(points[0], points[i]), distance(panel.vertices[0].uv, panel.vertices[i].uv))
    for (const v of panel.vertices) assert.deepEqual(posePaperVertex(v.uv, panel, time), posePaperVertex(v.uv, { ...panel, id: panel.id + 1000 }, time), 'panel IDs cannot alter layer order')
  }
  for (const panel of panels) for (const v of panel.vertices) for (let step = 1; step < 5; step++) {
    assert.ok(distance(posePaperVertex(v.uv, panel, step - 1e-6), posePaperVertex(v.uv, panel, step + 1e-6)) < 1e-7)
  }
})

test('closing corner folds never sink through the receiving top surface', () => {
  const moving = panels.filter(p => p.folds.some(id => id.startsWith('corner')))
  for (const fold of substeps.filter(f => f.operation.startsWith('corner'))) for (let i = 0; i <= 50; i++) {
    const time = fold.start + (fold.end - fold.start) * (0.5 + i / 100)
    for (const panel of moving.filter(p => p.folds.includes(fold.operation))) {
      const points = panel.vertices.map(v => posePaperVertex(v.uv, panel, time))
      let normalZ = 0
      for (let j = 1; j < points.length - 1; j++) {
        const a = points[j].map((v, k) => v - points[0][k])
        const b = points[j + 1].map((v, k) => v - points[0][k])
        const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
        if (Math.hypot(...n) > 1e-8) { normalZ = n[2] / Math.hypot(...n); break }
      }
      for (const p of points) {
        const bottomSurface = p[2] - Math.abs(normalZ) * PAPER_THICKNESS / 2
        assert.ok(bottomSurface >= PAPER_THICKNESS / 2 - 1e-8, `corner penetrates base at ${time}: ${bottomSurface}`)
      }
    }
  }
  for (const p of moving) for (const v of p.vertices) close(posePaperVertex(v.uv, p, 2)[2], PAPER_THICKNESS)
})

test('paired PDF folds move individually while completed and future folds stay still', () => {
  for (const fold of substeps.filter(f => !['crease', 'body'].includes(f.operation))) {
    const middle = (fold.start + fold.end) / 2
    let largestMovement = 0
    for (const panel of panels) {
      const moves = fold.operation.startsWith('wing')
        ? panel.wing && panel.side === (fold.operation === 'wingL' ? -1 : 1)
        : panel.folds.includes(fold.operation)
      for (const v of panel.vertices) {
        const start = posePaperVertex(v.uv, panel, fold.start)
        const halfway = posePaperVertex(v.uv, panel, middle)
        if (moves) largestMovement = Math.max(largestMovement, distance(start, halfway))
        else {
          close(distance(start, halfway), 0, `${fold.label} must leave panel ${panel.id} still`)
          close(distance(start, posePaperVertex(v.uv, panel, fold.end)), 0)
        }
      }
    }
    assert.ok(largestMovement > 0.1, `${fold.label} has an independent animation`)
  }
})

test('the narrowing fold keeps its layer stack above the existing corner layers', () => {
  for (const panel of panels) {
    const corner = panel.folds.some(id => id.startsWith('corner'))
    const nose = panel.folds.some(id => id.startsWith('nose'))
    const layer = nose ? (corner ? 2 : 3) : (corner ? 1 : 0)
    for (const v of panel.vertices) close(posePaperVertex(v.uv, panel, 3)[2], layer * PAPER_THICKNESS)
  }
})

test('a reopened centre crease is marked after the first fold; subdivisions are not', () => {
  const right = panels.find(p => p.side === 1)
  const left = panels.find(p => p.side === -1)
  assert.equal(creaseFormedAt(left, right), 0.5)
  assert.ok(1 >= creaseFormedAt(left, right), 'the centre crease remains at the reopened endpoint')
  assert.equal(creaseFormedAt(left, { ...left, id: -1 }), Infinity)
  assert.equal(creaseFormedAt(left, undefined), Infinity)
})
