import type {
  CardinalCommand,
  CityMap,
  Command,
  DirectionMode,
  ExecutionStep,
  Goal,
  GoalSnapshot,
  Heading,
  LibraryData,
  NavNode,
  RelativeCommand,
  RepresentationMode,
  ResolvedMove,
  RoadEdge,
} from './types'

export const HEADINGS: Heading[] = ['north', 'east', 'south', 'west']
export const RELATIVE_COMMANDS: RelativeCommand[] = ['left', 'forward', 'right', 'uturn']
export const CARDINAL_COMMANDS: CardinalCommand[] = ['north', 'east', 'south', 'west']

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function headingBetween(from: NavNode, to: NavNode): Heading {
  if (from.x === to.x) return to.y < from.y ? 'north' : 'south'
  return to.x > from.x ? 'east' : 'west'
}

export function rotate(heading: Heading, quarterTurns: number): Heading {
  const index = HEADINGS.indexOf(heading)
  return HEADINGS[(index + quarterTurns + 8) % 4]
}

export function resolveRelative(heading: Heading, command: RelativeCommand): Heading {
  if (command === 'forward') return heading
  if (command === 'left') return rotate(heading, -1)
  if (command === 'right') return rotate(heading, 1)
  return rotate(heading, 2)
}

export function requestedHeading(
  mode: DirectionMode,
  currentHeading: Heading,
  command: Command,
): Heading {
  return mode === 'cardinal'
    ? (command as CardinalCommand)
    : resolveRelative(currentHeading, command as RelativeCommand)
}

export function nodeById(map: CityMap, id: string): NavNode | undefined {
  return map.nodes.find((node) => node.id === id)
}

export function otherNodeId(edge: RoadEdge, nodeId: string): string | null {
  if (edge.from === nodeId) return edge.to
  if (edge.to === nodeId) return edge.from
  return null
}

export function outgoingMoves(map: CityMap, nodeId: string): ResolvedMove[] {
  const from = nodeById(map, nodeId)
  if (!from) return []
  return map.edges.flatMap((edge) => {
    const targetId = otherNodeId(edge, nodeId)
    if (!targetId) return []
    const to = nodeById(map, targetId)
    if (!to) return []
    return [{ edge, from, to, heading: headingBetween(from, to) }]
  })
}

export function resolveCommand(
  map: CityMap,
  nodeId: string,
  heading: Heading,
  mode: DirectionMode,
  command: Command,
): ResolvedMove | null {
  const wanted = requestedHeading(mode, heading, command)
  return outgoingMoves(map, nodeId).find((move) => move.heading === wanted) ?? null
}

export function impossibleMessage(mode: DirectionMode, command: Command): string {
  if (mode === 'relative') return `Can't go ${command === 'uturn' ? 'back' : command} from here.`
  return `There is no road to the ${command} from here.`
}

const LETTERS: Record<Command, string> = {
  forward: 'F',
  left: 'L',
  right: 'R',
  uturn: 'U',
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',
}

const ARROWS: Record<Command, string> = {
  forward: '↑',
  left: '↰',
  right: '↱',
  uturn: '↶',
  north: '↑',
  east: '→',
  south: '↓',
  west: '←',
}

export function commandText(command: Command, representation: RepresentationMode): string {
  if (representation === 'letters') return LETTERS[command]
  if (representation === 'arrows') return ARROWS[command]
  return `${ARROWS[command]} ${LETTERS[command]}`
}

export function commandName(command: Command): string {
  return command === 'uturn' ? 'U-turn' : `${command[0].toUpperCase()}${command.slice(1)}`
}

export function blankGoalSnapshot(): GoalSnapshot {
  return { completedIds: [], activeIndex: 0, finalReached: false }
}

export function advanceGoals(
  goals: Goal[],
  destinationNodeId: string,
  snapshot: GoalSnapshot,
): GoalSnapshot {
  const ordered = [...goals].sort((a, b) => a.order - b.order)
  const active = ordered[snapshot.activeIndex]
  if (!active || active.nodeId !== destinationNodeId || snapshot.completedIds.includes(active.id)) {
    return { ...snapshot, completedIds: [...snapshot.completedIds] }
  }
  const completedIds = [...snapshot.completedIds, active.id]
  const activeIndex = snapshot.activeIndex + 1
  return {
    completedIds,
    activeIndex,
    finalReached: activeIndex >= ordered.length && ordered.length > 0,
  }
}

export function traceOffsetFor(history: ExecutionStep[], from: string, to: string): number {
  const repeats = history.filter(
    (step) =>
      (step.fromNodeId === from && step.toNodeId === to) ||
      (step.fromNodeId === to && step.toNodeId === from),
  ).length
  const offsets = [0, 1.1, -1.1, 2.1, -2.1]
  return offsets[Math.min(repeats, offsets.length - 1)]
}

export function glyphOffsetFor(history: ExecutionStep[], nodeId: string): { x: number; y: number } {
  const visits = history.filter((step) => step.fromNodeId === nodeId).length
  const offsets = [
    { x: 0, y: 0 },
    { x: 2.8, y: -2.8 },
    { x: -2.8, y: -2.8 },
    { x: 2.8, y: 2.8 },
    { x: -2.8, y: 2.8 },
  ]
  return offsets[Math.min(visits, offsets.length - 1)]
}

export function incidentStreetNames(map: CityMap, nodeId: string): string[] {
  return [...new Set(map.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId).map((edge) => edge.streetName).filter(Boolean))] as string[]
}

export function locationName(map: CityMap, nodeId: string, goals: Goal[]): string {
  const node = nodeById(map, nodeId)
  if (node?.label) return node.label
  const goal = goals.find((item) => item.nodeId === nodeId && item.label)
  if (goal) return goal.label
  const streets = incidentStreetNames(map, nodeId)
  if (streets.length >= 2) return `${streets[0]} & ${streets[1]}`
  if (streets.length === 1) return streets[0]
  return 'an unnamed intersection'
}

export function shortestDistances(map: CityMap, startId: string): Map<string, number> {
  const distances = new Map<string, number>([[startId, 0]])
  const queue = [startId]
  while (queue.length) {
    const current = queue.shift()!
    for (const move of outgoingMoves(map, current)) {
      if (distances.has(move.to.id)) continue
      distances.set(move.to.id, distances.get(current)! + 1)
      queue.push(move.to.id)
    }
  }
  return distances
}

export function isReachableSequence(map: CityMap, startId: string, goals: Goal[]): boolean {
  let current = startId
  for (const goal of [...goals].sort((a, b) => a.order - b.order)) {
    if (!shortestDistances(map, current).has(goal.nodeId)) return false
    current = goal.nodeId
  }
  return true
}

export function validateLibrary(value: unknown): value is LibraryData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<LibraryData>
  if (data.schemaVersion !== 1 || !Array.isArray(data.groups) || !Array.isArray(data.levels)) return false
  return data.groups.every((group) => group && typeof group.id === 'string' && typeof group.name === 'string') &&
    data.levels.every((level) => {
      if (!level || typeof level !== 'object') return false
      const candidate = level as Partial<LibraryData['levels'][number]>
      if (!(
        typeof candidate.id === 'string' &&
          typeof candidate.name === 'string' &&
          candidate.map &&
          Array.isArray(candidate.map.nodes) &&
          Array.isArray(candidate.map.edges) &&
          Array.isArray(candidate.goals)
      )) return false
      const nodeIds = new Set(candidate.map!.nodes.map((node) => node?.id))
      return candidate.map!.nodes.every((node) =>
        node && typeof node.id === 'string' && typeof node.x === 'number' && typeof node.y === 'number') &&
        candidate.map!.edges.every((edge) =>
          edge && typeof edge.id === 'string' && nodeIds.has(edge.from) && nodeIds.has(edge.to)) &&
        candidate.goals!.every((goal) => goal && typeof goal.id === 'string' && nodeIds.has(goal.nodeId)) &&
        typeof candidate.startNodeId === 'string' && nodeIds.has(candidate.startNodeId)
    })
}
