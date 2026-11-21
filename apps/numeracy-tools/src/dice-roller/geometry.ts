import type { PhysicalDie } from './roll'
import { faceLabel } from './roll'

export type Vec = [number, number, number]
const add = (a: Vec, b: Vec): Vec => [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
const scale = (a: Vec, s: number): Vec => [a[0]*s, a[1]*s, a[2]*s]
const sub = (a: Vec, b: Vec) => add(a, scale(b, -1))
const dot = (a: Vec, b: Vec) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
const length = (a: Vec) => Math.hypot(...a)
const unit = (a: Vec) => scale(a, 1 / length(a))
const mean = (points: Vec[]) => scale(points.reduce(add), 1 / points.length)
interface Face { indices: number[]; normal: Vec; center: Vec; up: Vec; right: Vec; textSize: number }
interface Solid { vertices: Vec[]; faces: Face[] }

// Deduplicate supporting planes and order their vertices around the face centre.
// Constructing these small convex meshes once also gives us their exact face frames.
function solid(points: Vec[]): Solid {
  const radius = Math.max(...points.map(length))
  const vertices = points.map(p => scale(p, 1 / radius))
  const faces: Face[] = []
  const seen = new Set<string>()
  const eps = 1e-7
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i+1; j < vertices.length; j++) {
      for (let k = j+1; k < vertices.length; k++) {
        const a = vertices[i]
        let normal = cross(sub(vertices[j], a), sub(vertices[k], a))
        if (length(normal) < eps) continue
        normal = unit(normal)
        if (dot(normal, a) < 0) normal = scale(normal, -1)
        const offsets = vertices.map(v => dot(normal, sub(v, a)))
        if (offsets.some(d => d > eps)) continue
        const indices = vertices.map((_, idx) => idx).filter(idx => Math.abs(offsets[idx]) < eps)
        const key = indices.join(',')
        if (seen.has(key)) continue
        seen.add(key)
        const center = mean(indices.map(idx => vertices[idx]))
        let up = unit(sub(vertices[indices[0]], center))
        const tangent = cross(up, normal)
        const angle = (idx: number) => Math.atan2(dot(sub(vertices[idx], center), up), dot(sub(vertices[idx], center), tangent))
        indices.sort((p, q) => angle(p) - angle(q))
        if (indices.length === 4 && points.length === 8) {
          up = unit(sub(mean([vertices[indices[0]], vertices[indices[1]]]), center))
        } else if (indices.length === 4) {
          // The long diagonal of a trapezohedron's kite is its vertical axis.
          const tip = indices.reduce((p, q) => length(sub(vertices[p], center)) > length(sub(vertices[q], center)) ? p : q)
          up = unit(sub(vertices[tip], center))
        }
        const right = unit(cross(up, normal))
        const clearance = Math.min(...indices.map((idx, n) => {
          const edge = unit(sub(vertices[indices[(n+1) % indices.length]], vertices[idx]))
          return length(cross(edge, sub(center, vertices[idx])))
        }))
        faces.push({ indices, center, normal, up, right, textSize: 1.67 * clearance })
      }
    }
  }
  return { vertices, faces }
}

function dual(primal: Solid) {
  return solid(primal.faces.map(face => scale(face.normal, 1 / dot(face.normal, face.center))))
}

function makeShapes() {
  const phi = (1 + Math.sqrt(5)) / 2
  const cube: Vec[] = [], ico: Vec[] = [], antiprism: Vec[] = []
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    for (const c of [-1, 1]) cube.push([a, b, c])
    ico.push([0, a, b*phi], [a, b*phi, 0], [b*phi, 0, a])
  }
  const icosahedron = solid(ico)
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI * i / 5
    antiprism.push([Math.cos(angle), Math.sin(angle), i % 2 ? .73 : -.73])
  }
  return {
    4: solid(cube.filter(([x,y,z]) => x*y*z === 1)), 6: solid(cube),
    8: solid([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]),
    10: dual(solid(antiprism)), 12: dual(icosahedron), 20: icosahedron,
  }
}

export const meshes = makeShapes()
const palettes: Record<PhysicalDie['sides'] | 'tens' | 'units', Vec> = {
  4: [125,221,179], 6: [255,205,107], 8: [129,199,247], 10: [194,169,254],
  12: [255,165,139], 20: [249,161,200], tens: [159,228,227], units: [227,243,192],
}

export function poseFor(die: PhysicalDie, spin: Vec = [0,0,0], yaw = 0) {
  const mesh = meshes[die.sides]
  const chosen = mesh.faces[die.face-1]
  const front = die.sides === 4 ? mesh.vertices[die.face-1] : chosen.normal
  // Aim one base corner away from the viewer to show a triangular silhouette.
  const baseCorner = mesh.vertices[die.face % mesh.vertices.length]
  const right = die.sides === 4 ? unit(cross(baseCorner, front)) : chosen.right
  const up = cross(front, right)
  const pitch = (die.sides === 4 ? -.96 : die.sides === 20 ? -.18 : -.32) + spin[0]
  const turn = (die.sides === 4 ? 0 : die.sides === 20 ? .16 : .27) + spin[1]
  const twist = yaw + spin[2]
  const cx = Math.cos(pitch), sx = Math.sin(pitch), cy = Math.cos(turn), sy = Math.sin(turn)
  const cz = Math.cos(twist), sz = Math.sin(twist)
  const cornerAngle = die.sides === 4 ? .41 : 0
  const ca = Math.cos(cornerAngle), sa = Math.sin(cornerAngle)
  return (v: Vec): Vec => {
    const vx = dot(v, right), vy = dot(v, up), z = dot(v, front)
    const x = vx*ca - vy*sa, y = vx*sa + vy*ca
    const py = y*cx-z*sx, pz = y*sx+z*cx
    const px = x*cy+pz*sy
    return [px*cz-py*sz, px*sz+py*cz, -x*sy+pz*cy]
  }
}

export function visibleSurface(die: PhysicalDie, spin?: Vec, yaw = 0) {
  const mesh = meshes[die.sides]
  const pose = poseFor(die, spin, yaw)
  const vertices = mesh.vertices.map(pose)
  const rgb = palettes[die.role === 'ordinary' ? die.sides : die.role]
  const faces = mesh.faces.map((face, index) => {
    const normal = pose(face.normal)
    const light = Math.min(1.04, .53 + .48 * Math.max(0, dot(normal, [-.32,.42,.85])))
    return { face, normal, points: face.indices.map(i => vertices[i]), index,
      fill: 'rgb(' + rgb.map(v => Math.round(v * light)).join(',') + ')' }
  }).filter(f => f.normal[2] > .001).sort((a,b) => a.normal[2] - b.normal[2])
  const labels: { at: Vec; right: Vec; up: Vec; size: number; text: string; primary: boolean }[] = []
  if (die.sides === 4) {
    // Each printed value belongs to a vertex. Put it just inside the most
    // visible adjacent face, so the upright tip always reads its own value.
    for (const [i, vertex] of vertices.entries()) {
      const side = faces.filter(f => f.face.indices.includes(i)).at(-1)
      const primary = vertices.every(v => vertex[1] >= v[1])
      if (side) labels.push({ at: add(scale(vertex, .57), scale(pose(side.face.center), .43)),
        right: [1,0,0], up: [0,1,0], size: primary ? .37 : .22, text: String(i+1), primary })
    }
  } else {
    for (const { face, normal, index } of faces) {
      if (normal[2] < .14) continue
      const primary = index === faces.at(-1)?.index
      labels.push({ at: pose(face.center), right: pose(face.right), up: pose(face.up),
        size: face.textSize * (primary ? 1 : .64), text: faceLabel(die, index+1), primary })
    }
  }
  return { faces, labels }
}
