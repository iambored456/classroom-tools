import { visibleSurface, type Vec } from './geometry'
import { dieCaption, faceLabel, type PhysicalDie } from './roll'

export const throwDuration = 1480

// A fixed seed gives every resize/redraw of the same throw the same choreography.
function variation(seed: number) {
  const n = Math.sin(seed * 79.31 + 17.83) * 43758.5453
  return n - Math.floor(n)
}

export function arrange(width: number, height: number, count: number) {
  const spaceX = Math.max(1, width - 24), spaceY = Math.max(1, height - 26)
  let columns = 1, radius = 0
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const fit = Math.min(spaceX / cols / 2.55, (spaceY / rows - 20) / 2.55)
    if (fit > radius) { columns = cols; radius = fit }
  }
  return { columns, rows: Math.ceil(count / columns), radius: Math.min(radius, width < 480 ? 66 : 87) }
}

export function drawTray(ctx: CanvasRenderingContext2D, width: number, height: number,
  dice: readonly PhysicalDie[], rollId: number, progress: number) {
  ctx.clearRect(0, 0, width, height)
  const { columns, rows, radius } = arrange(width, height, dice.length)
  const cellW = (width - 24) / columns, cellH = (height - 26) / rows
  for (const [i, die] of dice.entries()) {
    const seed = rollId * 67 + i * 5
    const row = Math.floor(i / columns), inRow = Math.min(columns, dice.length - row * columns)
    const x = width/2 + (i % columns - (inRow - 1)/2) * cellW +
      (variation(seed)-.5) * Math.min(cellW - 2*radius, radius) * .42
    const y = 13 + (row+.5) * cellH - 8 +
      (variation(seed+1)-.5) * Math.min(cellH - 2*radius - 20, radius) * .42
    const t = Math.min(1, Math.max(0, (progress - .07 * variation(seed+2)) / .92))
    const remaining = (1-t) ** 2
    const bounce = Math.abs(Math.sin(t * Math.PI * 3.5)) * remaining
    const groundX = x + (variation(seed+3) > .5 ? 1 : -1) * remaining * (width * .39 + radius)
    const groundY = y + remaining * (height * .28) * (variation(seed+4)-.3)
    const lift = radius * (bounce * 1.55 + remaining * .55)
    const spin: Vec = [remaining * (8 + variation(seed)*7), remaining * (5 + variation(seed+2)*8),
      remaining * (variation(seed+1)-.5) * 10]
    const yaw = (variation(seed+3)-.5) * (die.sides === 4 ? .13 : .33)
    const surface = visibleSurface(die, spin, yaw)
    ctx.fillStyle = 'rgba(0,12,15,' + (.24 / (1 + lift/radius)) + ')'
    ctx.beginPath()
    const base = Math.max(...surface.faces.flatMap(f => f.points.map(p => -p[1])))
    ctx.ellipse(groundX + radius*.09, groundY + radius*(base-.07), radius*.70, radius*.14, 0, 0, Math.PI*2)
    ctx.fill()
    ctx.save()
    ctx.translate(groundX, groundY-lift)
    ctx.scale(radius, -radius)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 1.25/radius
    for (const { points, fill } of surface.faces) {
      ctx.beginPath()
      points.forEach(([px,py], n) => n ? ctx.lineTo(px,py) : ctx.moveTo(px,py))
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = 'rgba(11,30,35,.50)'
      ctx.stroke()
    }
    ctx.fillStyle = '#162528'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const { at, right, up, size, text, primary } of surface.labels) {
      ctx.save()
      ctx.fillStyle = primary ? '#0e2020' : 'rgba(18,39,40,.66)'
      ctx.transform(right[0], right[1], -up[0], -up[1], at[0], at[1])
      ctx.scale(.01,.01)
      ctx.font = 'bold ' + size*100 + 'px "Atkinson Hyperlegible Next", sans-serif'
      ctx.fillText(text, 0, size*4)
      ctx.restore()
    }
    ctx.restore()
    if (progress === 1) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold ' + Math.min(15, Math.max(11, radius*.28)) + 'px "Atkinson Hyperlegible Next", sans-serif'
      ctx.fillStyle = '#e1f4e9'
      ctx.fillText(dieCaption(die) + ' · ' + faceLabel(die), x, y + radius + 8, cellW - 4)
    }
  }
}
