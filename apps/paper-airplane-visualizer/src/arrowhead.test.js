import test from 'node:test'
import assert from 'node:assert/strict'
import { WIDTH, HEIGHT } from './model.js'
import { panels, paperArea, poseVertex, posePaperVertex, substeps } from './arrowhead.js'

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)

test('Arrowhead preserves the full sheet and every labelled fold has a playback interval', () => {
  close(paperArea(), WIDTH * HEIGHT)
  assert.deepEqual(substeps.filter(f => f.kind !== 'tuck').map(f => f.label), ['1V', '2M', '3V', '4V', '5M', '6V', '7M', '8M', '9M', '10M', '11V', '12M', '13M'])
  for (let i = 1; i < substeps.length; i++) close(substeps[i - 1].end, substeps[i].start)
})

test('Arrowhead panels stay finite and rigid outside the illustrated pocket flex', () => {
  for (const fold of substeps.filter(f => f.kind !== 'tuck')) for (const time of [fold.start, (fold.start + fold.end) / 2, fold.end]) for (const p of panels) {
    const points = p.vertices.map(v => posePaperVertex(v.uv, p, time))
    assert.ok(points.flat().every(Number.isFinite))
    // The tucked tab retains a slight bend to sit inside the pocket.
    if (time >= 7 && p.folds.includes('pointUp')) continue
    for (let i = 1; i < points.length; i++) close(distance(points[0], points[i]), distance(p.vertices[0].uv, p.vertices[i].uv))
  }
})

test('the ideal Arrowhead sheet stays attached and ends with symmetric wings', () => {
  const shared = new Map()
  for (const panel of panels) for (const v of panel.vertices) {
    const key = v.uv.map(n => n.toFixed(7)).join(',')
    shared.set(key, [...(shared.get(key) ?? []), { panel, uv: v.uv }])
  }
  for (const time of [0.5, 1.5, 2.25, 2.75, 3.5, 4.5, 5.25, 5.75, 6.25, 6.75, 7.5, 8.5, 9.25, 9.75, 10]) for (const vertices of shared.values()) {
    const first = poseVertex(vertices[0].uv, vertices[0].panel, time)
    for (const v of vertices.slice(1)) close(distance(first, poseVertex(v.uv, v.panel, time)), 0)
  }
  const final = panels.flatMap(p => p.vertices.map(v => poseVertex(v.uv, p, 10)))
  close(Math.min(...final.map(p => p[0])), -Math.max(...final.map(p => p[0])))
  assert.ok(Math.max(...final.map(p => p[0])) > 1.5)
})
