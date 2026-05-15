import type { Point } from '../types'

export function svgPointerToFieldPoint(event: PointerEvent, svg: SVGSVGElement): Point {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const matrix = svg.getScreenCTM()
  if (!matrix) {
    return { x: 0, y: 0 }
  }

  const transformed = point.matrixTransform(matrix.inverse())

  return {
    x: Math.min(Math.max(transformed.x, 0), 100),
    y: Math.min(Math.max(transformed.y, 0), 100),
  }
}
