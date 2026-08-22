import { nodeById } from './domain'
import type { CityMap, Goal, Point, RoadEdge } from './types'

export interface CityBlock {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface RoadGeometry {
  edge: RoadEdge
  from: Point
  to: Point
}

export interface StreetLabel extends Point {
  id: string
  name: string
  vertical: boolean
}

const VIEWBOX_WIDTH = 100
const VIEWBOX_HEIGHT = 64
const BLOCK_MARGIN = 1.35
const STREET_CLEARANCE = 4.25

const uniqueSorted = (values: number[]) =>
  [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b)

export function roadGeometries(map: CityMap): RoadGeometry[] {
  return map.edges.flatMap((edge) => {
    const from = nodeById(map, edge.from)
    const to = nodeById(map, edge.to)
    return from && to ? [{ edge, from, to }] : []
  })
}

function intervals(axes: number[], maximum: number): Array<[number, number]> {
  const stops = uniqueSorted([0, ...axes.filter((axis) => axis > 0 && axis < maximum), maximum])
  const result: Array<[number, number]> = []
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index] + (index === 0 ? BLOCK_MARGIN : STREET_CLEARANCE)
    const end = stops[index + 1] - (index === stops.length - 2 ? BLOCK_MARGIN : STREET_CLEARANCE)
    if (end - start >= 4) result.push([start, end])
  }
  return result
}

/**
 * Streets are the source geometry. Blocks are the rectangular spaces remaining
 * between every horizontal and vertical street axis, with room for curbs and sidewalks.
 */
export function cityBlocks(map: CityMap): CityBlock[] {
  const roads = roadGeometries(map)
  const verticalAxes = uniqueSorted(roads.filter(({ from, to }) => from.x === to.x).map(({ from }) => from.x))
  const horizontalAxes = uniqueSorted(roads.filter(({ from, to }) => from.y === to.y).map(({ from }) => from.y))
  const xIntervals = intervals(verticalAxes, VIEWBOX_WIDTH)
  const yIntervals = intervals(horizontalAxes, VIEWBOX_HEIGHT)
  return xIntervals.flatMap(([left, right], column) =>
    yIntervals.map(([top, bottom], row) => ({
      id: `block-${column}-${row}`,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    })),
  )
}

export function shortenedCenterLine(from: Point, to: Point, inset = 3.15): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const amount = Math.min(inset, length / 3)
  const ux = dx / length
  const uy = dy / length
  return {
    x1: from.x + ux * amount,
    y1: from.y + uy * amount,
    x2: to.x - ux * amount,
    y2: to.y - uy * amount,
  }
}

export function streetLabels(map: CityMap): StreetLabel[] {
  const groups = new Map<string, { name: string; vertical: boolean; constant: number; minimum: number; maximum: number }>()
  for (const { edge, from, to } of roadGeometries(map)) {
    if (!edge.streetName) continue
    const vertical = from.x === to.x
    const constant = vertical ? from.x : from.y
    const minimum = vertical ? Math.min(from.y, to.y) : Math.min(from.x, to.x)
    const maximum = vertical ? Math.max(from.y, to.y) : Math.max(from.x, to.x)
    const key = `${edge.streetName}|${vertical ? 'v' : 'h'}|${constant.toFixed(3)}`
    if (!groups.has(key)) {
      groups.set(key, { name: edge.streetName, vertical, constant, minimum, maximum })
    }
  }
  return [...groups.entries()].map(([id, group]) => ({
    id,
    name: group.name,
    vertical: group.vertical,
    x: group.vertical ? group.constant : (group.minimum + group.maximum) / 2,
    y: group.vertical ? (group.minimum + group.maximum) / 2 : group.constant,
  }))
}

export function goalVisualOffset(goal: Goal): Point {
  return goal.type === 'star' ? { x: 0, y: 0 } : goal.offset ?? { x: 4, y: -4 }
}
