import assert from 'node:assert/strict'
import test from 'node:test'
import { chestPose, expressionPose } from './src/substitution'

test('the chest stays continuous between packing, moving and unpacking', () => {
  assert.deepEqual(chestPose(0, 1), chestPose(1, 0))
  assert.deepEqual(chestPose(1, 1), chestPose(2, 0))
  assert.equal(chestPose(2, 1).opacity, 0)
})

test('the expression travels above its starting point and fits inside the chest', () => {
  const start = expressionPose(0, 0)
  const arc = expressionPose(0, .57)
  const packed = expressionPose(0, 1)
  assert.ok(arc.y < start.y)
  assert.ok(arc.x < start.x && arc.x > packed.x)
  assert.equal(packed.x, chestPose(0, 1).x)
  assert.ok(packed.scale < .25)
  assert.equal(packed.opacity, 0)
})

test('unpacking leaves the complete bracketed expression at the replacement y', () => {
  const unpacked = expressionPose(2, 1)
  assert.equal(unpacked.x, chestPose(1, 1).x)
  assert.equal(unpacked.y, chestPose(1, 1).y)
  assert.equal(unpacked.scale, 1)
  assert.equal(unpacked.opacity, 1)
  assert.equal(unpacked.brackets, 1)
})
