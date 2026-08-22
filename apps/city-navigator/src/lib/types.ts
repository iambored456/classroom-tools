export type DirectionMode = 'relative' | 'cardinal'
export type RepresentationMode = 'letters' | 'arrows' | 'letters-arrows'
export type Heading = 'north' | 'east' | 'south' | 'west'
export type RelativeCommand = 'forward' | 'left' | 'right' | 'uturn'
export type CardinalCommand = Heading
export type Command = RelativeCommand | CardinalCommand
export type ActivityType = 'plan-route' | 'where-end'
export type GoalType = 'star' | 'number' | 'library' | 'grocery' | 'school' | 'custom'
export type Complexity = 'basic' | 'intermediate' | 'advanced'
export type RouteDifficulty = 'short' | 'medium' | 'long'

export interface Point {
  x: number
  y: number
}

export interface NavNode extends Point {
  id: string
  label?: string
}

export interface RoadEdge {
  id: string
  from: string
  to: string
  streetName?: string
}

export interface Overpass extends Point {
  id: string
  horizontalEdgeId: string
  verticalEdgeId: string
  upper: 'horizontal' | 'vertical'
}

export interface CityMap {
  id: string
  nodes: NavNode[]
  edges: RoadEdge[]
  overpasses: Overpass[]
}

export interface Goal {
  id: string
  nodeId: string
  order: number
  type: GoalType
  label: string
  offset?: Point
}

export interface Level {
  id: string
  groupId: string
  name: string
  order: number
  activityType: ActivityType
  map: CityMap
  startNodeId: string
  initialHeading: Heading
  goals: Goal[]
  requiredMode?: DirectionMode
  storedRecipe?: Command[]
  complexity: Complexity
  createdAt: string
  updatedAt: string
}

export interface LevelGroup {
  id: string
  name: string
  order: number
}

export interface LibraryData {
  schemaVersion: 1
  groups: LevelGroup[]
  levels: Level[]
  seeded: boolean
}

export interface GoalSnapshot {
  completedIds: string[]
  activeIndex: number
  finalReached: boolean
}

export interface ExecutionStep {
  id: string
  commandIndex: number
  command: Command
  fromNodeId: string
  toNodeId: string
  headingBefore: Heading
  headingAfter: Heading
  edgeId: string
  traceOffset: number
  glyphOffset: Point
  goalsBefore: GoalSnapshot
  goalsAfter: GoalSnapshot
}

export interface ResolvedMove {
  edge: RoadEdge
  from: NavNode
  to: NavNode
  heading: Heading
}

export interface GenerationOptions {
  complexity: Complexity
  difficulty: RouteDifficulty
  goalCount: number
}
