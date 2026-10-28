import cropData from './eyewords-crops.json'

export type ArtworkRect = { x: number; y: number; width: number; height: number }
export type ArtworkCrop = ArtworkRect & {
  sourceWidth: number
  sourceHeight: number
  exclusions: ArtworkRect[]
}

const crops: Record<string, ArtworkCrop> = cropData

export function eyeWordsCrop(id: number, side: 'front' | 'back'): ArtworkCrop {
  return crops[`${String(id).padStart(3, '0')}-${side}`]
}
