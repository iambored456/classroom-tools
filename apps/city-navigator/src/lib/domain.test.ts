import assert from 'node:assert/strict'
import {
  advanceGoals,
  blankGoalSnapshot,
  isReachableSequence,
  resolveCommand,
  resolveRelative,
  validateLibrary,
} from './domain'
import { cityBlocks, goalVisualOffset, shortenedCenterLine, streetLabels } from './layout'
import { addOrthogonalRoad, createSeedLibrary, generateLevel } from './maps'
import type { CityMap, Goal } from './types'

assert.equal(resolveRelative('east', 'forward'), 'east')
assert.equal(resolveRelative('east', 'left'), 'north')
assert.equal(resolveRelative('east', 'right'), 'south')
assert.equal(resolveRelative('east', 'uturn'), 'west')

const bend: CityMap = {
  id: 'bend',
  nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 10, y: 10 }],
  edges: [{ id: 'ab', from: 'a', to: 'b' }, { id: 'bc', from: 'b', to: 'c' }],
  overpasses: [],
}
assert.equal(resolveCommand(bend, 'b', 'east', 'relative', 'right')?.to.id, 'c')
assert.equal(resolveCommand(bend, 'b', 'east', 'relative', 'forward'), null)
assert.equal(resolveCommand(bend, 'b', 'east', 'cardinal', 'south')?.to.id, 'c')
assert.equal(resolveCommand(bend, 'b', 'east', 'cardinal', 'east'), null)

const orderedGoals: Goal[] = [
  { id: 'g1', nodeId: 'b', order: 0, type: 'number', label: '1' },
  { id: 'g2', nodeId: 'c', order: 1, type: 'star', label: 'Star' },
]
const passedFuture = advanceGoals(orderedGoals, 'c', blankGoalSnapshot())
assert.deepEqual(passedFuture.completedIds, [])
const firstReached = advanceGoals(orderedGoals, 'b', passedFuture)
assert.deepEqual(firstReached.completedIds, ['g1'])
const finished = advanceGoals(orderedGoals, 'c', firstReached)
assert.equal(finished.finalReached, true)
assert.equal(isReachableSequence(bend, 'a', orderedGoals), true)

const seed = createSeedLibrary()
assert.equal(validateLibrary(JSON.parse(JSON.stringify(seed))), true)
assert.equal(validateLibrary({ schemaVersion: 99, groups: [], levels: [] }), false)

const gridLevel = seed.levels.find((level) => level.id === 'level-grid')!
const blocks = cityBlocks(gridLevel.map)
assert.ok(blocks.length > 0)
for (const block of blocks) {
  for (const road of gridLevel.map.edges) {
    const from = gridLevel.map.nodes.find((node) => node.id === road.from)!
    const to = gridLevel.map.nodes.find((node) => node.id === road.to)!
    if (from.x === to.x) assert.equal(from.x > block.x && from.x < block.x + block.width, false)
    if (from.y === to.y) assert.equal(from.y > block.y && from.y < block.y + block.height, false)
  }
}
assert.equal(streetLabels(gridLevel.map).filter((label) => label.name === 'Pine Street').length, 1)
assert.deepEqual(
  goalVisualOffset({ id: 'star', nodeId: 'node', order: 0, type: 'star', label: 'Star', offset: { x: 8, y: -6 } }),
  { x: 0, y: 0 },
)
assert.deepEqual(shortenedCenterLine({ x: 10, y: 20 }, { x: 30, y: 20 }), { x1: 13.15, y1: 20, x2: 26.85, y2: 20 })

const overpassLevel = seed.levels.find((level) => level.id === 'level-overpass')!
assert.equal(overpassLevel.map.nodes.some((node) => node.x === 50 && node.y === 32), false)
assert.equal(resolveCommand(overpassLevel.map, 'o-a', 'east', 'cardinal', 'east')?.to.id, 'o-b')
assert.equal(resolveCommand(overpassLevel.map, 'o-a', 'east', 'cardinal', 'north'), null)

const crossed = addOrthogonalRoad(
  { id: 'cross', nodes: [{ id: 'v1', x: 50, y: 10 }, { id: 'v2', x: 50, y: 50 }], edges: [{ id: 'v', from: 'v1', to: 'v2' }], overpasses: [] },
  { x: 10, y: 30 },
  { x: 90, y: 30 },
)
const intersection = crossed.nodes.find((node) => node.x === 50 && node.y === 30)
assert.ok(intersection)
assert.equal(crossed.edges.filter((road) => road.from === intersection.id || road.to === intersection.id).length, 4)

for (const complexity of ['basic', 'intermediate', 'advanced'] as const) {
  const generated = generateLevel('test-group', { complexity, difficulty: 'long', goalCount: 3 })
  assert.equal(generated.map.edges.every((road) => {
    const from = generated.map.nodes.find((node) => node.id === road.from)!
    const to = generated.map.nodes.find((node) => node.id === road.to)!
    return from.x === to.x || from.y === to.y
  }), true)
  assert.equal(isReachableSequence(generated.map, generated.startNodeId, generated.goals), true)
}

console.log('City Routes domain tests passed.')
