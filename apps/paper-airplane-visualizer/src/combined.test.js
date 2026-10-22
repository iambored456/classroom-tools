import test from 'node:test'
import assert from 'node:assert/strict'
import { designs } from './designs.js'

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]))
const close = (a, b, message) => assert.ok(distance(a, b) < 1e-7, message)
const moves = (panel, fold) => fold.operation.startsWith('wing')
  ? panel.wing && panel.side === (fold.operation.endsWith('L') ? -1 : 1)
  : panel.folds.includes(fold.operation)

for (const design of designs) {
  test(`${design.name}: numbered steps move every paired fold simultaneously`, () => {
    for (let step = 0; step < design.steps.length; step++) {
      const folds = design.substeps.filter(fold => fold.step === step)
      assert.equal(folds[0].start, step)
      assert.equal(folds.at(-1).end, step + 1)
      for (const boundary of [step, step + 1]) for (const panel of design.panels) for (const vertex of panel.vertices) {
        close(design.posePaperVertex(vertex.uv, panel, boundary, step), design.posePaperVertex(vertex.uv, panel, boundary), 'mode changes share identical endpoint geometry')
      }
      if (folds.length < 2) continue
      for (const fold of folds) {
        let movement = 0
        const panels = design.panels.filter(panel => moves(panel, fold) && !folds.some(other => other !== fold && moves(panel, other)))
        assert.ok(panels.length > 0, `${fold.label} has its own moving panels`)
        for (const phase of [0.25, 0.5, 0.75]) for (const panel of panels) for (const vertex of panel.vertices) {
          const actual = design.posePaperVertex(vertex.uv, panel, step + phase, step)
          const expected = design.posePaperVertex(vertex.uv, panel, fold.start + phase * (fold.end - fold.start))
          close(actual, expected, `${fold.label} moves at the shared step phase ${phase}`)
          movement = Math.max(movement, distance(actual, design.posePaperVertex(vertex.uv, panel, step)))
        }
        assert.ok(movement > 0.1, `${fold.label} must visibly move alongside the other fold`)
      }
      for (const phase of [0.25, 0.5, 0.75]) for (const panel of design.panels) {
        // The ideal sheet excludes Arrowhead's existing retained pocket bend.
        const points = panel.vertices.map(vertex => design.poseVertex(vertex.uv, panel, step + phase, step))
        for (let i = 1; i < points.length; i++) {
          assert.ok(Math.abs(distance(points[0], points[i]) - distance(panel.vertices[0].uv, panel.vertices[i].uv)) < 1e-7, 'simultaneous folds preserve rigid paper panels')
        }
      }
    }
  })
}
