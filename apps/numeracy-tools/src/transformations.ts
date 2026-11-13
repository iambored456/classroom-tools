export function quadraticPath(a: number, h: number, k: number, width: number, height: number) {
  const scale = Math.min(width, height) / 24
  const left = -width / (2 * scale)
  const right = -left
  const bottom = -height / (2 * scale)
  const top = -bottom
  const xPixel = (x: number) => width / 2 + x * scale
  const yPixel = (y: number) => height / 2 - y * scale
  if (a === 0) return `M0 ${yPixel(k)}H${width}`
  // Clip mathematically before sampling so steep curves enter at the correct edges.
  const roots = [bottom, top].flatMap(y => {
    const squared = (y - k) / a
    return squared < 0 ? [] : [h - Math.sqrt(squared), h + Math.sqrt(squared)]
  })
  const cuts = [...new Set([left, right, ...roots.filter(x => x > left && x < right)])].sort((x, y) => x - y)
  const segments: string[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i], end = cuts[i + 1], middle = (start + end) / 2
    const y = a * (middle - h) ** 2 + k
    if (y < bottom || y > top) continue
    const samples = Math.max(16, Math.ceil((end - start) * scale / 3))
    for (let j = 0; j <= samples; j++) {
      const x = start + (end - start) * j / samples
      segments.push(`${j === 0 ? 'M' : 'L'}${xPixel(x).toFixed(2)} ${yPixel(a * (x - h) ** 2 + k).toFixed(2)}`)
    }
  }
  return segments.join(' ')
}
