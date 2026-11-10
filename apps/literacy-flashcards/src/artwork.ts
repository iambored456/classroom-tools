import cropData from './eyewords-crops.json'

export type ArtworkRect = { x: number; y: number; width: number; height: number }
export type ArtworkCrop = ArtworkRect & {
  sourceWidth: number
  sourceHeight: number
  exclusions: ArtworkRect[]
}

// All 94 Heart Words source images share this layout. Keep the complete word,
// hearts, and sound boxes (y=240..540); leave the footer logo outside the view.
export const heartWordsCrop: ArtworkCrop = {
  x: 0, y: 180, width: 972, height: 420,
  sourceWidth: 972, sourceHeight: 729, exclusions: [],
}

const crops: Record<string, ArtworkCrop> = cropData

export function eyeWordsCrop(id: number, side: 'front' | 'back'): ArtworkCrop {
  return crops[`${String(id).padStart(3, '0')}-${side}`]
}
