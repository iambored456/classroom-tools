import test from 'node:test'
import assert from 'node:assert/strict'
import { WIDTH, HEIGHT } from './model.js'
import { panels, substeps, paperArea, poseVertex, posePaperVertex, LOCK_Y } from './raven.js'

const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]))
const close = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} != ${b}`)
const times = [...new Set(substeps.flatMap(f => [f.start, (f.start + f.end) / 2, f.end]))]

test('Raven preserves the full sheet and follows all twelve printed fold labels', () => {
  close(paperArea(), WIDTH * HEIGHT)
  assert.deepEqual(substeps.map(f => f.label), ['1V', '2V', '3V', '4M', '5M', '6M', '7M', '8M', '9V', '10V', '11M', '12M'])
  for (let i = 1; i < substeps.length; i++) close(substeps[i - 1].end, substeps[i].start)
})

test('Raven remains rigid, finite and attached through every fold', () => {
  const shared = new Map()
  for (const panel of panels) for (const vertex of panel.vertices) {
    const key = vertex.uv.map(n => n.toFixed(7)).join(',')
    shared.set(key, [...(shared.get(key) ?? []), { uv: vertex.uv, panel }])
  }
  for (const time of times) {
    for (const panel of panels) {
      const points = panel.vertices.map(v => posePaperVertex(v.uv, panel, time))
      assert.ok(points.flat().every(Number.isFinite))
      for (let i = 1; i < points.length; i++) close(distance(points[0], points[i]), distance(panel.vertices[0].uv, panel.vertices[i].uv))
    }
    for (const vertices of shared.values()) {
      const first = poseVertex(vertices[0].uv, vertices[0].panel, time)
      for (const v of vertices.slice(1)) close(distance(first, poseVertex(v.uv, v.panel, time)), 0, `seam at ${time}`)
    }
  }
})

test('paired Raven folds animate separately and hold the rest of the paper still', () => {
  for (const fold of substeps.filter(f => !['crease', 'pointDown', 'lockTip', 'body'].includes(f.operation))) {
    let movement = 0
    for (const panel of panels) {
      const moving = fold.operation.startsWith('wing')
        ? panel.wing && panel.side === (fold.operation === 'wingR' ? 1 : -1)
        : panel.folds.includes(fold.operation)
      for (const v of panel.vertices) {
        const a = posePaperVertex(v.uv, panel, fold.start)
        const b = posePaperVertex(v.uv, panel, (fold.start + fold.end) / 2)
        if (moving) movement = Math.max(movement, distance(a, b))
        else close(distance(a, b), 0, `${fold.label} must keep other panels still`)
      }
    }
    assert.ok(movement > 0.1, `${fold.label} has an individual animation`)
  }
})

test('9V lifts only the loose tip and the completed Raven has symmetric wings', () => {
  for (const panel of panels) for (const v of panel.vertices) {
    if (distance(v.uv, [0, 0]) < 1e-8) {
      close(poseVertex(v.uv, panel, 4)[1], -HEIGHT)
      close(poseVertex(v.uv, panel, 6)[1], 2 * LOCK_Y + HEIGHT)
    }
    if (distance(v.uv, [0, -HEIGHT]) < 1e-8) close(distance(poseVertex(v.uv, panel, 5), poseVertex(v.uv, panel, 6)), 0, 'the tail stays in place')
    if (!panel.wing) close(poseVertex(v.uv, panel, 8)[0], 0)
  }
  const final = panels.flatMap(p => p.vertices.map(v => poseVertex(v.uv, p, 8)))
  close(Math.min(...final.map(p => p[0])), -Math.max(...final.map(p => p[0])))
  assert.ok(Math.max(...final.map(p => p[0])) > 1.5)
})
