import { CanvasTexture, SRGBColorSpace } from 'three'
import { HEIGHT, HALF, NARROW_Y, WING_X } from './model.js'

// The supplied Letter patterns are measured in 72-point inches. These recreate
// folding marks only, without the source document's logos or other artwork.
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const BLUE = '#2c52a5'
const RED = '#da2524'
const SCALE = 3

function paperTexture(side, anisotropy, designId) {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH * SCALE
  canvas.height = PAGE_HEIGHT * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'

  function line(start, end, color, dash) {
    ctx.strokeStyle = color
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(...start)
    ctx.lineTo(...end)
    ctx.stroke()
  }
  const crease = (end, color, dash) => line([PAGE_WIDTH / 2, 0], end, color, dash)

  function label(text, x, y, color, rotation = 0) {
    // The white halo interrupts the dash exactly as on the printed guide.
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.setLineDash([])
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, 14.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, 11.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0.7)
    ctx.restore()
  }

  if (designId === 'raven') {
    const valley = [14.14, 8.48]
    const mountain = [14.57, 8.74, 2.91, 8.74, 2.91, 8.74]
    // Start with the blue side (PDF page 6) facing the viewer. The reverse
    // mirrors page 5 into the same sheet coordinates, as for the other designs.
    if (side === 'front') {
      crease([306, 792], BLUE, valley)
      crease([0, 306], BLUE, valley)
      crease([612, 306], BLUE, valley)
      label('1V', 306, 340.6, BLUE)
      label('2V', 177.2, 129.9, BLUE)
      label('3V', 435.1, 130.2, BLUE)
      ctx.fillStyle = BLUE
      ctx.font = 'bold 7px Arial, sans-serif'
      ctx.fillText('UNFOLD', 320, 343)
    } else {
      crease([0, 731], RED, mountain)
      crease([612, 730.773], RED, mountain)
      line([140.2325, 396], [474.3219, 396], RED, mountain)
      line([225.2454, 192.9138], [386.7801, 192.9138], BLUE, valley)
      line([306, 396], [26.4683, 667.7703], RED, mountain)
      line([306, 396], [585.6189, 667.7701], RED, mountain)
      line([306, 396], [306, 792], BLUE, valley)
      line([306, 396], [140.7295, 792], RED, mountain)
      line([306, 396], [471.2704, 792], RED, mountain)
      label('4M', 197.8, 258.6, RED)
      label('5M', 414.1, 258.8, RED)
      label('6M', 235.8, 396, RED, Math.PI)
      label('7M', 211.3, 487.7, RED, Math.PI / 2)
      label('8M', 400.8, 487.2, RED, -Math.PI / 2)
      label('9V', 317.2, 192.9138, BLUE, Math.PI)
      label('10V', 306, 583.6, BLUE)
      label('11M', 214.4, 616.6, RED)
      label('12M', 397.9, 618.3, RED)
    }
  } else if (designId === 'arrowhead') {
    const valley = [14.1, 8.45]
    const mountain = [14.1, 8.45, 2.82, 8.45, 2.82, 8.45]
    if (side === 'front') {
      line([306, 72], [306, 792], BLUE, valley)
      line([306, 72], [0, 378], BLUE, valley)
      line([306, 72], [612, 378], BLUE, valley)
      line([0, 72], [612, 72], RED, mountain)
      line([134.5, 0], [306, 72], RED, mountain)
      line([477.5, 0], [306, 72], RED, mountain)
      line([0, 684], [89, 467.5], RED, mountain)
      line([612, 684], [523, 467.5], RED, mountain)
      line([0, 684], [191.5, 492.5], RED, mountain)
      line([612, 684], [420.5, 492.5], RED, mountain)
      line([134.5, 792], [252.5, 506.5], RED, mountain)
      line([477.5, 792], [359.5, 506.5], RED, mountain)
      label('1V', 306, 432, BLUE)
      label('2M', 393, 72, RED)
      label('3V', 403, 168, BLUE)
      label('4V', 209, 168, BLUE)
      label('7M', 72, 510, RED, Math.PI / 8)
      label('8M', 540, 510, RED, -Math.PI / 8)
      label('9M', 128, 556, RED, Math.PI / 2)
      label('10M', 484, 556, RED, Math.PI / 2)
      label('11V', 306, 634, BLUE)
      label('12M', 219, 588, RED, Math.PI / 2)
      label('13M', 393, 588, RED, Math.PI / 2)
      ctx.fillStyle = BLUE
      ctx.font = 'bold 7px Arial, sans-serif'
      ctx.fillText('UNFOLD', 320, 435)
    } else {
      line([0, 378], [612, 378], RED, mountain)
      line([153, 225], [459, 225], BLUE, valley)
      label('5M', 219, 378, RED, Math.PI)
      label('6V', 270, 225, BLUE, Math.PI)
    }
  } else if (side === 'front') {
    crease([306, PAGE_HEIGHT], BLUE, [14.142, 8.485])
    crease([0, HALF * 72], BLUE, [14.237, 8.542])
    crease([PAGE_WIDTH, HALF * 72], BLUE, [14.237, 8.542])
    label('1V', 306, 136.5, BLUE)
    label('2V', 209, 96.5, BLUE)
    label('3V', 403, 96.5, BLUE)
    label('6V', 306, 634, BLUE)
    ctx.fillStyle = BLUE
    ctx.font = 'bold 7px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('UNFOLD', 314, 151)
  } else {
    // Viewed from the reverse, the PDF has 4M/8V on the left and 5M/7V
    // on the right. Back-face UVs mirror this page into the sheet coordinates.
    const mountainDash = [13.96, 8.376, 2.792, 8.376, 2.792, 8.376]
    crease([0, -NARROW_Y * 72], RED, mountainDash)
    crease([PAGE_WIDTH, -NARROW_Y * 72], RED, mountainDash)
    crease([306 - WING_X * 72, HEIGHT * 72], BLUE, [14.011, 8.406])
    crease([306 + WING_X * 72, HEIGHT * 72], BLUE, [14.011, 8.406])
    label('4M', 221, 207, RED)
    label('5M', 391, 207, RED)
    label('8V', 215, 462, BLUE)
    label('7V', 397, 462, BLUE)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

export function createPrintedGuides(renderer, designId = 'basic-dart') {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return { front: paperTexture('front', anisotropy, designId), back: paperTexture('back', anisotropy, designId) }
}
