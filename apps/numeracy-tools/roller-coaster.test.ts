import assert from 'node:assert/strict'
import test from 'node:test'
import { examples, factorQuadratic, graphGeometry } from './src/zeros-cannonball'
import { equationForAnimation } from './src/osprey'
import { coasterPose } from './src/roller-coaster'

test('roller coaster preserves both equation orientations and follows the graph from zero to zero', () => {
  for (const example of examples.slice(0, 2)) {
    const equation = equationForAnimation(example, 'rollercoaster')
    assert.deepEqual(equation, { a: example.a, b: example.b, c: example.c })
    for (const width of [520, 960]) {
      const graph = graphGeometry(factorQuadratic(equation), width)
      for (const t of [0, .25, .5, .75, 1]) {
        const pose = coasterPose(graph, t)
        assert.deepEqual({ x: pose.x, y: pose.y }, graph.point(t))
        assert.ok(pose.angle > -90 && pose.angle < 90)
      }
      assert.ok(Math.abs(coasterPose(graph, .5).angle) < 1e-10)
      assert.equal(Math.sign(coasterPose(graph, 0).angle), Math.sign(example.a))
      assert.equal(Math.sign(coasterPose(graph, 1).angle), -Math.sign(example.a))
      assert.deepEqual(coasterPose(graph, 2), coasterPose(graph, 1))
      assert.deepEqual(coasterPose(graph, -1), coasterPose(graph, 0))
      assert.ok(coasterPose(graph, .75).wheelAngle > coasterPose(graph, .25).wheelAngle)
    }
  }
})
