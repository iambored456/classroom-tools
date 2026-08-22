import { clone, nodeById, shortestDistances, uid } from './domain'
import type {
  CityMap,
  GenerationOptions,
  Goal,
  Heading,
  Level,
  LibraryData,
  NavNode,
  Overpass,
  RoadEdge,
} from './types'

const now = () => new Date().toISOString()

const node = (id: string, x: number, y: number, label?: string): NavNode => ({ id, x, y, label })
const edge = (id: string, from: string, to: string, streetName?: string): RoadEdge => ({
  id,
  from,
  to,
  streetName,
})

function level(
  id: string,
  groupId: string,
  name: string,
  map: CityMap,
  startNodeId: string,
  initialHeading: Heading,
  goals: Goal[],
  order: number,
  extras: Partial<Level> = {},
): Level {
  return {
    id,
    groupId,
    name,
    order,
    map,
    startNodeId,
    initialHeading,
    goals,
    activityType: 'plan-route',
    complexity: 'basic',
    createdAt: now(),
    updatedAt: now(),
    ...extras,
  }
}

const goal = (
  id: string,
  nodeId: string,
  order: number,
  type: Goal['type'],
  label: string,
  x = 4,
  y = -4,
): Goal => ({ id, nodeId, order, type, label, offset: { x, y } })

export function createSeedLibrary(): LibraryData {
  const introId = 'group-intro'
  const challengeId = 'group-challenges'
  const predictionId = 'group-prediction'

  const gridNodes = [
    node('g-a', 18, 14), node('g-b', 50, 14), node('g-c', 82, 14),
    node('g-d', 18, 32), node('g-e', 50, 32, 'Town Square'), node('g-f', 82, 32),
    node('g-g', 18, 50), node('g-h', 50, 50), node('g-i', 82, 50),
  ]
  const gridMap: CityMap = {
    id: 'map-grid',
    nodes: gridNodes,
    edges: [
      edge('ge-1', 'g-a', 'g-b', 'Pine Street'), edge('ge-2', 'g-b', 'g-c', 'Pine Street'),
      edge('ge-3', 'g-d', 'g-e', 'King Street'), edge('ge-4', 'g-e', 'g-f', 'King Street'),
      edge('ge-5', 'g-g', 'g-h', 'Lake Street'), edge('ge-6', 'g-h', 'g-i', 'Lake Street'),
      edge('ge-7', 'g-a', 'g-d', '1st Avenue'), edge('ge-8', 'g-d', 'g-g', '1st Avenue'),
      edge('ge-9', 'g-b', 'g-e', '2nd Avenue'), edge('ge-10', 'g-e', 'g-h', '2nd Avenue'),
      edge('ge-11', 'g-c', 'g-f', '3rd Avenue'), edge('ge-12', 'g-f', 'g-i', '3rd Avenue'),
    ],
    overpasses: [],
  }

  const overpassMap: CityMap = {
    id: 'map-overpass',
    nodes: [node('o-a', 10, 32), node('o-b', 90, 32), node('o-c', 50, 7), node('o-d', 50, 57)],
    edges: [edge('oe-h', 'o-a', 'o-b', 'Market Street'), edge('oe-v', 'o-c', 'o-d', 'Bridge Avenue')],
    overpasses: [{ id: 'over-1', x: 50, y: 32, horizontalEdgeId: 'oe-h', verticalEdgeId: 'oe-v', upper: 'vertical' }],
  }

  const multiMap = clone(gridMap)
  multiMap.id = 'map-multi'

  const predictionMap = clone(gridMap)
  predictionMap.id = 'map-predict'

  return {
    schemaVersion: 1,
    seeded: true,
    groups: [
      { id: introId, name: 'One Goal', order: 0 },
      { id: challengeId, name: 'Multiple Goals', order: 1 },
      { id: predictionId, name: 'Predict the Destination', order: 2 },
    ],
    levels: [
      level('level-grid', introId, 'Across the Grid', gridMap, 'g-g', 'north', [goal('gg-1', 'g-c', 0, 'star', 'Yellow Star')], 0),
      level('level-overpass', challengeId, 'Under the Bridge', overpassMap, 'o-a', 'east', [goal('og-1', 'o-b', 0, 'library', 'Library')], 0, { complexity: 'intermediate' }),
      level('level-multi', challengeId, 'Saturday Errands', multiMap, 'g-a', 'south', [
        goal('mg-1', 'g-d', 0, 'grocery', 'Grocery Store', -4, -4),
        goal('mg-2', 'g-c', 1, 'library', 'Library', 4, -4),
        goal('mg-3', 'g-i', 2, 'school', 'School', 4, 4),
      ], 1, { complexity: 'intermediate' }),
      level('level-predict', predictionId, 'Where Will It End?', predictionMap, 'g-g', 'north', [], 0, {
        activityType: 'where-end',
        requiredMode: 'cardinal',
        storedRecipe: ['north', 'east', 'north', 'east'],
      }),
    ],
  }
}

export function emptyLevel(groupId: string): Level {
  const a = node(uid('node'), 24, 32)
  const b = node(uid('node'), 76, 32)
  return level(
    uid('level'),
    groupId,
    'New City Route',
    { id: uid('map'), nodes: [a, b], edges: [edge(uid('road'), a.id, b.id, 'Main Street')], overpasses: [] },
    a.id,
    'east',
    [goal(uid('goal'), b.id, 0, 'star', 'Yellow Star')],
    0,
  )
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

export function generateLevel(groupId: string, options: GenerationOptions): Level {
  const settings = {
    basic: { cols: 5, rows: 3, remove: 0.03 },
    intermediate: { cols: 6, rows: 4, remove: 0.18 },
    advanced: { cols: 7, rows: 5, remove: 0.27 },
  }[options.complexity]
  const seed = Date.now() % 2147483647
  const random = seededRandom(seed)
  const nodes: NavNode[] = []
  const edges: RoadEdge[] = []
  const left = 10
  const top = 9
  const dx = 80 / (settings.cols - 1)
  const dy = 46 / (settings.rows - 1)
  const nodeId = (column: number, row: number) => `n-${column}-${row}-${seed}`
  const columnPositions = Array.from({ length: settings.cols }, (_, column) =>
    left + column * dx + (column > 0 && column < settings.cols - 1 && options.complexity !== 'basic' ? (random() - 0.5) * 4 : 0))
  const rowPositions = Array.from({ length: settings.rows }, (_, row) =>
    top + row * dy + (row > 0 && row < settings.rows - 1 && options.complexity === 'advanced' ? (random() - 0.5) * 3 : 0))

  for (let row = 0; row < settings.rows; row += 1) {
    for (let column = 0; column < settings.cols; column += 1) {
      nodes.push(node(nodeId(column, row), columnPositions[column], rowPositions[row]))
    }
  }

  const streetNames = ['Oak Street', 'Maple Street', 'King Street', 'Garden Street', 'Lake Street']
  const avenueNames = ['1st Avenue', '2nd Avenue', '3rd Avenue', 'Park Avenue', 'Bridge Avenue', 'Central Avenue', 'Hill Avenue']
  for (let row = 0; row < settings.rows; row += 1) {
    for (let column = 0; column < settings.cols; column += 1) {
      if (column < settings.cols - 1) {
        edges.push(edge(uid('road'), nodeId(column, row), nodeId(column + 1, row), streetNames[row % streetNames.length]))
      }
      if (row < settings.rows - 1) {
        edges.push(edge(uid('road'), nodeId(column, row), nodeId(column, row + 1), avenueNames[column % avenueNames.length]))
      }
    }
  }

  let map: CityMap = { id: uid('map'), nodes, edges, overpasses: [] }
  const removable = [...edges].sort(() => random() - 0.5)
  const desiredRemovals = Math.floor(removable.length * settings.remove)
  let removed = 0
  for (const candidate of removable) {
    if (removed >= desiredRemovals) break
    const next = { ...map, edges: map.edges.filter((item) => item.id !== candidate.id) }
    if (shortestDistances(next, nodes[0].id).size === nodes.length) {
      map = next
      removed += 1
    }
  }

  const desiredOverpasses = options.complexity === 'basic' ? 0 : options.complexity === 'intermediate' ? 1 : 2
  for (let count = 0; count < desiredOverpasses; count += 1) {
    const candidates = map.nodes.filter((candidate) =>
      candidate.id !== nodes[0].id && map.edges.filter((road) => road.from === candidate.id || road.to === candidate.id).length === 4)
    const candidate = candidates[Math.floor(random() * candidates.length)]
    if (!candidate) break
    const converted = cycleCrossing(map, candidate.x, candidate.y, [nodes[0].id]).map
    if (converted.overpasses.length > map.overpasses.length && shortestDistances(converted, nodes[0].id).size === converted.nodes.length) {
      map = converted
    }
  }

  const start = map.nodes.find((item) => item.id === nodes[0].id) ?? map.nodes[0]
  const distances = [...shortestDistances(map, start.id).entries()].sort((a, b) => b[1] - a[1])
  const difficultyBand = options.difficulty === 'short' ? 0.72 : options.difficulty === 'medium' ? 0.36 : 0
  const firstIndex = Math.min(distances.length - 1, Math.max(0, Math.floor(distances.length * difficultyBand)))
  const chosen = [distances[firstIndex]?.[0] ?? distances[0][0]]
  for (const [candidate] of distances) {
    if (chosen.length >= options.goalCount) break
    if (candidate !== start.id && !chosen.includes(candidate)) chosen.push(candidate)
  }
  const goals = chosen.slice(0, options.goalCount).map((nodeIdValue, index) =>
    goal(uid('goal'), nodeIdValue, index, index === options.goalCount - 1 ? 'star' : 'number', index === options.goalCount - 1 ? 'Yellow Star' : `Goal ${index + 1}`),
  )

  return level(uid('level'), groupId, `Generated ${options.complexity} city`, map, start.id, 'east', goals, 0, {
    complexity: options.complexity,
  })
}

export function addOrthogonalRoad(mapValue: CityMap, start: { x: number; y: number }, end: { x: number; y: number }): CityMap {
  if (start.x !== end.x && start.y !== end.y) return mapValue
  const map = clone(mapValue)
  const findOrCreate = (x: number, y: number) => {
    const existing = map.nodes.find((item) => Math.abs(item.x - x) < 0.1 && Math.abs(item.y - y) < 0.1)
    if (existing) return existing
    const created = node(uid('node'), x, y)
    map.nodes.push(created)
    return created
  }
  const first = findOrCreate(start.x, start.y)
  const last = findOrCreate(end.x, end.y)
  const horizontal = start.y === end.y
  const minA = horizontal ? Math.min(start.x, end.x) : Math.min(start.y, end.y)
  const maxA = horizontal ? Math.max(start.x, end.x) : Math.max(start.y, end.y)

  for (const existingEdge of [...map.edges]) {
    const from = nodeById(map, existingEdge.from)!
    const to = nodeById(map, existingEdge.to)!
    const existingHorizontal = from.y === to.y
    if (horizontal === existingHorizontal) continue
    const crossX = horizontal ? from.x : start.x
    const crossY = horizontal ? start.y : from.y
    const onNew = horizontal ? crossX > minA && crossX < maxA : crossY > minA && crossY < maxA
    const existingMin = existingHorizontal ? Math.min(from.x, to.x) : Math.min(from.y, to.y)
    const existingMax = existingHorizontal ? Math.max(from.x, to.x) : Math.max(from.y, to.y)
    const onExisting = (existingHorizontal ? crossX : crossY) > existingMin && (existingHorizontal ? crossX : crossY) < existingMax
    if (!onNew || !onExisting) continue
    const cross = findOrCreate(crossX, crossY)
    map.edges = map.edges.filter((item) => item.id !== existingEdge.id)
    map.edges.push(
      edge(uid('road'), existingEdge.from, cross.id, existingEdge.streetName),
      edge(uid('road'), cross.id, existingEdge.to, existingEdge.streetName),
    )
  }

  const points = map.nodes
    .filter((item) => horizontal
      ? Math.abs(item.y - start.y) < 0.1 && item.x >= minA && item.x <= maxA
      : Math.abs(item.x - start.x) < 0.1 && item.y >= minA && item.y <= maxA)
    .sort((a, b) => horizontal ? a.x - b.x : a.y - b.y)
  if (!points.some((item) => item.id === first.id)) points.push(first)
  if (!points.some((item) => item.id === last.id)) points.push(last)
  points.sort((a, b) => horizontal ? a.x - b.x : a.y - b.y)
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    const exists = map.edges.some((item) =>
      (item.from === from.id && item.to === to.id) || (item.from === to.id && item.to === from.id))
    if (!exists) map.edges.push(edge(uid('road'), from.id, to.id))
  }
  return map
}

export function cycleCrossing(mapValue: CityMap, x: number, y: number, protectedNodeIds: string[] = []): { map: CityMap; message: string } {
  const map = clone(mapValue)
  const overpass = map.overpasses.find((item) => Math.hypot(item.x - x, item.y - y) < 4)
  if (overpass) {
    if (overpass.upper === 'horizontal') {
      overpass.upper = 'vertical'
      return { map, message: 'Vertical road now passes over.' }
    }
    const horizontal = map.edges.find((item) => item.id === overpass.horizontalEdgeId)
    const vertical = map.edges.find((item) => item.id === overpass.verticalEdgeId)
    if (!horizontal || !vertical) return { map: mapValue, message: 'Crossing data could not be changed.' }
    const shared = node(uid('node'), overpass.x, overpass.y)
    map.nodes.push(shared)
    map.edges = map.edges.filter((item) => item.id !== horizontal.id && item.id !== vertical.id)
    map.edges.push(
      edge(uid('road'), horizontal.from, shared.id, horizontal.streetName),
      edge(uid('road'), shared.id, horizontal.to, horizontal.streetName),
      edge(uid('road'), vertical.from, shared.id, vertical.streetName),
      edge(uid('road'), shared.id, vertical.to, vertical.streetName),
    )
    map.overpasses = map.overpasses.filter((item) => item.id !== overpass.id)
    return { map, message: 'Crossing is now an intersection.' }
  }

  const crossingNode = map.nodes.find((item) => Math.hypot(item.x - x, item.y - y) < 4)
  if (!crossingNode) return { map: mapValue, message: 'Choose a four-way intersection or overpass.' }
  if (protectedNodeIds.includes(crossingNode.id)) return { map: mapValue, message: 'Move the start or goal before converting this intersection.' }
  const incident = map.edges.filter((item) => item.from === crossingNode.id || item.to === crossingNode.id)
  if (incident.length !== 4) return { map: mapValue, message: 'Only a four-way intersection can become an overpass.' }
  const endpoints = incident.map((item) => ({ edge: item, node: nodeById(map, item.from === crossingNode.id ? item.to : item.from)! }))
  const left = endpoints.find((item) => item.node.x < crossingNode.x)
  const right = endpoints.find((item) => item.node.x > crossingNode.x)
  const top = endpoints.find((item) => item.node.y < crossingNode.y)
  const bottom = endpoints.find((item) => item.node.y > crossingNode.y)
  if (!left || !right || !top || !bottom) return { map: mapValue, message: 'This crossing is not a straight four-way intersection.' }
  map.edges = map.edges.filter((item) => !incident.some((road) => road.id === item.id))
  map.nodes = map.nodes.filter((item) => item.id !== crossingNode.id)
  const horizontal = edge(uid('road'), left.node.id, right.node.id, left.edge.streetName ?? right.edge.streetName)
  const vertical = edge(uid('road'), top.node.id, bottom.node.id, top.edge.streetName ?? bottom.edge.streetName)
  map.edges.push(horizontal, vertical)
  const newOverpass: Overpass = {
    id: uid('overpass'), x: crossingNode.x, y: crossingNode.y,
    horizontalEdgeId: horizontal.id, verticalEdgeId: vertical.id, upper: 'horizontal',
  }
  map.overpasses.push(newOverpass)
  return { map, message: 'Horizontal road now passes over.' }
}
