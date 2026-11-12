import assert from 'node:assert/strict'
import test from 'node:test'
import { mathAsset, solutionRows, solutionSize, solutionFirstBaseline } from './src/math/layout'

test('both sides of the division operation use real stacked fractions', () => {
  const row = solutionRows.find(row => row.left.includes('\\frac'))!
  assert.ok(row)
  for (const tex of [row.left, row.right]) {
    assert.match(mathAsset(tex).markup, /data-mml-node="mfrac"/)
  }
})

test('accumulated solution rows stay separated and inside the scene', () => {
  let previousBottom = solutionFirstBaseline + 8
  for (const row of solutionRows) {
    const assets = [mathAsset(row.left), mathAsset('='), mathAsset(row.right)]
    const top = row.baseline + Math.min(...assets.map(asset => asset.top)) * solutionSize / 1000
    const bottom = row.baseline + Math.max(...assets.map(asset => asset.top + asset.height)) * solutionSize / 1000
    assert.ok(top >= previousBottom + 10, `Row overlaps previous math: ${row.left}`)
    assert.ok(bottom < 500, `Row extends outside the scene: ${row.left}`)
    previousBottom = bottom
  }
})
